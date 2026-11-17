// Bakha the Alpha Wolf Butcher — Elite Upgraded 3D Character Rig & Combat Controller
class BakhaController {
    constructor(scene, camera, domElement) {
        this.scene = scene;
        this.camera = camera;
        this.domElement = domElement;

        this.mode = 'TPP'; // 'TPP' or 'FPP'
        this.yaw = Math.PI; // Facing -Z (north toward village & forest)
        this.pitch = -0.18;
        this.moveSpeed = 6.6;
        this.sprintMult = 1.68;

        this.keys = {};
        this.joystick = { x: 0, y: 0 };
        this.isDraggingLook = false;
        this.lastMouse = { x: 0, y: 0 };

        this.isSwinging = false;
        this.swingTimer = 0;
        this.swingDuration = 0.32;
        this.isBlocking = false;
        this.dodgeTimer = 0;

        this.group = new THREE.Group();
        this.group.position.set(0, 0, 3.5);
        this.scene.add(this.group);

        this.buildCharacterMesh();
        this.buildFppWeapon();
        this.bindInputs();
    }

    createWolfFurTex() {
        const c = document.createElement('canvas');
        c.width = 256; c.height = 256;
        const cx = c.getContext('2d');
        cx.fillStyle = '#27272a';
        cx.fillRect(0, 0, 256, 256);

        // High-fidelity charcoal & silver wolf coat texture
        for (let i = 0; i < 2200; i++) {
            const x = Math.random() * 256;
            const y = Math.random() * 256;
            const len = 6 + Math.random() * 16;
            const tone = Math.random();
            cx.strokeStyle = tone > 0.6 ? '#d4d4d8' : (tone > 0.25 ? '#71717a' : '#09090b');
            cx.lineWidth = 1.1 + Math.random() * 1.5;
            cx.beginPath();
            cx.moveTo(x, y);
            cx.lineTo(x + (Math.random() - 0.5) * 5, y + len);
            cx.stroke();
        }
        const tex = new THREE.CanvasTexture(c);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        return tex;
    }

    createJamadaniTex() {
        const c = document.createElement('canvas');
        c.width = 128; c.height = 128;
        const cx = c.getContext('2d');
        cx.fillStyle = '#f8fafc';
        cx.fillRect(0, 0, 128, 128);
        cx.fillStyle = '#0f172a';
        for (let y = 0; y < 128; y += 12) {
            for (let x = 0; x < 128; x += 12) {
                if ((x + y) % 24 === 0) {
                    cx.fillRect(x, y, 10, 10);
                } else {
                    cx.fillRect(x + 3, y + 3, 4, 4);
                }
            }
        }
        const tex = new THREE.CanvasTexture(c);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(4, 4);
        return tex;
    }

    createLeatherApronTex() {
        const c = document.createElement('canvas');
        c.width = 256; c.height = 256;
        const cx = c.getContext('2d');
        const grad = cx.createLinearGradient(0, 0, 256, 256);
        grad.addColorStop(0, '#38160a');
        grad.addColorStop(0.5, '#200b04');
        grad.addColorStop(1, '#451a03');
        cx.fillStyle = grad;
        cx.fillRect(0, 0, 256, 256);

        // Heavy wear, battle scars & butcher bloodstains
        for (let i = 0; i < 140; i++) {
            cx.strokeStyle = 'rgba(217, 119, 6, 0.18)';
            cx.lineWidth = 1.2;
            const x = Math.random() * 256;
            const y = Math.random() * 256;
            cx.beginPath();
            cx.moveTo(x, y);
            cx.lineTo(x + (Math.random() - 0.5) * 40, y + (Math.random() - 0.5) * 40);
            cx.stroke();
        }
        for (let i = 0; i < 22; i++) {
            cx.fillStyle = 'rgba(153, 27, 27, 0.42)';
            cx.beginPath();
            cx.arc(Math.random() * 256, 110 + Math.random() * 140, 8 + Math.random() * 18, 0, Math.PI * 2);
            cx.fill();
        }
        return new THREE.CanvasTexture(c);
    }

