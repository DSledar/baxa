// Bakha the Wolf Butcher — Upgraded 3D Character Rig + Free-Roam FPP/TPP Controller
class BakhaController {
    constructor(scene, camera, domElement) {
        this.scene = scene;
        this.camera = camera;
        this.domElement = domElement;

        this.mode = 'TPP'; // 'TPP' or 'FPP'
        this.yaw = Math.PI; // Facing -Z (north toward village & forest)
        this.pitch = -0.18;
        this.moveSpeed = 6.4;
        this.sprintMult = 1.62;

        this.keys = {};
        this.joystick = { x: 0, y: 0 };
        this.isDraggingLook = false;
        this.lastMouse = { x: 0, y: 0 };

        this.isSwinging = false;
        this.swingTimer = 0;
        this.swingDuration = 0.34;
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
        cx.fillStyle = '#3f3f46';
        cx.fillRect(0, 0, 256, 256);

        // Layered charcoal & silver-grey fur strokes matching Bakha's thick wolf coat
        for (let i = 0; i < 1800; i++) {
            const x = Math.random() * 256;
            const y = Math.random() * 256;
            const len = 8 + Math.random() * 14;
            const tone = Math.random();
            cx.strokeStyle = tone > 0.65 ? '#a1a1aa' : (tone > 0.3 ? '#52525b' : '#18181b');
            cx.lineWidth = 1.2 + Math.random() * 1.4;
            cx.beginPath();
            cx.moveTo(x, y);
            cx.lineTo(x + (Math.random() - 0.5) * 4, y + len);
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
        grad.addColorStop(0, '#3e1c0e');
        grad.addColorStop(0.5, '#2b1208');
        grad.addColorStop(1, '#4a2110');
        cx.fillStyle = grad;
        cx.fillRect(0, 0, 256, 256);

        // Scratches, wear & butcher bloodstains
        for (let i = 0; i < 120; i++) {
            cx.strokeStyle = 'rgba(217, 119, 6, 0.14)';
            cx.lineWidth = 1;
            const x = Math.random() * 256;
            const y = Math.random() * 256;
            cx.beginPath();
            cx.moveTo(x, y);
            cx.lineTo(x + (Math.random() - 0.5) * 35, y + (Math.random() - 0.5) * 35);
            cx.stroke();
        }
        for (let i = 0; i < 18; i++) {
            cx.fillStyle = 'rgba(127, 29, 29, 0.35)';
            cx.beginPath();
            cx.arc(Math.random() * 256, 120 + Math.random() * 130, 6 + Math.random() * 16, 0, Math.PI * 2);
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
        cx.strokeStyle = '#374151';
        cx.lineWidth = 2;
        for (let y = 0; y < 128; y += 6) {
            cx.beginPath();
            for (let x = 0; x < 128; x += 12) {
                cx.lineTo(x, y + Math.sin(x * 0.1 + y * 0.08) * 4);
            }
            cx.stroke();
        }
        // Bloodstained cleaver edge
        cx.fillStyle = 'rgba(153, 27, 27, 0.72)';
        cx.fillRect(0, 95, 128, 33);
        return new THREE.CanvasTexture(c);
    }

    buildCharacterMesh() {
        const furTex = this.createWolfFurTex();
        const furMat = new THREE.MeshStandardMaterial({ map: furTex, color: 0xd4d4d8, roughness: 0.88 });
        const darkFurMat = new THREE.MeshStandardMaterial({ map: furTex, color: 0x52525b, roughness: 0.85 });
        const silverCheekMat = new THREE.MeshStandardMaterial({ color: 0xe4e4e7, roughness: 0.8 });
        const noseMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.35, metalness: 0.2 });
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xf59e0b, emissiveIntensity: 2.2 });
        const shirtMat = new THREE.MeshStandardMaterial({ color: 0x121215, roughness: 0.85 });
        const apronMat = new THREE.MeshStandardMaterial({ map: this.createLeatherApronTex(), roughness: 0.65, metalness: 0.08 });
        const brassMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.85, roughness: 0.25 });
        const jamadaniMat = new THREE.MeshStandardMaterial({ map: this.createJamadaniTex(), roughness: 0.82 });
        const pantsMat = new THREE.MeshStandardMaterial({ color: 0x262629, roughness: 0.92 });
        const bootMat = new THREE.MeshStandardMaterial({ color: 0x14110f, roughness: 0.55, metalness: 0.15 });

        this.bladeMat = window.BakhaShaders.createEmberBladeMaterial(this.createDamascusTex());

        this.pelvis = new THREE.Group();
        this.pelvis.position.set(0, 0.98, 0);
        this.group.add(this.pelvis);

        // Muscular Legs + Heavy Lace-up Leather Boots
        const buildLeg = (sideX) => {
            const legGroup = new THREE.Group();
            legGroup.position.set(sideX, 0, 0);

            const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.13, 0.48, 12), pantsMat);
            thigh.position.y = -0.24;
            thigh.castShadow = true;
            legGroup.add(thigh);

            const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.32, 12), pantsMat);
            shin.position.y = -0.6;
            shin.castShadow = true;
            legGroup.add(shin);

            // Combat Leather Boot
            const bootShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.12, 0.28, 12), bootMat);
            bootShaft.position.y = -0.82;
            bootShaft.castShadow = true;
            legGroup.add(bootShaft);

            const bootFoot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.36), bootMat);
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
        const tailBase = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.55, 10), darkFurMat);
        tailBase.position.set(0, -0.15, -0.2);
        tailBase.rotation.x = -0.95;
        this.tailGroup.add(tailBase);

        const tailTip = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.45, 10), silverCheekMat);
        tailTip.position.set(0, -0.36, -0.44);
        tailTip.rotation.x = -1.15;
        this.tailGroup.add(tailTip);
        this.pelvis.add(this.tailGroup);

        // Broad Muscular Torso
        this.torso = new THREE.Group();
        this.torso.position.set(0, 0.08, 0);
        this.pelvis.add(this.torso);

        // Rolled-sleeve black collared shirt
        const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.34, 0.74, 14), shirtMat);
        chest.scale.set(1.05, 1.0, 0.68);
        chest.position.y = 0.38;
        chest.castShadow = true;
        this.torso.add(chest);

        // Wolf chest fur peeking through open shirt collar
        const chestFur = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.34, 8), furMat);
        chestFur.position.set(0, 0.58, 0.21);
        chestFur.rotation.x = Math.PI;
        this.torso.add(chestFur);

        // Brown Weathered Leather Butcher Apron + Brass Rings + Straps
        const apronBody = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.96, 0.06), apronMat);
        apronBody.position.set(0, 0.14, 0.245);
        apronBody.castShadow = true;
        this.torso.add(apronBody);

        const bib = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.34, 0.07), apronMat);
        bib.position.set(0, 0.52, 0.25);
        this.torso.add(bib);

        // Brass rings on apron bib
        [-0.17, 0.17].forEach(rx => {
            const ring = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.009, 8, 16), brassMat);
            ring.position.set(rx, 0.65, 0.29);
            this.torso.add(ring);

            const strap = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.24, 0.04), apronMat);
            strap.position.set(rx, 0.74, 0.22);
            strap.rotation.x = -0.35;
            this.torso.add(strap);
        });

        // Utility Belt + Buckles + Sheathed Butcher Knives & Sharpening Steel
        const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.365, 0.365, 0.09, 16), bootMat);
        belt.scale.set(1.04, 1.0, 0.74);
        belt.position.set(0, 0.05, 0.02);
        this.torso.add(belt);

        const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.1, 0.04), brassMat);
        buckle.position.set(0, 0.05, 0.29);
        this.torso.add(buckle);

        // Sheathed boning knife & sharpening steel on left hip/front
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

        // Iconic Black & White Kurdish Jamadani Scarf draped around neck with dangling fringed ends
        const scarfCollar = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.095, 10, 24), jamadaniMat);
        scarfCollar.position.set(0, 0.74, 0.02);
        scarfCollar.rotation.x = Math.PI / 2 + 0.12;
        scarfCollar.castShadow = true;
        this.torso.add(scarfCollar);

        const scarfDrapeL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.46, 0.04), jamadaniMat);
        scarfDrapeL.position.set(-0.22, 0.54, 0.26);
        scarfDrapeL.rotation.set(-0.12, 0.15, 0.18);
        this.torso.add(scarfDrapeL);

        const scarfDrapeR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.44, 0.04), jamadaniMat);
        scarfDrapeR.position.set(0.22, 0.55, 0.26);
        scarfDrapeR.rotation.set(-0.12, -0.15, -0.18);
        this.torso.add(scarfDrapeR);

        // Detailed Wolf Head (Snout, Silver Cheek Fluff, Glowing Amber Eyes, Pointed Ears, Tousled Mane)
        this.head = new THREE.Group();
        this.head.position.set(0, 0.94, 0.05);
        this.torso.add(this.head);

        const cranium = new THREE.Mesh(new THREE.DodecahedronGeometry(0.25, 1), darkFurMat);
        cranium.scale.set(1.05, 1.0, 1.12);
        cranium.castShadow = true;
        this.head.add(cranium);

        // Silver-white cheek fur tufts
        [-0.21, 0.21].forEach(cx => {
            const cheek = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.26, 6), silverCheekMat);
            cheek.position.set(cx, -0.05, 0.06);
            cheek.rotation.z = cx < 0 ? 1.15 : -1.15;
            this.head.add(cheek);
        });

        // Tapered Wolf Snout & Jaw
        const upperSnout = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.13, 0.34), furMat);
        upperSnout.position.set(0, -0.03, 0.28);
        this.head.add(upperSnout);

        const muzzleBridge = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.07, 0.32), silverCheekMat);
        muzzleBridge.position.set(0, -0.08, 0.27);
        this.head.add(muzzleBridge);

        const lowerJaw = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 0.28), furMat);
        lowerJaw.position.set(0, -0.12, 0.24);
        this.head.add(lowerJaw);

        const nose = new THREE.Mesh(new THREE.SphereGeometry(0.048, 10, 10), noseMat);
        nose.scale.set(1.2, 0.85, 1.0);
        nose.position.set(0, -0.01, 0.45);
        this.head.add(nose);

        // Tousled Grey-Black Hair Mane on top of Wolf Head
        for (let i = 0; i < 7; i++) {
            const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.24, 5), i % 2 === 0 ? darkFurMat : silverCheekMat);
            tuft.position.set((i - 3) * 0.045, 0.23, 0.05 + (i % 2) * 0.04);
            tuft.rotation.set(0.35, 0, (i - 3) * -0.12);
            this.head.add(tuft);
        }

        // Pointed Wolf Ears
        const earGeo = new THREE.ConeGeometry(0.09, 0.3, 5);
        const lEar = new THREE.Mesh(earGeo, darkFurMat);
        lEar.position.set(-0.16, 0.28, -0.04);
        lEar.rotation.z = 0.22;
        this.head.add(lEar);

        const rEar = new THREE.Mesh(earGeo, darkFurMat);
        rEar.position.set(0.16, 0.28, -0.04);
        rEar.rotation.z = -0.22;
        this.head.add(rEar);

        // Glowing Golden-Amber Wolf Eyes
        const eyeGeo = new THREE.SphereGeometry(0.038, 10, 10);
        const lEye = new THREE.Mesh(eyeGeo, eyeMat);
        lEye.position.set(-0.095, 0.06, 0.22);
        const rEye = new THREE.Mesh(eyeGeo, eyeMat);
        rEye.position.set(0.095, 0.06, 0.22);
        this.head.add(lEye, rEye);

        // Muscular Rolled-Sleeve Arms with Thick Wolf Forearms
        const buildArm = (sideX) => {
            const armGroup = new THREE.Group();
            armGroup.position.set(sideX, 0.62, 0);

            // Rolled black sleeve bicep
            const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.135, 0.34, 10), shirtMat);
            upperArm.position.y = -0.17;
            upperArm.castShadow = true;
            armGroup.add(upperArm);

            // Muscular furry wolf forearm
            const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.1, 0.36, 10), furMat);
            forearm.position.y = -0.5;
            forearm.castShadow = true;
            armGroup.add(forearm);

            // Clawed paw
            const paw = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 10), darkFurMat);
            paw.position.y = -0.7;
            armGroup.add(paw);

            return armGroup;
        };

        this.leftArm = buildArm(-0.48);
        this.torso.add(this.leftArm);

        this.rightArm = buildArm(0.48);
        this.tppCleaver = this.createCleaverMesh();
        this.tppCleaver.position.set(0, -0.72, 0.16);
        this.tppCleaver.rotation.x = Math.PI / 2;
        this.rightArm.add(this.tppCleaver);
        this.torso.add(this.rightArm);
    }

    createCleaverMesh() {
        const g = new THREE.Group();
        const handle = new THREE.Mesh(
            new THREE.CylinderGeometry(0.036, 0.042, 0.36, 8),
            new THREE.MeshStandardMaterial({ color: 0x3b1806, roughness: 0.6 })
        );
        g.add(handle);

        // Heavy rectangular butcher cleaver blade with hanging hole detail
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.66, 0.028), this.bladeMat);
        blade.position.set(0.13, 0.47, 0);
        blade.castShadow = true;
        g.add(blade);
        return g;
    }

    buildFppWeapon() {
        this.fppGroup = new THREE.Group();

        // Furry Wolf Forearm in First-Person View!
        const furMat = new THREE.MeshStandardMaterial({ map: this.createWolfFurTex(), color: 0xd4d4d8, roughness: 0.88 });
        const fppArm = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.55, 10), furMat);
        fppArm.position.set(0.42, -0.52, -0.38);
        fppArm.rotation.set(0.95, -0.25, 0.25);
        this.fppGroup.add(fppArm);

        this.fppCleaver = this.createCleaverMesh();
        this.fppCleaver.scale.set(0.68, 0.68, 0.68);
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
            const freq = isSprinting ? 13 : 8.5;
            this.leftLeg.rotation.x = Math.sin(elapsed * freq) * 0.65;
            this.rightLeg.rotation.x = -Math.sin(elapsed * freq) * 0.65;
            this.leftArm.rotation.x = -Math.sin(elapsed * freq) * 0.45;
            this.pelvis.position.y = 0.98 + Math.abs(Math.sin(elapsed * freq)) * 0.07;
        } else {
            this.leftLeg.rotation.x *= 0.85;
            this.rightLeg.rotation.x *= 0.85;
            this.leftArm.rotation.x *= 0.85;
            this.pelvis.position.y = 0.98 + Math.sin(elapsed * 2.5) * 0.02;
        }
        this.tailGroup.rotation.y = Math.sin(elapsed * 4.2) * 0.28;

        if (this.isSwinging) {
            this.swingTimer += dt;
            const p = Math.min(1, this.swingTimer / this.swingDuration);
            const arc = Math.sin(p * Math.PI);
            // Raise cleaver high overhead (-2.1 rad) then chop forcefully forward (-0.2 rad)
            this.rightArm.rotation.x = -0.35 - Math.sin(p * Math.PI * 1.35) * 1.75;
            this.rightArm.rotation.z = -0.15 - arc * 0.45;
            this.torso.rotation.y = Math.sin(p * Math.PI) * 0.35;

            if (this.fppCleaver) {
                this.fppCleaver.position.set(0.36 - arc * 0.35, -0.32 - arc * 0.08, -0.58 - arc * 0.15);
                this.fppCleaver.rotation.set(-0.25 - arc * 1.15, -0.35 + arc * 1.1, 0.25 + arc * 0.6);
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
