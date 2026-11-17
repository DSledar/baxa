// Procedural Web Audio API Sound Engine for Bakha the Butcher 3D
class BakhaAudioEngine {
    constructor() {
        this.ctx = null;
        this.enabled = false;
        this.musicVol = 0.6;
        this.sfxVol = 0.85;
        this.droneOsc = null;
        this.windGain = null;
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
            this.playSfx('click');
        } else {
            this.stopAmbience();
        }
        return this.enabled;
    }

    startAmbience() {
        if (!this.enabled || !this.ctx || this.droneOsc) return;
        try {
            const now = this.ctx.currentTime;
            // Deep mountain drone
            this.droneOsc = this.ctx.createOscillator();
            const droneGain = this.ctx.createGain();
            this.droneOsc.type = 'sawtooth';
            this.droneOsc.frequency.setValueAtTime(65.41, now); // C2

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(180, now);

            droneGain.gain.setValueAtTime(0.035 * this.musicVol, now);
            this.droneOsc.connect(filter);
            filter.connect(droneGain);
            droneGain.connect(this.ctx.destination);
            this.droneOsc.start();

            // Filtered wind noise
            const bufferSize = this.ctx.sampleRate * 2;
            const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const output = noiseBuffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                output[i] = Math.random() * 2 - 1;
            }
            this.windNode = this.ctx.createBufferSource();
            this.windNode.buffer = noiseBuffer;
            this.windNode.loop = true;

            const windFilter = this.ctx.createBiquadFilter();
            windFilter.type = 'bandpass';
            windFilter.frequency.setValueAtTime(340, now);
            windFilter.Q.setValueAtTime(1.5, now);

            this.windGain = this.ctx.createGain();
            this.windGain.gain.setValueAtTime(0.025 * this.musicVol, now);

            this.windNode.connect(windFilter);
            windFilter.connect(this.windGain);
            this.windGain.connect(this.ctx.destination);
            this.windNode.start();
        } catch (e) {}
    }

    stopAmbience() {
        try {
            if (this.droneOsc) { this.droneOsc.stop(); this.droneOsc = null; }
            if (this.windNode) { this.windNode.stop(); this.windNode = null; }
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
                osc.frequency.setValueAtTime(720, now);
                osc.frequency.exponentialRampToValueAtTime(75, now + 0.22);
                g.gain.setValueAtTime(0.32 * this.sfxVol, now);
                g.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
                osc.connect(g); g.connect(this.ctx.destination);
                osc.start(now); osc.stop(now + 0.23);
            } else if (type === 'hit') {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(190, now);
                osc.frequency.exponentialRampToValueAtTime(38, now + 0.18);
                g.gain.setValueAtTime(0.42 * this.sfxVol, now);
                g.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
                osc.connect(g); g.connect(this.ctx.destination);
                osc.start(now); osc.stop(now + 0.19);
            } else if (type === 'sharpen') {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(1350, now);
                osc.frequency.linearRampToValueAtTime(3100, now + 0.24);
                g.gain.setValueAtTime(0.14 * this.sfxVol, now);
                g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
                osc.connect(g); g.connect(this.ctx.destination);
                osc.start(now); osc.stop(now + 0.26);
            } else if (type === 'howl') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(175, now);
                osc.frequency.linearRampToValueAtTime(360, now + 0.38);
                osc.frequency.exponentialRampToValueAtTime(105, now + 0.95);
                g.gain.setValueAtTime(0.01, now);
                g.gain.linearRampToValueAtTime(0.35 * this.sfxVol, now + 0.22);
                g.gain.exponentialRampToValueAtTime(0.001, now + 0.95);
                osc.connect(g); g.connect(this.ctx.destination);
                osc.start(now); osc.stop(now + 0.96);
            } else if (type === 'boss_roar') {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(110, now);
                osc.frequency.linearRampToValueAtTime(52, now + 0.85);
                g.gain.setValueAtTime(0.38 * this.sfxVol, now);
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
