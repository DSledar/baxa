// Main 60 FPS WebGL Action RPG Engine with UnrealBloomPostProcessing, Free-Roam Combat & Story Sync
const gameState = {
    player: {
        hp: 100, maxHp: 100,
        rage: 35,
        stamina: 100,
        attack: 28,
        defense: 12,
        sharpenBonus: 0,
        gold: 50,
        meat: 3,
        honor: 50
    },
    inventory: [
        { id: 'cleaver', name: 'ساتووری بەخەی قەساب', bonus: '+١٥ هێرش', desc: 'پۆڵای دەبانی ئاگرین' },
        { id: 'apron', name: 'پێشخانی چەرمی مانگا', bonus: '+١٠ بەرگری', desc: 'چەرمی ئەستووری پارێزەر' },
        { id: 'jamadani', name: 'جامانەی بەرزان', bonus: '+١٠ شەرەف', desc: 'نیشانەی نەوەی گورگەکان' }
    ],
    chapter: 1,
    currentNodeId: 'ch1_node1',
    kills: 0,
    pendingCombatNext: null,
    bloodRageActive: false,
    bloodRageTimer: 0
};

// WebGL Renderer + Post-Processing Bloom
const canvas = document.getElementById('webglCanvas');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x090504, 0.022);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 140);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;

// Lighting
scene.add(new THREE.AmbientLight(0x3a241b, 0.75));
const moonLight = new THREE.DirectionalLight(0xdbeafe, 1.35);
moonLight.position.set(18, 28, -22);
moonLight.castShadow = true;
moonLight.shadow.mapSize.width = 1024;
moonLight.shadow.mapSize.height = 1024;
scene.add(moonLight);

// Bloom Composer
let composer = null;
let bloomPass = null;
if (typeof THREE.EffectComposer !== 'undefined' && typeof THREE.UnrealBloomPass !== 'undefined') {
    composer = new THREE.EffectComposer(renderer);
    composer.addPass(new THREE.RenderPass(scene, camera));
    bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.72, 0.45, 0.82);
    composer.addPass(bloomPass);
}

// World, Character & Enemies
const world = new window.BarzanWorld(scene);
const bakha = new window.BakhaController(scene, camera, canvas);
const enemyMgr = new window.EnemyManager(scene);

// 3D Spark Particle Pool
const sparkCount = 60;
const sparkGeo = new THREE.BufferGeometry();
const sparkPos = new Float32Array(sparkCount * 3);
const sparkVel = [];
for (let i = 0; i < sparkCount; i++) {
    sparkPos[i * 3 + 1] = -20;
    sparkVel.push(new THREE.Vector3());
}
sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
const sparkPoints = new THREE.Points(sparkGeo, new THREE.PointsMaterial({
    color: 0xf59e0b, size: 0.14, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending
}));
scene.add(sparkPoints);

function emitSparks(origin, count = 25, colorHex = 0xf59e0b) {
    sparkPoints.material.color.setHex(colorHex);
    const arr = sparkGeo.attributes.position.array;
    for (let i = 0; i < count; i++) {
        arr[i * 3 + 0] = origin.x;
        arr[i * 3 + 1] = origin.y + 0.9;
        arr[i * 3 + 2] = origin.z;
        sparkVel[i].set((Math.random() - 0.5) * 5, Math.random() * 4 + 1.5, (Math.random() - 0.5) * 5);
    }
    sparkGeo.attributes.position.needsUpdate = true;
}

// Toast & Floating Text Helpers
window.showToast = function (msg, type = 'warning') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const el = document.createElement('div');
    el.className = `alert alert-${type} py-2 px-3 mb-2 shadow-lg border-0`;
    el.style.fontSize = '0.85rem';
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => el.remove(), 3500);
};

function spawnFloatingText(text, color = '#fbbf24') {
    const div = document.createElement('div');
    div.className = 'floating-combat-text';
    div.style.left = '50%';
    div.style.top = '44%';
    div.style.color = color;
    div.textContent = text;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 1050);
}

