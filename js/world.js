// Procedural 3D Free-Roam World: Barzan Butcher Shop -> Village -> Dark Forest -> Ancient Temple -> Frost Cave
class BarzanWorld {
    constructor(scene) {
        this.scene = scene;
        this.obstacles = []; // { x, z, r }
        this.flickerLights = [];
        this.hangingMeats = [];
        this.ambientParticles = null;
        this.build();
    }

    createStoneTexture() {
        const c = document.createElement('canvas');
        c.width = 256; c.height = 256;
        const cx = c.getContext('2d');
        cx.fillStyle = '#1b1815';
        cx.fillRect(0, 0, 256, 256);
        for (let y = 0; y < 256; y += 32) {
            for (let x = 0; x < 256; x += 32) {
                cx.fillStyle = (x + y) % 64 === 0 ? '#272320' : '#1e1b18';
                cx.fillRect(x + 2, y + 2, 28, 28);
            }
        }
        const tex = new THREE.CanvasTexture(c);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(28, 28);
        return tex;
    }

    build() {
        // Sky dome
        this.skyDome = window.BakhaShaders.createSkyDome();
        this.scene.add(this.skyDome);

        // Ground
        const groundGeo = new THREE.PlaneGeometry(160, 180, 32, 32);
        const groundMat = new THREE.MeshStandardMaterial({
            map: this.createStoneTexture(),
            roughness: 0.9,
            metalness: 0.08
        });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.set(0, 0, -35);
        ground.receiveShadow = true;
        this.scene.add(ground);

        // Cobblestone road leading north (-Z)
        const roadGeo = new THREE.PlaneGeometry(5.5, 95);
        const roadMat = new THREE.MeshStandardMaterial({ color: 0x2c2520, roughness: 0.85 });
        const road = new THREE.Mesh(roadGeo, roadMat);
        road.rotation.x = -Math.PI / 2;
        road.position.set(0, 0.015, -36);
        road.receiveShadow = true;
        this.scene.add(road);

        this.buildButcherShop();
        this.buildVillage();
        this.buildForest();
        this.buildTemple();
        this.buildFrostCave();
        this.buildAmbientParticles();

        this.buildNPCs();
    }

    buildNPCs() {
        this.npcs = [];
        // Wise Old Man (پیرەمێردی زانا) near Village Square
        const wiseMan = this.createHumanoidNPC(0xd1d5db, 0x1e3a8a, true);
        wiseMan.position.set(-2.6, 0, -10.5);
        wiseMan.rotation.y = 0.4;
        this.scene.add(wiseMan);
        this.npcs.push(wiseMan);
        this.obstacles.push({ x: -2.6, z: -10.5, r: 0.55 });

        // Village Blacksmith (ئاسنگەری گوند) near Butcher Shop / Forge
        const blacksmith = this.createHumanoidNPC(0x3f2e21, 0x7c2d12, false);
        blacksmith.position.set(3.2, 0, -4.5);
        blacksmith.rotation.y = -0.5;
        this.scene.add(blacksmith);
        this.npcs.push(blacksmith);
        this.obstacles.push({ x: 3.2, z: -4.5, r: 0.55 });
    }

