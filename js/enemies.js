// Real-Time 3D Enemies & Multi-Phase Boss System
class EnemyManager {
    constructor(scene) {
        this.scene = scene;
        this.enemies = [];
    }

    spawnEnemy(type, x, z) {
        const g = new THREE.Group();
        g.position.set(x, 0, z);

        let stats = {
            type,
            name: 'گورگی تاریکی',
            hp: 90,
            maxHp: 90,
            damage: 12,
            speed: 3.4,
            attackRange: 2.0,
            isBoss: false,
            phase: 1,
            cooldown: 0,
            stunTimer: 0
        };

        if (type === 'shadow_wolf') {
            const body = new THREE.Mesh(
                new THREE.BoxGeometry(0.65, 0.55, 1.3),
                new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.8 })
            );
            body.position.y = 0.65;
            body.castShadow = true;
            g.add(body);

            const head = new THREE.Mesh(
                new THREE.BoxGeometry(0.45, 0.42, 0.55),
                new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.7 })
            );
            head.position.set(0, 0.85, 0.75);
            g.add(head);

            const eyeMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
            const le = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), eyeMat);
            le.position.set(-0.12, 0.92, 1.02);
            const re = le.clone();
            re.position.x = 0.12;
            g.add(le, re);
        } else if (type === 'cave_fiend') {
            stats.name = 'دڕندەی ئەشکەوتی بەستەڵەک';
            stats.hp = 220; stats.maxHp = 220;
            stats.damage = 20; stats.speed = 2.8; stats.attackRange = 2.6;
            stats.isBoss = true;

            const torso = new THREE.Mesh(
                new THREE.DodecahedronGeometry(0.95, 0),
                new THREE.MeshStandardMaterial({ color: 0x1e1b4b, roughness: 0.65 })
            );
            torso.position.y = 1.65;
            torso.castShadow = true;
            g.add(torso);

            // 4 Black Wings
            const wingMat = new THREE.MeshStandardMaterial({ color: 0x09090b, side: THREE.DoubleSide });
            [[-1.2, 2.2, 0.4], [1.2, 2.2, -0.4], [-1.0, 1.4, 0.6], [1.0, 1.4, -0.6]].forEach(([wx, wy, rot]) => {
                const w = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.7), wingMat);
                w.position.set(wx, wy, -0.4);
                w.rotation.z = rot;
                g.add(w);
            });

            const eyeMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
            const eyes = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.14, 0.2), eyeMat);
            eyes.position.set(0, 2.2, 0.75);
            g.add(eyes);
        } else if (type === 'father_of_darkness') {
            stats.name = 'باوکی تاریکی (Boss - قۆناغی ١)';
            stats.hp = 450; stats.maxHp = 450;
            stats.damage = 26; stats.speed = 3.1; stats.attackRange = 3.2;
            stats.isBoss = true;

            const body = new THREE.Mesh(
                new THREE.CylinderGeometry(0.75, 1.0, 2.8, 8),
                new THREE.MeshStandardMaterial({ color: 0x180505, roughness: 0.5, metalness: 0.3 })
            );
            body.position.y = 1.4;
            body.castShadow = true;
            g.add(body);

            const crown = new THREE.Mesh(
                new THREE.ConeGeometry(0.65, 1.1, 6),
                new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0x991b1b, emissiveIntensity: 1.4 })
            );
            crown.position.y = 3.2;
            g.add(crown);

            const sword = new THREE.Mesh(
                new THREE.BoxGeometry(0.18, 2.8, 0.08),
                new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xdc2626, emissiveIntensity: 1.8 })
            );
            sword.position.set(1.1, 1.6, 0.7);
            sword.rotation.x = 0.6;
            g.add(sword);
            stats.sword = sword;
        }

        this.scene.add(g);
        const enemyObj = { mesh: g, ...stats };
        this.enemies.push(enemyObj);
        return enemyObj;
    }

    clearAll() {
        this.enemies.forEach(e => this.scene.remove(e.mesh));
        this.enemies = [];
    }

    stunAll(duration) {
        this.enemies.forEach(e => { e.stunTimer = duration; });
    }

    update(dt, elapsed, playerPos, onPlayerHit, onBossPhaseChange) {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            if (e.hp <= 0) continue;

            if (e.stunTimer > 0) {
                e.stunTimer -= dt;
                e.mesh.position.y = Math.sin(elapsed * 25) * 0.06;
                continue;
            } else {
                e.mesh.position.y = 0;
            }

            // Multi-Phase Boss Logic for Father of Darkness
            if (e.type === 'father_of_darkness') {
                const ratio = e.hp / e.maxHp;
                if (ratio <= 0.65 && e.phase === 1) {
                    e.phase = 2;
                    e.name = 'باوکی تاریکی (قۆناغی ٢: بانگهێشتی گورگ!)';
                    e.speed = 3.6;
                    this.spawnEnemy('shadow_wolf', e.mesh.position.x - 3, e.mesh.position.z + 2);
                    if (onBossPhaseChange) onBossPhaseChange(2);
                } else if (ratio <= 0.30 && e.phase === 2) {
                    e.phase = 3;
                    e.name = 'باوکی تاریکی (قۆناغی ٣: تووڕەیی دۆزەخ!)';
                    e.speed = 4.2;
                    e.damage = 34;
                    if (onBossPhaseChange) onBossPhaseChange(3);
                }
            }

            const dx = playerPos.x - e.mesh.position.x;
            const dz = playerPos.z - e.mesh.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);

            e.mesh.lookAt(playerPos.x, 0, playerPos.z);

            if (dist > e.attackRange) {
                e.mesh.position.x += (dx / dist) * e.speed * dt;
                e.mesh.position.z += (dz / dist) * e.speed * dt;
                e.mesh.position.y = Math.abs(Math.sin(elapsed * 8)) * 0.12;
            } else {
                e.cooldown -= dt;
                if (e.cooldown <= 0) {
                    e.cooldown = e.isBoss ? (e.phase === 3 ? 0.95 : 1.35) : 1.5;
                    if (onPlayerHit) onPlayerHit(e.damage, e);
                }
            }
        }
    }
}

window.EnemyManager = EnemyManager;
