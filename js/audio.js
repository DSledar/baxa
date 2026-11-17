// Upgraded Web Audio API Sound Engine for Bakha the Butcher 3D (Kurdish Daf, Oud Maqam & Wolf Combat SFX)
class BakhaAudioEngine {
    constructor() {
        this.ctx = null;
        this.enabled = false;
        this.musicVol = 0.65;
        this.sfxVol = 0.9;
        this.droneOsc = null;
        this.windNode = null;
        this.musicInterval = null;
        this.stepIdx = 0;
    }

    init() {
        if (!this.ctx) {
            const AudioClass = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioClass();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggle() {
        this.enabled = !this.enabled;
        if (this.enabled) {
            this.init();
            this.startAmbience();
            this.playSfx('howl');
        } else {
            this.stopAmbience();
        }
        return this.enabled;
    }

    startAmbience() {
        if (!this.enabled || !this.ctx || this.droneOsc) return;
        try {
            const now = this.ctx.currentTime;
            // Deep mountain drone (D2)
            this.droneOsc = this.ctx.createOscillator();
            const droneGain = this.ctx.createGain();
            this.droneOsc.type = 'sawtooth';
            this.droneOsc.frequency.setValueAtTime(73.42, now);

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(190, now);

            droneGain.gain.setValueAtTime(0.03 * this.musicVol, now);
            this.droneOsc.connect(filter);
            filter.connect(droneGain);
            droneGain.connect(this.ctx.destination);
            this.droneOsc.start();

            // Mountain wind noise
            const bufferSize = this.ctx.sampleRate * 2;
            const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const output = noiseBuffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;

            this.windNode = this.ctx.createBufferSource();
            this.windNode.buffer = noiseBuffer;
            this.windNode.loop = true;

            const windFilter = this.ctx.createBiquadFilter();
            windFilter.type = 'bandpass';
            windFilter.frequency.setValueAtTime(320, now);
            windFilter.Q.setValueAtTime(1.6, now);

            const windGain = this.ctx.createGain();
            windGain.gain.setValueAtTime(0.022 * this.musicVol, now);

            this.windNode.connect(windFilter);
            windFilter.connect(windGain);
            windGain.connect(this.ctx.destination);
            this.windNode.start();

            // Kurdish Maqam Hijaz Oud + Daf Frame Drum Loop
            const maqamNotes = [146.83, 155.56, 185.00, 196.00, 220.00, 233.08, 293.66, 220.00];
            this.musicInterval = setInterval(() => {
                if (!this.enabled || !this.ctx) return;
                const t = this.ctx.currentTime;

                // Daf frame drum pulse on beats 0, 2, 3, 5
                if ([0, 2, 3, 5, 6].includes(this.stepIdx % 8)) {
                    const dafOsc = this.ctx.createOscillator();
                    const dafGain = this.ctx.createGain();
                    dafOsc.type = 'sine';
                    const isBass = (this.stepIdx % 4 === 0);
                    dafOsc.frequency.setValueAtTime(isBass ? 115 : 210, t);
                    dafOsc.frequency.exponentialRampToValueAtTime(isBass ? 42 : 95, t + 0.16);
                    dafGain.gain.setValueAtTime((isBass ? 0.14 : 0.07) * this.musicVol, t);
                    dafGain.gain.exponentialRampToValueAtTime(0.001, t + 0.17);
                    dafOsc.connect(dafGain);
                    dafGain.connect(this.ctx.destination);
                    dafOsc.start(t);
                    dafOsc.stop(t + 0.18);
                }

                // Plucked Oud melody note
                if (this.stepIdx % 2 === 0) {
                    const freq = maqamNotes[Math.floor(Math.random() * maqamNotes.length)];
                    const oudOsc = this.ctx.createOscillator();
                    const oudFilter = this.ctx.createBiquadFilter();
                    const oudGain = this.ctx.createGain();

                    oudOsc.type = 'triangle';
                    oudOsc.frequency.setValueAtTime(freq, t);
                    oudFilter.type = 'lowpass';
                    oudFilter.frequency.setValueAtTime(950, t);
                    oudFilter.frequency.exponentialRampToValueAtTime(240, t + 0.55);

                    oudGain.gain.setValueAtTime(0.065 * this.musicVol, t);
                    oudGain.gain.exponentialRampToValueAtTime(0.001, t + 0.58);

                    oudOsc.connect(oudFilter);
                    oudFilter.connect(oudGain);
                    oudGain.connect(this.ctx.destination);
                    oudOsc.start(t);
                    oudOsc.stop(t + 0.6);
                }

                this.stepIdx++;
            }, 340);
        } catch (e) {}
    }

    stopAmbience() {
        try {
            if (this.droneOsc) { this.droneOsc.stop(); this.droneOsc = null; }
            if (this.windNode) { this.windNode.stop(); this.windNode = null; }
            if (this.musicInterval) { clearInterval(this.musicInterval); this.musicInterval = null; }
        } catch (e) {}
    }

    playSfx(type) {
        if (!this.enabled) return;
        try {
            this.init();
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();

            if (type === 'click') {
                osc.frequency.setValueAtTime(520, now);
                osc.frequency.exponentialRampToValueAtTime(180, now + 0.05);
                g.gain.setValueAtTime(0.15 * this.sfxVol, now);
                g.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
                osc.connect(g); g.connect(this.ctx.destination);
                osc.start(now); osc.stop(now + 0.06);
            } else if (type === 'slash') {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(840, now);
                osc.frequency.exponentialRampToValueAtTime(75, now + 0.22);
                g.gain.setValueAtTime(0.32 * this.sfxVol, now);
                g.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
                osc.connect(g); g.connect(this.ctx.destination);
                osc.start(now); osc.stop(now + 0.23);
            } else if (type === 'hit') {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(195, now);
                osc.frequency.exponentialRampToValueAtTime(36, now + 0.2);
                g.gain.setValueAtTime(0.45 * this.sfxVol, now);
                g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
                osc.connect(g); g.connect(this.ctx.destination);
                osc.start(now); osc.stop(now + 0.21);
            } else if (type === 'sharpen') {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(1450, now);
                osc.frequency.linearRampToValueAtTime(3250, now + 0.24);
                g.gain.setValueAtTime(0.16 * this.sfxVol, now);
                g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
                osc.connect(g); g.connect(this.ctx.destination);
                osc.start(now); osc.stop(now + 0.26);
            } else if (type === 'howl') {
                osc.type = 'sawtooth';
                const f = this.ctx.createBiquadFilter();
                f.type = 'lowpass';
                f.frequency.setValueAtTime(620, now);
                osc.frequency.setValueAtTime(155, now);
                osc.frequency.linearRampToValueAtTime(340, now + 0.38);
                osc.frequency.exponentialRampToValueAtTime(98, now + 1.05);
                g.gain.setValueAtTime(0.01, now);
                g.gain.linearRampToValueAtTime(0.34 * this.sfxVol, now + 0.24);
                g.gain.exponentialRampToValueAtTime(0.001, now + 1.05);
                osc.connect(f); f.connect(g); g.connect(this.ctx.destination);
                osc.start(now); osc.stop(now + 1.06);
            } else if (type === 'boss_roar') {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(110, now);
                osc.frequency.linearRampToValueAtTime(48, now + 0.85);
                g.gain.setValueAtTime(0.4 * this.sfxVol, now);
                g.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
                osc.connect(g); g.connect(this.ctx.destination);
                osc.start(now); osc.stop(now + 0.86);
            } else if (type === 'coin') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(980, now);
                osc.frequency.setValueAtTime(1320, now + 0.08);
                g.gain.setValueAtTime(0.2 * this.sfxVol, now);
                g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
                osc.connect(g); g.connect(this.ctx.destination);
                osc.start(now); osc.stop(now + 0.26);
            }
        } catch (e) {}
    }
}

window.bakhaAudio = new BakhaAudioEngine();