// Combat Actions
function performAttack() {
    if (!bakha.startSwing()) return;
    window.bakhaAudio.playSfx('slash');

    const pPos = bakha.group.position;
    const forward = new THREE.Vector3(Math.sin(bakha.yaw), 0, Math.cos(bakha.yaw));
    let hitAny = false;

    enemyMgr.enemies.forEach(e => {
        if (e.hp <= 0) return;
        const toEnemy = new THREE.Vector3().subVectors(e.mesh.position, pPos);
        const dist = toEnemy.length();
        if (dist <= 3.6) {
            toEnemy.normalize();
            const dot = forward.dot(toEnemy);
            if (dot > 0.15 || dist < 1.8) {
                hitAny = true;
                let dmg = gameState.player.attack + gameState.player.sharpenBonus + Math.floor(Math.random() * 8);
                if (gameState.bloodRageActive) dmg = Math.floor(dmg * 1.85);

                e.hp -= dmg;
                window.bakhaAudio.playSfx('hit');
                emitSparks(e.mesh.position, 28, 0xef4444);
                spawnFloatingText(`-${dmg}`, gameState.bloodRageActive ? '#ef4444' : '#fbbf24');

                const ch = document.getElementById('crosshair');
                if (ch) { ch.classList.add('hit'); setTimeout(() => ch.classList.remove('hit'), 150); }

                gameState.player.rage = Math.min(100, gameState.player.rage + 10);

                if (e.hp <= 0) {
                    scene.remove(e.mesh);
                    gameState.kills++;
                    gameState.player.gold += e.isBoss ? 80 : 20;
                    gameState.player.meat += e.isBoss ? 3 : 1;
                    gameState.player.honor += e.isBoss ? 40 : 12;
                    window.bakhaAudio.playSfx('coin');
                    spawnFloatingText(`${e.name} تێکشکێنرا!`, '#10b981');
                }
            }
        }
    });

    if (hitAny) {
        updateHUD();
        checkCombatCompletion();
    }
}

function performHowl() {
    if (gameState.player.rage < 25) {
        spawnFloatingText('پێویستت بە ٢٥٪ تووڕەییە!', '#ef4444');
        return;
    }
    gameState.player.rage -= 25;
    window.bakhaAudio.playSfx('howl');
    enemyMgr.stunAll(3.0);
    emitSparks(bakha.group.position, 45, 0x38bdf8);
    spawnFloatingText('لوورەی گورگ! دوژمنان سڕ بوون!', '#38bdf8');
    updateHUD();
}

function performBloodRage() {
    if (gameState.player.rage < 50) {
        spawnFloatingText('پێویستت بە ٥٠٪ تووڕەییە!', '#ef4444');
        return;
    }
    gameState.player.rage -= 50;
    gameState.bloodRageActive = true;
    gameState.bloodRageTimer = 8.0;
    document.getElementById('rageVignette').classList.add('active');
    window.bakhaAudio.playSfx('howl');
    spawnFloatingText('تووڕەیی خوێناوی چالاک بوو! (٨ چرکە)', '#ef4444');
    updateHUD();
}

function performDodge() {
    if (gameState.player.stamina < 25) return;
    if (bakha.startDodge()) {
        gameState.player.stamina -= 25;
        window.bakhaAudio.playSfx('slash');
        updateHUD();
    }
}

function eatMeatHeal() {
    if (gameState.player.meat <= 0) {
        spawnFloatingText('گۆشتت پێ نەماوە!', '#ef4444');
        return;
    }
    gameState.player.meat--;
    gameState.player.hp = Math.min(gameState.player.maxHp, gameState.player.hp + 35);
    window.bakhaAudio.playSfx('coin');
    spawnFloatingText('+٣٥ تەندروستی (گۆشتی برژاو)', '#10b981');
    updateHUD();
}

