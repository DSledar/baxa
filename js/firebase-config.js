// Firebase Cloud Saves, Google Auth & Global Honor Leaderboard
// Replace firebaseConfig with your own Firebase project credentials for GitHub Pages deployment.
const FIREBASE_CONFIG = {
    apiKey: "YOUR_FIREBASE_API_KEY",
    authDomain: "your-project.firebaseapp.com",
    databaseURL: "https://your-project-default-rtdb.firebaseio.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "000000000000",
    appId: "1:000000000000:web:000000000000"
};

class BakhaCloudManager {
    constructor() {
        this.isConfigured = false;
        this.user = null;
        this.db = null;
        this.auth = null;
        this.init();
    }

    init() {
        try {
            if (typeof firebase !== 'undefined' && FIREBASE_CONFIG.apiKey !== "YOUR_FIREBASE_API_KEY") {
                if (!firebase.apps.length) {
                    firebase.initializeApp(FIREBASE_CONFIG);
                }
                this.auth = firebase.auth();
                this.db = firebase.database();
                this.isConfigured = true;

                this.auth.onAuthStateChanged((user) => {
                    this.user = user;
                    this.updateAuthUI();
                    if (user) this.loadCloudSave();
                });
            } else {
                this.updateAuthUI();
            }
        } catch (e) {
            this.isConfigured = false;
            this.updateAuthUI();
        }
    }

    updateAuthUI() {
        const badge = document.getElementById('firebaseStatusBadge');
        const loginBtn = document.getElementById('googleLoginBtn');
        if (!badge || !loginBtn) return;

        if (this.user) {
            badge.innerHTML = `<i class="bi bi-cloud-check-fill text-success"></i> ${this.user.displayName || 'یاریزان'}`;
            loginBtn.innerHTML = `<i class="bi bi-box-arrow-right"></i> دەرچوون`;
        } else if (this.isConfigured) {
            badge.innerHTML = `<i class="bi bi-cloud text-warning"></i> ئامادەی Firebase`;
            loginBtn.innerHTML = `<i class="bi bi-google"></i> چوونەژوورەوە`;
        } else {
            badge.innerHTML = `<i class="bi bi-hdd-fill text-info"></i> پاشەکەوتی ناوخۆیی`;
            loginBtn.innerHTML = `<i class="bi bi-google"></i> چوونەژوورەوە (Demo)`;
        }
    }

    async toggleLogin() {
        if (!this.isConfigured) {
            // Demo mode local profile toggle
            if (!this.user) {
                this.user = { uid: 'local_bakha_hero', displayName: 'پاڵەوانی بەرزان' };
                window.showToast('چوونەژوورەوەی خۆماڵی چالاک کرا! بۆ Firebase ڕاستەقینە کۆدی firebase-config.js پڕبکەرەوە.', 'info');
            } else {
                this.user = null;
                window.showToast('دەرچوویت لە هەژمار.', 'warning');
            }
            this.updateAuthUI();
            return;
        }

        try {
            if (this.user) {
                await this.auth.signOut();
            } else {
                const provider = new firebase.auth.GoogleAuthProvider();
                await this.auth.signInWithPopup(provider);
            }
        } catch (e) {
            window.showToast('هەڵە لە چوونەژوورەوە: ' + e.message, 'danger');
        }
    }

    async saveGame(gameState) {
        const payload = {
            player: gameState.player,
            chapter: gameState.chapter,
            currentNodeId: gameState.currentNodeId,
            inventory: gameState.inventory,
            kills: gameState.kills,
            updatedAt: Date.now()
        };

        try {
            localStorage.setItem('bakha_action_rpg_save', JSON.stringify(payload));
        } catch (e) {}

        if (this.isConfigured && this.user && this.db) {
            try {
                await this.db.ref(`saves/${this.user.uid}`).set(payload);
                await this.db.ref(`leaderboard/${this.user.uid}`).set({
                    name: this.user.displayName || 'بەخەی قەساب',
                    honor: gameState.player.honor,
                    kills: gameState.kills,
                    chapter: gameState.chapter,
                    updatedAt: Date.now()
                });
                window.showToast('لە هەوری Firebase پاشەکەوت کرا!', 'success');
            } catch (e) {
                window.showToast('پاشەکەوتی ناوخۆیی کرا (Firebase کێشەی هەیە).', 'warning');
            }
        } else {
            window.showToast('یاری لە پاشەکەوتی ناوخۆیی پارێزرا!', 'success');
        }
    }

    async loadCloudSave() {
        if (this.isConfigured && this.user && this.db) {
            try {
                const snap = await this.db.ref(`saves/${this.user.uid}`).once('value');
                if (snap.exists()) return snap.val();
            } catch (e) {}
        }
        try {
            const raw = localStorage.getItem('bakha_action_rpg_save');
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    }

    async fetchLeaderboard() {
        const fallback = [
            { name: 'بەخەی بەرزان', honor: 240, kills: 18, chapter: 8 },
            { name: 'شێری هەڵگورد', honor: 185, kills: 12, chapter: 6 },
            { name: 'ئاسنگەر کاوە', honor: 130, kills: 7, chapter: 4 }
        ];

        if (this.isConfigured && this.db) {
            try {
                const snap = await this.db.ref('leaderboard').orderByChild('honor').limitToLast(10).once('value');
                if (snap.exists()) {
                    const list = [];
                    snap.forEach((child) => { list.push(child.val()); });
                    return list.sort((a, b) => b.honor - a.honor);
                }
            } catch (e) {}
        }
        return fallback;
    }
}

window.bakhaCloud = new BakhaCloudManager();