    createDamascusTex() {
        const c = document.createElement('canvas');
        c.width = 128; c.height = 128;
        const cx = c.getContext('2d');
        cx.fillStyle = '#9ca3af';
        cx.fillRect(0, 0, 128, 128);
        cx.strokeStyle = '#1f2937';
        cx.lineWidth = 2.5;
        for (let y = 0; y < 128; y += 5) {
            cx.beginPath();
            for (let x = 0; x < 128; x += 10) {
                cx.lineTo(x, y + Math.sin(x * 0.12 + y * 0.1) * 5);
            }
            cx.stroke();
        }
        // Deep bloodstained cleaver edge
        cx.fillStyle = 'rgba(185, 28, 28, 0.82)';
        cx.fillRect(0, 90, 128, 38);
        return new THREE.CanvasTexture(c);
    }

    buildCharacterMesh() {
        const furTex = this.createWolfFurTex();
        const furMat = new THREE.MeshStandardMaterial({ map: furTex, color: 0xe4e4e7, roughness: 0.85 });
        const darkFurMat = new THREE.MeshStandardMaterial({ map: furTex, color: 0x3f3f46, roughness: 0.82 });
        const silverCheekMat = new THREE.MeshStandardMaterial({ color: 0xf4f4f5, roughness: 0.78 });
        const noseMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.3, metalness: 0.3 });
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xf59e0b, emissiveIntensity: 2.5 });
        const shirtMat = new THREE.MeshStandardMaterial({ color: 0x0f0f12, roughness: 0.88 });
        const apronMat = new THREE.MeshStandardMaterial({ map: this.createLeatherApronTex(), roughness: 0.62, metalness: 0.1 });
        const brassMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.9, roughness: 0.2 });
        const jamadaniMat = new THREE.MeshStandardMaterial({ map: this.createJamadaniTex(), roughness: 0.8 });
        const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1c1c1e, roughness: 0.9 });
        const bootMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.5, metalness: 0.2 });

        this.bladeMat = window.BakhaShaders.createEmberBladeMaterial(this.createDamascusTex());

        this.pelvis = new THREE.Group();
        this.pelvis.position.set(0, 0.98, 0);
        this.group.add(this.pelvis);

        // Muscular Legs + Heavy Combat Boots
        const buildLeg = (sideX) => {
            const legGroup = new THREE.Group();
            legGroup.position.set(sideX, 0, 0);

            const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.165, 0.135, 0.48, 12), pantsMat);
            thigh.position.y = -0.24;
            thigh.castShadow = true;
            legGroup.add(thigh);

            const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.115, 0.32, 12), pantsMat);
            shin.position.y = -0.6;
            shin.castShadow = true;
            legGroup.add(shin);

            const bootShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.125, 0.28, 12), bootMat);
            bootShaft.position.y = -0.82;
            bootShaft.castShadow = true;
            legGroup.add(bootShaft);

            const bootFoot = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.12, 0.38), bootMat);
            bootFoot.position.set(0, -0.92, 0.06);
            bootFoot.castShadow = true;
            legGroup.add(bootFoot);

            return legGroup;
        };

        this.leftLeg = buildLeg(-0.22);
        this.rightLeg = buildLeg(0.22);
        this.pelvis.add(this.leftLeg, this.rightLeg);

        // Bushy Multi-Layered Wolf Tail
        this.tailGroup = new THREE.Group();
        this.tailGroup.position.set(0, -0.06, -0.24);
        const tailBase = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.58, 10), darkFurMat);
        tailBase.position.set(0, -0.15, -0.2);
        tailBase.rotation.x = -0.95;
        this.tailGroup.add(tailBase);

        const tailTip = new THREE.Mesh(new THREE.ConeGeometry(0.135, 0.48, 10), silverCheekMat);
        tailTip.position.set(0, -0.38, -0.46);
        tailTip.rotation.x = -1.15;
        this.tailGroup.add(tailTip);
        this.pelvis.add(this.tailGroup);

        // Broad Muscular Torso
        this.torso = new THREE.Group();
        this.torso.position.set(0, 0.08, 0);
        this.pelvis.add(this.torso);

        const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.35, 0.76, 14), shirtMat);
        chest.scale.set(1.06, 1.0, 0.7);
        chest.position.y = 0.38;
        chest.castShadow = true;
        this.torso.add(chest);

        const chestFur = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.36, 8), furMat);
        chestFur.position.set(0, 0.58, 0.22);
        chestFur.rotation.x = Math.PI;
        this.torso.add(chestFur);

        // Weathered Leather Butcher Apron + Brass Rings & Straps
        const apronBody = new THREE.Mesh(new THREE.BoxGeometry(0.63, 0.98, 0.06), apronMat);
        apronBody.position.set(0, 0.14, 0.25);
        apronBody.castShadow = true;
        this.torso.add(apronBody);

        const bib = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.35, 0.07), apronMat);
        bib.position.set(0, 0.52, 0.255);
        this.torso.add(bib);

        [-0.17, 0.17].forEach(rx => {
            const ring = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.009, 8, 16), brassMat);
            ring.position.set(rx, 0.65, 0.295);
            this.torso.add(ring);

            const strap = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.24, 0.04), apronMat);
            strap.position.set(rx, 0.74, 0.22);
            strap.rotation.x = -0.35;
            this.torso.add(strap);
        });

        // Utility Belt + Buckle + Sheathed Knife & Steel
        const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.37, 0.09, 16), bootMat);
        belt.scale.set(1.04, 1.0, 0.74);
        belt.position.set(0, 0.05, 0.02);
        this.torso.add(belt);

        const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.04), brassMat);
        buckle.position.set(0, 0.05, 0.295);
        this.torso.add(buckle);

        const sheath = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.34, 0.05), apronMat);
        sheath.position.set(-0.18, -0.08, 0.29);
        sheath.rotation.z = 0.08;
        this.torso.add(sheath);

        const steelRod = new THREE.Mesh(
            new THREE.CylinderGeometry(0.014, 0.01, 0.42, 8),
            new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.9, roughness: 0.2 })
        );
        steelRod.position.set(-0.09, -0.12, 0.3);
        this.torso.add(steelRod);

        // Jamadani Scarf with Fringed Ends
        const scarfCollar = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.098, 10, 24), jamadaniMat);
        scarfCollar.position.set(0, 0.74, 0.02);
        scarfCollar.rotation.x = Math.PI / 2 + 0.12;
        scarfCollar.castShadow = true;
        this.torso.add(scarfCollar);

        const scarfDrapeL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.48, 0.04), jamadaniMat);
        scarfDrapeL.position.set(-0.22, 0.54, 0.26);
        scarfDrapeL.rotation.set(-0.12, 0.15, 0.18);
        this.torso.add(scarfDrapeL);

        const scarfDrapeR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.46, 0.04), jamadaniMat);
        scarfDrapeR.position.set(0.22, 0.55, 0.26);
        scarfDrapeR.rotation.set(-0.12, -0.15, -0.18);
        this.torso.add(scarfDrapeR);

        // Detailed Wolf Head
        this.head = new THREE.Group();
        this.head.position.set(0, 0.95, 0.05);
        this.torso.add(this.head);

        const cranium = new THREE.Mesh(new THREE.DodecahedronGeometry(0.26, 1), darkFurMat);
        cranium.scale.set(1.06, 1.0, 1.15);
        cranium.castShadow = true;
        this.head.add(cranium);

        [-0.22, 0.22].forEach(cx => {
            const cheek = new THREE.Mesh(new THREE.ConeGeometry(0.125, 0.28, 6), silverCheekMat);
            cheek.position.set(cx, -0.05, 0.06);
            cheek.rotation.z = cx < 0 ? 1.15 : -1.15;
            this.head.add(cheek);
        });

        const upperSnout = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.135, 0.35), furMat);
        upperSnout.position.set(0, -0.03, 0.28);
        this.head.add(upperSnout);

        const muzzleBridge = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.07, 0.32), silverCheekMat);
        muzzleBridge.position.set(0, -0.08, 0.27);
        this.head.add(muzzleBridge);

        const lowerJaw = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 0.28), furMat);
        lowerJaw.position.set(0, -0.12, 0.24);
        this.head.add(lowerJaw);

        const nose = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 10), noseMat);
        nose.scale.set(1.2, 0.85, 1.0);
        nose.position.set(0, -0.01, 0.46);
        this.head.add(nose);

        for (let i = 0; i < 7; i++) {
            const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.25, 5), i % 2 === 0 ? darkFurMat : silverCheekMat);
            tuft.position.set((i - 3) * 0.045, 0.24, 0.05 + (i % 2) * 0.04);
            tuft.rotation.set(0.35, 0, (i - 3) * -0.12);
            this.head.add(tuft);
        }

        const earGeo = new THREE.ConeGeometry(0.095, 0.32, 5);
        const lEar = new THREE.Mesh(earGeo, darkFurMat);
        lEar.position.set(-0.17, 0.29, -0.04);
        lEar.rotation.z = 0.22;
        this.head.add(lEar);

        const rEar = new THREE.Mesh(earGeo, darkFurMat);
        rEar.position.set(0.17, 0.29, -0.04);
        rEar.rotation.z = -0.22;
        this.head.add(rEar);

        const eyeGeo = new THREE.SphereGeometry(0.04, 10, 10);
        const lEye = new THREE.Mesh(eyeGeo, eyeMat);
        lEye.position.set(-0.1, 0.06, 0.23);
        const rEye = new THREE.Mesh(eyeGeo, eyeMat);
        rEye.position.set(0.1, 0.06, 0.23);
        this.head.add(lEye, rEye);

        // Arms + Glowing Ember Rune Scars
        const buildArm = (sideX) => {
            const armGroup = new THREE.Group();
            armGroup.position.set(sideX, 0.62, 0);

            const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.14, 0.35, 10), shirtMat);
            upperArm.position.y = -0.17;
            upperArm.castShadow = true;
            armGroup.add(upperArm);

            const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.105, 0.38, 10), furMat);
            forearm.position.y = -0.5;
            forearm.castShadow = true;
            armGroup.add(forearm);

            // Glowing Ember Rune scar on forearm
            const rune = new THREE.Mesh(
                new THREE.BoxGeometry(0.04, 0.22, 0.015),
                new THREE.MeshBasicMaterial({ color: 0xf59e0b })
            );
            rune.position.set(sideX < 0 ? 0.11 : -0.11, -0.5, 0.08);
            rune.rotation.y = sideX < 0 ? Math.PI / 2 : -Math.PI / 2;
            armGroup.add(rune);

            const paw = new THREE.Mesh(new THREE.SphereGeometry(0.105, 10, 10), darkFurMat);
            paw.position.y = -0.72;
            armGroup.add(paw);

            return armGroup;
        };

        this.leftArm = buildArm(-0.49);
        this.torso.add(this.leftArm);

        this.rightArm = buildArm(0.49);
        this.tppCleaver = this.createCleaverMesh();
        this.tppCleaver.position.set(0, -0.74, 0.16);
        this.tppCleaver.rotation.x = Math.PI / 2;
        this.rightArm.add(this.tppCleaver);
        this.torso.add(this.rightArm);
    }

    createCleaverMesh() {
        const g = new THREE.Group();
        const handle = new THREE.Mesh(
            new THREE.CylinderGeometry(0.038, 0.044, 0.38, 8),
            new THREE.MeshStandardMaterial({ color: 0x2b1305, roughness: 0.55 })
        );
        g.add(handle);

        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.68, 0.03), this.bladeMat);
        blade.position.set(0.14, 0.48, 0);
        blade.castShadow = true;
        g.add(blade);
        return g;
    }

    buildFppWeapon() {
        this.fppGroup = new THREE.Group();
        const furMat = new THREE.MeshStandardMaterial({ map: this.createWolfFurTex(), color: 0xe4e4e7, roughness: 0.85 });
        const fppArm = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.125, 0.58, 10), furMat);
        fppArm.position.set(0.42, -0.52, -0.38);
        fppArm.rotation.set(0.95, -0.25, 0.25);
        this.fppGroup.add(fppArm);

        this.fppCleaver = this.createCleaverMesh();
        this.fppCleaver.scale.set(0.7, 0.7, 0.7);
        this.fppCleaver.position.set(0.36, -0.32, -0.58);
        this.fppCleaver.rotation.set(-0.25, -0.35, 0.25);
        this.fppGroup.add(this.fppCleaver);
        this.fppGroup.visible = false;
        this.camera.add(this.fppGroup);
        this.scene.add(this.camera);
    }

    toggleViewMode() {
        this.mode = this.mode === 'TPP' ? 'FPP' : 'TPP';
        this.group.visible = (this.mode === 'TPP');
        this.fppGroup.visible = (this.mode === 'FPP');
        const btn = document.getElementById('camModeBtn');
        if (btn) {
            btn.innerHTML = this.mode === 'FPP'
                ? `<i class="bi bi-eye-fill"></i> یەکەم کەس (FPP)`
                : `<i class="bi bi-person-bounding-box"></i> سێیەم کەس (TPP)`;
        }
    }

    bindInputs() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (e.code === 'KeyV') this.toggleViewMode();
        });
        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });

        this.domElement.addEventListener('mousedown', (e) => {
            if (e.button === 0 && !document.pointerLockElement) {
                this.isDraggingLook = true;
                this.lastMouse = { x: e.clientX, y: e.clientY };
            }
        });
        window.addEventListener('mouseup', () => { this.isDraggingLook = false; });
        window.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement === this.domElement) {
                this.yaw -= e.movementX * 0.0025;
                this.pitch = Math.max(-0.85, Math.min(0.75, this.pitch - e.movementY * 0.0022));
            } else if (this.isDraggingLook) {
                const dx = e.clientX - this.lastMouse.x;
                const dy = e.clientY - this.lastMouse.y;
                this.yaw -= dx * 0.0045;
                this.pitch = Math.max(-0.85, Math.min(0.75, this.pitch - dy * 0.0035));
                this.lastMouse = { x: e.clientX, y: e.clientY };
            }
        });
    }

    startSwing() {
        if (this.isSwinging) return false;
        this.isSwinging = true;
        this.swingTimer = 0;
        return true;
    }

    startDodge() {
        if (this.dodgeTimer > 0) return false;
        this.dodgeTimer = 0.32;
        return true;
    }

    update(dt, elapsed, obstacles, rageNorm) {
        if (this.bladeMat && this.bladeMat.uniforms) {
            this.bladeMat.uniforms.uTime.value = elapsed;
            this.bladeMat.uniforms.uRage.value = rageNorm;
        }

        let moveZ = 0;
        let moveX = 0;
        if (this.keys['KeyW'] || this.keys['ArrowUp']) moveZ -= 1;
        if (this.keys['KeyS'] || this.keys['ArrowDown']) moveZ += 1;
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveX -= 1;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) moveX += 1;

        moveX += this.joystick.x;
        moveZ += this.joystick.y;

        const isMoving = Math.abs(moveX) > 0.05 || Math.abs(moveZ) > 0.05;
        const isSprinting = (this.keys['ShiftLeft'] || this.keys['ShiftRight']) && isMoving;
        let speed = this.moveSpeed * (isSprinting ? this.sprintMult : 1);

        if (this.dodgeTimer > 0) {
            this.dodgeTimer -= dt;
            speed *= 2.4;
        }

        if (isMoving || this.dodgeTimer > 0) {
            const forward = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
            const right = new THREE.Vector3(-Math.cos(this.yaw), 0, Math.sin(this.yaw));
            const dir = new THREE.Vector3();
            dir.addScaledVector(forward, -moveZ);
            dir.addScaledVector(right, moveX);
            if (dir.lengthSq() > 0.001) dir.normalize();

            const nextX = this.group.position.x + dir.x * speed * dt;
            const nextZ = this.group.position.z + dir.z * speed * dt;

            let blocked = false;
            if (nextX < -28 || nextX > 28 || nextZ > 8 || nextZ < -84) blocked = true;
            for (let i = 0; i < obstacles.length; i++) {
                const o = obstacles[i];
                const dx = nextX - o.x;
                const dz = nextZ - o.z;
                if (dx * dx + dz * dz < (o.r + 0.45) * (o.r + 0.45)) {
                    blocked = true;
                    break;
                }
            }

            if (!blocked) {
                this.group.position.x = nextX;
                this.group.position.z = nextZ;
            }
        }

        this.group.rotation.y = this.yaw;

        if (isMoving) {
            const freq = isSprinting ? 14 : 9.0;
            this.leftLeg.rotation.x = Math.sin(elapsed * freq) * 0.7;
            this.rightLeg.rotation.x = -Math.sin(elapsed * freq) * 0.7;
            this.leftArm.rotation.x = -Math.sin(elapsed * freq) * 0.5;
            this.pelvis.position.y = 0.98 + Math.abs(Math.sin(elapsed * freq)) * 0.08;
        } else {
            this.leftLeg.rotation.x *= 0.85;
            this.rightLeg.rotation.x *= 0.85;
            this.leftArm.rotation.x *= 0.85;
            this.pelvis.position.y = 0.98 + Math.sin(elapsed * 2.5) * 0.02;
        }
        this.tailGroup.rotation.y = Math.sin(elapsed * 4.5) * 0.32;

        if (this.isSwinging) {
            this.swingTimer += dt;
            const p = Math.min(1, this.swingTimer / this.swingDuration);
            const arc = Math.sin(p * Math.PI);
            this.rightArm.rotation.x = -0.35 - Math.sin(p * Math.PI * 1.35) * 1.85;
            this.rightArm.rotation.z = -0.15 - arc * 0.5;
            this.torso.rotation.y = Math.sin(p * Math.PI) * 0.4;

            if (this.fppCleaver) {
                this.fppCleaver.position.set(0.36 - arc * 0.38, -0.32 - arc * 0.09, -0.58 - arc * 0.16);
                this.fppCleaver.rotation.set(-0.25 - arc * 1.2, -0.35 + arc * 1.15, 0.25 + arc * 0.65);
            }
            if (p >= 1) {
                this.isSwinging = false;
                this.torso.rotation.y = 0;
            }
        } else {
            this.torso.rotation.y *= 0.8;
            this.rightArm.rotation.x = this.isBlocking ? -1.15 : -0.25;
            this.rightArm.rotation.z = this.isBlocking ? -0.55 : -0.12;
            if (this.fppCleaver) {
                const bob = isMoving ? Math.sin(elapsed * 9) * 0.02 : Math.sin(elapsed * 2) * 0.006;
                this.fppCleaver.position.set(0.36, -0.32 + bob, -0.58);
                this.fppCleaver.rotation.set(this.isBlocking ? -0.9 : -0.25, -0.35, this.isBlocking ? 1.1 : 0.25);
            }
        }

        const px = this.group.position.x;
        const py = this.group.position.y;
        const pz = this.group.position.z;

        if (this.mode === 'FPP') {
            this.camera.position.set(px, py + 1.78, pz);
            const lookTarget = new THREE.Vector3(
                px + Math.sin(this.yaw) * Math.cos(this.pitch),
                py + 1.78 + Math.sin(this.pitch),
                pz + Math.cos(this.yaw) * Math.cos(this.pitch)
            );
            this.camera.lookAt(lookTarget);
        } else {
            const dist = 4.5;
            const camX = px - Math.sin(this.yaw) * Math.cos(this.pitch) * dist;
            const camY = Math.max(0.7, py + 1.85 - Math.sin(this.pitch) * dist);
            const camZ = pz - Math.cos(this.yaw) * Math.cos(this.pitch) * dist;
            this.camera.position.lerp(new THREE.Vector3(camX, camY, camZ), 0.22);
            this.camera.lookAt(px, py + 1.5, pz);
        }

        return { isMoving, isSprinting };
    }
}

window.BakhaController = BakhaController;