function checkCombatCompletion() {
    const alive = enemyMgr.enemies.filter(e => e.hp > 0);
    if (alive.length === 0 && gameState.pendingCombatNext) {
        const nextNode = gameState.pendingCombatNext;
        gameState.pendingCombatNext = null;
        document.getElementById('bossHud').classList.remove('active');
        setTimeout(() => loadStoryNode(nextNode), 900);
    }
}

// Story Engine
function loadStoryNode(nodeId) {
    let targetNode = null;
    let targetChapter = null;
    for (const ch of window.STORY_DATA.chapters) {
        for (const nd of ch.nodes) {
            if (nd.id === nodeId) {
                targetNode = nd;
                targetChapter = ch;
                break;
            }
        }
        if (targetNode) break;
    }
    if (!targetNode) return;

    gameState.currentNodeId = nodeId;
    gameState.chapter = targetChapter.id;

    document.getElementById('storyChapterTitle').textContent = targetChapter.title;
    document.getElementById('storySubtitle').textContent = targetChapter.subtitle;
    document.getElementById('storySpeaker').textContent = targetNode.speaker;
    document.getElementById('storyNarration').textContent = targetNode.narration;

    const dlgHtml = (targetNode.dialogue || []).map(d => `<div class="mt-2"><strong class="text-warning">${d.speaker}:</strong> "${d.text}"</div>`).join('');
    document.getElementById('storyDialogue').innerHTML = dlgHtml;

    const choicesBox = document.getElementById('storyChoices');
    choicesBox.innerHTML = '';
    (targetNode.choices || []).forEach(c => {
        const btn = document.createElement('button');
        btn.className = 'choice-btn-hybrid w-100';
        btn.innerHTML = `<span>${c.text}</span><i class="bi bi-chevron-left"></i>`;
        btn.onclick = () => handleChoice(c);
        choicesBox.appendChild(btn);
    });

    // Unminimize story dock on new node
    document.getElementById('storyDock').classList.remove('minimized');
}

function handleChoice(choice) {
    window.bakhaAudio.playSfx('click');
    const eff = choice.effects || {};

    if (eff.sharpen) { gameState.player.sharpenBonus += eff.sharpen; window.bakhaAudio.playSfx('sharpen'); emitSparks(bakha.group.position, 30, 0xf59e0b); }
    if (eff.rage) gameState.player.rage = Math.min(100, gameState.player.rage + eff.rage);
    if (eff.honor) gameState.player.honor += eff.honor;
    if (eff.meat) gameState.player.meat = Math.max(0, gameState.player.meat + eff.meat);
    if (eff.gold) gameState.player.gold += eff.gold;
    if (eff.attack) gameState.player.attack += eff.attack;
    if (eff.defense) gameState.player.defense += eff.defense;
    if (eff.maxHealth) gameState.player.maxHp = eff.maxHealth;
    if (eff.health) gameState.player.hp = Math.min(gameState.player.maxHp, gameState.player.hp + eff.health);
    if (eff.howl) performHowl();
    if (eff.item) {
        gameState.inventory.push({ id: 'item_' + Date.now(), name: eff.item, bonus: '+١٠ هێز', desc: 'دۆزراوە لە سەرکێشی بەرزان' });
        spawnFloatingText(`+ ${eff.item}`, '#fbbf24');
    }
    if (eff.teleport) {
        bakha.group.position.set(eff.teleport.x, 0, eff.teleport.z);
    }
    if (eff.restart) {
        gameState.player.hp = gameState.player.maxHp;
        gameState.chapter = 1;
        enemyMgr.clearAll();
    }

    if (eff.spawn) {
        enemyMgr.clearAll();
        eff.spawn.forEach(s => enemyMgr.spawnEnemy(s.type, s.x, s.z));
        const nextMap = {
            'ch3_combat_wait': 'ch3_combat_node',
            'ch5_combat_wait': 'ch5_combat_node',
            'ch7_combat_wait': 'ch7_combat_node',
            'ch8_combat_wait': 'ch8_victory'
        };
        gameState.pendingCombatNext = nextMap[choice.next] || null;
        document.getElementById('storyDock').classList.add('minimized');
        spawnFloatingText('دوژمنەکان لە پێشەوەن! هێرش بکە!', '#ef4444');
        updateHUD();
        return;
    }

    updateHUD();

    if (choice.next === 'minigame') {
        openMeatMinigame();
    } else if (choice.next === 'save_leaderboard') {
        window.bakhaCloud.saveGame(gameState);
        openLeaderboardModal();
    } else if (choice.next) {
        loadStoryNode(choice.next);
    }
}