    createHumanoidNPC(hairColor, robeColor, hasStaff) {
        const g = new THREE.Group();
        const skinMat = new THREE.MeshStandardMaterial({ color: 0xd6a584, roughness: 0.75 });
        const robeMat = new THREE.MeshStandardMaterial({ color: robeColor, roughness: 0.85 });
        const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.9 });

        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.36, 1.3, 10), robeMat);
        body.position.y = 0.65;
        body.castShadow = true;
        g.add(body);

        const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 12), skinMat);
        head.position.y = 1.5;
        head.castShadow = true;
        g.add(head);

        const beard = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.32, 8), hairMat);
        beard.position.set(0, 1.32, 0.14);
        beard.rotation.x = Math.PI;
        g.add(beard);

        if (hasStaff) {
            const staff = new THREE.Mesh(
                new THREE.CylinderGeometry(0.03, 0.035, 1.85, 8),
                new THREE.MeshStandardMaterial({ color: 0x451a03 })
            );
            staff.position.set(0.38, 0.92, 0.15);
            g.add(staff);

            const orb = new THREE.Mesh(
                new THREE.SphereGeometry(0.08, 8, 8),
                new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
            );
            orb.position.set(0.38, 1.88, 0.15);
            g.add(orb);
        } else {
            // Blacksmith hammer
            const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.65, 6), new THREE.MeshStandardMaterial({ color: 0x451a03 }));
            handle.position.set(-0.36, 0.95, 0.2);
            handle.rotation.x = 0.8;
            g.add(handle);
            const hammerHead = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.26), new THREE.MeshStandardMaterial({ color: 0x6b7280, metalness: 0.8 }));
            hammerHead.position.set(-0.36, 1.15, 0.42);
            g.add(hammerHead);
        }
        return g;
    }


    addLantern(x, y, z, color = 0xf59e0b, intensity = 2.0) {
        const g = new THREE.Group();
        g.position.set(x, y, z);
        const post = new THREE.Mesh(
            new THREE.CylinderGeometry(0.06, 0.08, y, 8),
            new THREE.MeshStandardMaterial({ color: 0x2b180e, roughness: 0.8 })
        );
        post.position.y = -y / 2;
        post.castShadow = true;
        g.add(post);

        const bulb = new THREE.Mesh(
            new THREE.SphereGeometry(0.14, 10, 10),
            new THREE.MeshBasicMaterial({ color })
        );
        g.add(bulb);

        const light = new THREE.PointLight(color, intensity, 16);
        light.position.set(0, 0, 0);
        g.add(light);

        this.scene.add(g);
        this.flickerLights.push({ light, base: intensity, phase: Math.random() * 10 });
        this.obstacles.push({ x, z, r: 0.35 });
    }

    buildButcherShop() {
        // Butcher Block
        const block = new THREE.Mesh(
            new THREE.CylinderGeometry(0.65, 0.72, 0.85, 16),
            new THREE.MeshStandardMaterial({ color: 0x452412, roughness: 0.9 })
        );
        block.position.set(2.4, 0.425, 1.5);
        block.castShadow = true;
        block.receiveShadow = true;
        this.scene.add(block);
        this.obstacles.push({ x: 2.4, z: 1.5, r: 0.8 });

        // Shop Timber Frame
        const beamMat = new THREE.MeshStandardMaterial({ color: 0x2a1409, roughness: 0.9 });
        const positions = [[-3.8, -1.5], [3.8, -1.5], [-3.8, 4.5], [3.8, 4.5]];
        positions.forEach(([x, z]) => {
            const p = new THREE.Mesh(new THREE.BoxGeometry(0.32, 3.6, 0.32), beamMat);
            p.position.set(x, 1.8, z);
            p.castShadow = true;
            this.scene.add(p);
            this.obstacles.push({ x, z, r: 0.4 });
        });

        const roof = new THREE.Mesh(
            new THREE.BoxGeometry(8.4, 0.25, 6.8),
            beamMat
        );
        roof.position.set(0, 3.65, 1.5);
        roof.castShadow = true;
        this.scene.add(roof);

        // Hanging Meat Carcasses
        const meatMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.6 });
        [-2.2, 2.2].forEach((x) => {
            const mg = new THREE.Group();
            mg.position.set(x, 3.4, 2.5);
            const hook = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.7, 6), new THREE.MeshStandardMaterial({ color: 0x6b7280, metalness: 0.9 }));
            hook.position.y = -0.35;
            mg.add(hook);

            const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.35, 1.2, 10), meatMat);
            body.position.y = -1.1;
            body.castShadow = true;
            mg.add(body);
            this.scene.add(mg);
            this.hangingMeats.push(mg);
        });

        this.addLantern(-3.2, 2.6, -1.2, 0xf59e0b, 2.5);
        this.addLantern(3.2, 2.6, -1.2, 0xf59e0b, 2.5);
    }

    buildVillage() {
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x3b322b, roughness: 0.92 });
        const winMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
        const houses = [
            [-9, -10, 5, 4, 5],
            [9, -11, 5, 4.2, 5.5],
            [-10, -20, 5.5, 3.8, 5],
            [10, -21, 5, 4, 5]
        ];
        houses.forEach(([x, z, w, h, d]) => {
            const house = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
            house.position.set(x, h / 2, z);
            house.castShadow = true;
            house.receiveShadow = true;
            this.scene.add(house);

            const win = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), winMat);
            win.position.set(x > 0 ? x - w / 2 - 0.02 : x + w / 2 + 0.02, 2.0, z);
            win.rotation.y = x > 0 ? -Math.PI / 2 : Math.PI / 2;
            this.scene.add(win);

            this.obstacles.push({ x, z, r: Math.max(w, d) * 0.55 });
        });

        this.addLantern(-4.2, 2.8, -14, 0xf97316, 2.2);
        this.addLantern(4.2, 2.8, -14, 0xf97316, 2.2);
    }

    buildForest() {
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x2b170c, roughness: 0.95 });
        const leafMat = new THREE.MeshStandardMaterial({ color: 0x0f291e, roughness: 0.85 });

        for (let i = 0; i < 36; i++) {
            const side = i % 2 === 0 ? -1 : 1;
            const x = side * (4.8 + Math.random() * 18);
            const z = -22 - Math.random() * 28;
            const scale = 0.85 + Math.random() * 0.9;

            const tree = new THREE.Group();
            tree.position.set(x, 0, z);
            const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * scale, 0.34 * scale, 2.6 * scale, 7), trunkMat);
            trunk.position.y = 1.3 * scale;
            trunk.castShadow = true;
            tree.add(trunk);

            const cone1 = new THREE.Mesh(new THREE.ConeGeometry(1.6 * scale, 3.2 * scale, 7), leafMat);
            cone1.position.y = 3.2 * scale;
            cone1.castShadow = true;
            tree.add(cone1);

            const cone2 = new THREE.Mesh(new THREE.ConeGeometry(1.2 * scale, 2.6 * scale, 7), leafMat);
            cone2.position.y = 4.7 * scale;
            cone2.castShadow = true;
            tree.add(cone2);

            this.scene.add(tree);
            this.obstacles.push({ x, z, r: 0.55 * scale });
        }

        this.addLantern(-3.5, 2.5, -30, 0x38bdf8, 1.8);
        this.addLantern(3.5, 2.5, -38, 0x38bdf8, 1.8);
    }

    buildTemple() {
        const stoneMat = new THREE.MeshStandardMaterial({ color: 0x44403c, roughness: 0.8 });
        const runeMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
        const pillarCoords = [[-5, -46], [5, -46], [-5, -54], [5, -54]];

        pillarCoords.forEach(([x, z]) => {
            const p = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.72, 6.2, 8), stoneMat);
            p.position.set(x, 3.1, z);
            p.castShadow = true;
            this.scene.add(p);

            const ring = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.06, 8, 16), runeMat);
            ring.rotation.x = Math.PI / 2;
            ring.position.set(x, 2.5, z);
            this.scene.add(ring);

            this.obstacles.push({ x, z, r: 0.85 });
        });

        // Sacred Altar
        const altar = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.1, 1.4), stoneMat);
        altar.position.set(-2.5, 0.55, -50);
        altar.castShadow = true;
        this.scene.add(altar);
        this.obstacles.push({ x: -2.5, z: -50, r: 1.2 });

        this.addLantern(-2.5, 2.1, -50, 0x38bdf8, 2.4);
    }

    buildFrostCave() {
        const iceStoneMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.65, metalness: 0.2 });
        const crimsonRuneMat = new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.75 });

        // Cave Archway
        for (let i = 0; i < 12; i++) {
            const angle = (i / 11) * Math.PI;
            const x = Math.cos(angle) * 9;
            const y = Math.sin(angle) * 7.5;
            const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(2.2, 0), iceStoneMat);
            rock.position.set(x, y, -62);
            rock.rotation.set(Math.random(), Math.random(), 0);
            rock.castShadow = true;
            this.scene.add(rock);
        }

        // Boss Arena Floor Ring
        const arenaRing = new THREE.Mesh(
            new THREE.RingGeometry(8.5, 9.2, 48),
            crimsonRuneMat
        );
        arenaRing.rotation.x = -Math.PI / 2;
        arenaRing.position.set(0, 0.03, -72);
        this.scene.add(arenaRing);

        this.addLantern(-6, 3.0, -68, 0xef4444, 3.0);
        this.addLantern(6, 3.0, -68, 0xef4444, 3.0);
    }

    buildAmbientParticles() {
        const count = 320;
        const geo = new THREE.BufferGeometry();
        const pos = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            pos[i * 3 + 0] = (Math.random() - 0.5) * 65;
            pos[i * 3 + 1] = Math.random() * 14;
            pos[i * 3 + 2] = 10 - Math.random() * 95;
        }
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const mat = new THREE.PointsMaterial({
            color: 0xfde68a,
            size: 0.11,
            transparent: true,
            opacity: 0.55,
            blending: THREE.AdditiveBlending
        });
        this.ambientParticles = new THREE.Points(geo, mat);
        this.scene.add(this.ambientParticles);
    }

    update(dt, elapsed) {
        if (this.skyDome && this.skyDome.material.uniforms) {
            this.skyDome.material.uniforms.uTime.value = elapsed;
        }
        this.flickerLights.forEach(item => {
            item.light.intensity = item.base + Math.sin(elapsed * 9 + item.phase) * 0.28;
        });
        this.hangingMeats.forEach((m, idx) => {
            m.rotation.z = Math.sin(elapsed * 1.4 + idx) * 0.05;
        });
        if (this.ambientParticles) {
            const arr = this.ambientParticles.geometry.attributes.position.array;
            for (let i = 0; i < arr.length; i += 3) {
                arr[i + 1] -= dt * 0.6;
                arr[i] += Math.sin(elapsed + i) * dt * 0.15;
                if (arr[i + 1] < 0.1) arr[i + 1] = 14;
            }
            this.ambientParticles.geometry.attributes.position.needsUpdate = true;
        }
    }
}

window.BarzanWorld = BarzanWorld;