function updateHUD() {
    document.getElementById('hpBar').style.width = `${(gameState.player.hp / gameState.player.maxHp) * 100}%`;
    document.getElementById('hpText').textContent = `${gameState.player.hp}/${gameState.player.maxHp}`;
    document.getElementById('rageBar').style.width = `${gameState.player.rage}%`;
    document.getElementById('rageText').textContent = `${gameState.player.rage}%`;
    document.getElementById('staminaBar').style.width = `${gameState.player.stamina}%`;
    document.getElementById('goldText').textContent = gameState.player.gold;
    document.getElementById('meatText').textContent = gameState.player.meat;
    document.getElementById('honorText').textContent = gameState.player.honor;
}

// Meat Cutting Minigame
let miniScore = 0;
let miniHanging = [];
function openMeatMinigame() {
    const modal = new bootstrap.Modal(document.getElementById('minigameModal'));
    modal.show();
    miniScore = 0;
    document.getElementById('miniScore').textContent = '0';
    miniHanging = [
        { x: 110, y: 30, w: 68, h: 130, cuts: 0, needed: 3, angle: 0, speed: 1.9, alive: true },
        { x: 280, y: 20, w: 80, h: 150, cuts: 0, needed: 4, angle: 0.4, speed: 2.3, alive: true },
        { x: 450, y: 35, w: 72, h: 125, cuts: 0, needed: 3, angle: -0.3, speed: 1.6, alive: true }
    ];
    const mc = document.getElementById('minigameCanvas');
    mc.onmousedown = (e) => {
        const rect = mc.getBoundingClientRect();
        const mx = (e.clientX - rect.left) * (mc.width / rect.width);
        const my = (e.clientY - rect.top) * (mc.height / rect.height);
        miniHanging.forEach(m => {
            if (!m.alive) return;
            const cx = m.x + Math.sin(m.angle) * 28;
            if (mx >= cx && mx <= cx + m.w && my >= m.y && my <= m.y + m.h) {
                m.cuts++;
                miniScore += 40;
                window.bakhaAudio.playSfx('hit');
                if (m.cuts >= m.needed) {
                    m.alive = false;
                    gameState.player.meat++;
                    gameState.player.gold += 12;
                    window.bakhaAudio.playSfx('coin');
                    updateHUD();
                    setTimeout(() => { m.cuts = 0; m.alive = true; }, 1000);
                }
                document.getElementById('miniScore').textContent = miniScore;
            }
        });
    };
    drawMeatMinigame();
}

function drawMeatMinigame() {
    const el = document.getElementById('minigameModal');
    if (!el.classList.contains('show')) return;
    const mc = document.getElementById('minigameCanvas');
    const ctx = mc.getContext('2d');
    ctx.fillStyle = '#140804';
    ctx.fillRect(0, 0, mc.width, mc.height);
    const t = performance.now() / 1000;

    miniHanging.forEach(m => {
        if (!m.alive) return;
        m.angle = Math.sin(t * m.speed) * 0.25;
        ctx.save();
        ctx.translate(m.x + m.w / 2, 10);
        ctx.rotate(m.angle);
        ctx.fillStyle = '#991b1b';
        ctx.fillRect(-m.w / 2, m.y, m.w, m.h);
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 13px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${m.cuts}/${m.needed}`, 0, m.y + m.h - 10);
        ctx.restore();
    });
    requestAnimationFrame(drawMeatMinigame);
}

// Modals
function openInventoryModal() {
    const box = document.getElementById('inventoryGrid');
    box.innerHTML = gameState.inventory.map(item => `
        <div class="col-md-6">
            <div class="hybrid-glass-panel p-3 h-100">
                <strong class="text-warning d-block">${item.name}</strong>
                <span class="badge bg-success my-1">${item.bonus}</span>
                <p class="small text-secondary mb-0">${item.desc}</p>
            </div>
        </div>
    `).join('');
    new bootstrap.Modal(document.getElementById('inventoryModal')).show();
}

async function openLeaderboardModal() {
    const list = await window.bakhaCloud.fetchLeaderboard();
    const tbody = document.getElementById('leaderboardBody');
    tbody.innerHTML = list.map((row, idx) => `
        <tr>
            <td>${idx + 1}</td>
            <td class="text-warning fw-bold">${row.name}</td>
            <td>${row.honor}</td>
            <td>${row.kills}</td>
            <td>بەشی ${row.chapter}</td>
        </tr>
    `).join('');
    new bootstrap.Modal(document.getElementById('leaderboardModal')).show();
}

// Mobile Virtual Joystick
const joyZone = document.getElementById('mobileJoystick');
const joyKnob = document.getElementById('mobileJoystickKnob');
if (joyZone && joyKnob) {
    let joyActive = false;
    const handleJoy = (clientX, clientY) => {
        const rect = joyZone.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        let dx = (clientX - cx) / 40;
        let dy = (clientY - cy) / 40;
        const mag = Math.hypot(dx, dy);
        if (mag > 1) { dx /= mag; dy /= mag; }
        bakha.joystick.x = dx;
        bakha.joystick.y = dy;
        joyKnob.style.transform = `translate(calc(-50% + ${dx * 32}px), calc(-50% + ${dy * 32}px))`;
    };
    joyZone.addEventListener('touchstart', (e) => { joyActive = true; handleJoy(e.touches[0].clientX, e.touches[0].clientY); });
    joyZone.addEventListener('touchmove', (e) => { if (joyActive) { e.preventDefault(); handleJoy(e.touches[0].clientX, e.touches[0].clientY); } });
    joyZone.addEventListener('touchend', () => {
        joyActive = false;
        bakha.joystick.x = 0; bakha.joystick.y = 0;
        joyKnob.style.transform = 'translate(-50%, -50%)';
    });
}

// Keyboard Shortcuts & Pointer Lock
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') performAttack();
    if (e.code === 'KeyQ') performHowl();
    if (e.code === 'KeyR') performBloodRage();
    if (e.code === 'KeyE') eatMeatHeal();
    if (e.code === 'KeyC') performDodge();
});

canvas.addEventListener('dblclick', () => {
    if (canvas.requestPointerLock) canvas.requestPointerLock();
});

// UI Button Bindings
document.getElementById('btnAttack').onclick = performAttack;
document.getElementById('btnHowl').onclick = performHowl;
document.getElementById('btnRage').onclick = performBloodRage;
document.getElementById('btnHeal').onclick = eatMeatHeal;
document.getElementById('btnDodge').onclick = performDodge;
document.getElementById('camModeBtn').onclick = () => bakha.toggleViewMode();
document.getElementById('btnAudio').onclick = () => {
    const on = window.bakhaAudio.toggle();
    document.getElementById('btnAudio').innerHTML = on ? '<i class="bi bi-volume-up-fill"></i>' : '<i class="bi bi-volume-mute-fill"></i>';
};
document.getElementById('btnMinigame').onclick = openMeatMinigame;
document.getElementById('btnInventory').onclick = openInventoryModal;
document.getElementById('btnLeaderboard').onclick = openLeaderboardModal;
document.getElementById('btnCloudSave').onclick = () => window.bakhaCloud.saveGame(gameState);
document.getElementById('googleLoginBtn').onclick = () => window.bakhaCloud.toggleLogin();
document.getElementById('toggleStoryBtn').onclick = () => document.getElementById('storyDock').classList.toggle('minimized');

// Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (composer) composer.setSize(window.innerWidth, window.innerHeight);
});

// 60 FPS Main Loop
let lastTime = performance.now();
let fpsFrames = 0;
let fpsClock = 0;

function gameLoop(now) {
    requestAnimationFrame(gameLoop);
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    const elapsed = now / 1000;

    // FPS Counter
    fpsFrames++;
    fpsClock += dt;
    if (fpsClock >= 0.5) {
        const fps = Math.round(fpsFrames / fpsClock);
        const fpsBadge = document.getElementById('fpsCounter');
        if (fpsBadge) fpsBadge.textContent = `${fps} FPS`;
        fpsFrames = 0;
        fpsClock = 0;
    }

    // Stamina regen & Blood Rage timer
    gameState.player.stamina = Math.min(100, gameState.player.stamina + dt * 16);
    if (gameState.bloodRageActive) {
        gameState.bloodRageTimer -= dt;
        if (gameState.bloodRageTimer <= 0) {
            gameState.bloodRageActive = false;
            document.getElementById('rageVignette').classList.remove('active');
        }
    }

    world.update(dt, elapsed);
    bakha.update(dt, elapsed, world.obstacles, gameState.bloodRageActive ? 1.0 : 0.0);

    // Update Sparks
    const arr = sparkGeo.attributes.position.array;
    for (let i = 0; i < sparkCount; i++) {
        if (arr[i * 3 + 1] > -10) {
            arr[i * 3 + 0] += sparkVel[i].x * dt;
            arr[i * 3 + 1] += sparkVel[i].y * dt;
            arr[i * 3 + 2] += sparkVel[i].z * dt;
            sparkVel[i].y -= 9.8 * dt;
            if (arr[i * 3 + 1] < 0) arr[i * 3 + 1] = -20;
        }
    }
    sparkGeo.attributes.position.needsUpdate = true;

    // Update Enemies & Boss HUD
    enemyMgr.update(dt, elapsed, bakha.group.position, (dmg) => {
        const finalDmg = Math.max(3, dmg - Math.floor(gameState.player.defense * 0.4));
        gameState.player.hp = Math.max(0, gameState.player.hp - finalDmg);
        window.bakhaAudio.playSfx('hit');
        spawnFloatingText(`-${finalDmg} HP`, '#ef4444');
        if (gameState.player.hp <= 0) {
            gameState.player.hp = 40;
            spawnFloatingText('بەخە بە هێزی گورگ هەستایەوە!', '#fbbf24');
        }
        updateHUD();
    }, (phase) => {
        window.bakhaAudio.playSfx('boss_roar');
        emitSparks(bakha.group.position, 40, 0xef4444);
        spawnFloatingText(`قۆناغی ${phase}ی بۆس دەستی پێکرد!`, '#ef4444');
    });

    const activeBoss = enemyMgr.enemies.find(e => e.isBoss && e.hp > 0);
    const bossHud = document.getElementById('bossHud');
    if (activeBoss) {
        bossHud.classList.add('active');
        document.getElementById('bossNameText').textContent = activeBoss.name;
        document.getElementById('bossHpText').textContent = `${Math.max(0, activeBoss.hp)}/${activeBoss.maxHp}`;
        document.getElementById('bossHpBar').style.width = `${Math.max(0, (activeBoss.hp / activeBoss.maxHp) * 100)}%`;
    } else {
        bossHud.classList.remove('active');
    }

    if (composer) {
        composer.render();
    } else {
        renderer.render(scene, camera);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    updateHUD();
    loadStoryNode('ch1_node1');
    requestAnimationFrame(gameLoop);
});
