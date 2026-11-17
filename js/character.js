// Bakha 3D Character Rig + Free-Roam FPP/TPP Controller + Real-Time Cleaver Combat
class BakhaController {
    constructor(scene, camera, domElement) {
        this.scene = scene;
        this.camera = camera;
        this.domElement = domElement;

        this.mode = 'TPP'; // 'TPP' or 'FPP'
        this.yaw = Math.PI; // Facing -Z (north toward village & forest)
        this.pitch = -0.18;
        this.moveSpeed = 6.2;
        this.sprintMult = 1.6;

        this.keys = {};
        this.joystick = { x: 0, y: 0 };
        this.isDraggingLook = false;
        this.lastMouse = { x: 0, y: 0 };

        this.isSwinging = false;
        this.swingTimer = 0;
        this.swingDuration = 0.36;
        this.isBlocking = false;
        this.dodgeTimer = 0;

        this.group = new THREE.Group();
        this.group.position.set(0, 0, 3.5);
        this.scene.add(this.group);

        this.buildCharacterMesh();
        this.buildFppWeapon();
        this.bindInputs();
    }

    createJamadaniTex() {
        const c = document.createElement('canvas');
        c.width = 128; c.height = 128;
        const cx = c.getContext('2d');
        cx.fillStyle = '#f8fafc';
        cx.fillRect(0, 0, 128, 128);
        cx.fillStyle = '#0f172a';
        for (let y = 0; y < 128; y += 16) {
            for (let x = 0; x < 128; x += 16) {
                if ((x + y) % 32 === 0) cx.fillRect(x, y, 16, 16);
            }
        }
        const tex = new THREE.CanvasTexture(c);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(3, 3);
        return tex;
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
        return new THREE.CanvasTexture(c);
    }

    buildCharacterMesh() {
        const furMat = new THREE.MeshStandardMaterial({ color: 0x374151, roughness: 0.85 });
        const snoutMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.75 });
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xd97706, emissiveIntensity: 1.5 });
        const shirtMat = new THREE.MeshStandardMaterial({ color: 0x141417, roughness: 0.85 });
        const apronMat = new THREE.MeshStandardMaterial({ color: 0x3b1b0e, roughness: 0.7 });
        const jamadaniMat = new THREE.MeshStandardMaterial({ map: this.createJamadaniTex(), roughness: 0.8 });
        const pantsMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.9 });

        this.bladeMat = window.BakhaShaders.createEmberBladeMaterial(this.createDamascusTex());

        this.pelvis = new THREE.Group();
        this.pelvis.position.set(0, 0.95, 0);
        this.group.add(this.pelvis);

        // Legs
        this.leftLeg = new THREE.Group();
        this.leftLeg.position.set(-0.2, 0, 0);
        const legGeo = new THREE.CylinderGeometry(0.13, 0.09, 0.9, 10);
        const lMesh = new THREE.Mesh(legGeo, pantsMat);
        lMesh.position.y = -0.45;
        lMesh.castShadow = true;
        this.leftLeg.add(lMesh);
        this.pelvis.add(this.leftLeg);

        this.rightLeg = new THREE.Group();
        this.rightLeg.position.set(0.2, 0, 0);
        const rMesh = new THREE.Mesh(legGeo, pantsMat);
        rMesh.position.y = -0.45;
        rMesh.castShadow = true;
        this.rightLeg.add(rMesh);
        this.pelvis.add(this.rightLeg);

        // Tail
        this.tail = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.7, 8), furMat);
        this.tail.position.set(0, -0.1, -0.32);
        this.tail.rotation.x = -0.8;
        this.pelvis.add(this.tail);

        // Torso
        this.torso = new THREE.Group();
        this.torso.position.set(0, 0.1, 0);
        this.pelvis.add(this.torso);

        const chest = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.66, 0.38), shirtMat);
        chest.position.y = 0.35;
        chest.castShadow = true;
        this.torso.add(chest);

        const apron = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.84, 0.08), apronMat);
        apron.position.set(0, 0.18, 0.22);
        apron.castShadow = true;
        this.torso.add(apron);

        // Jamadani Scarf
        const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.085, 8, 20), jamadaniMat);
        scarf.position.set(0, 0.72, 0);
        scarf.rotation.x = Math.PI / 2;
        this.torso.add(scarf);

        // Head
        this.head = new THREE.Group();
        this.head.position.set(0, 0.86, 0.04);
        this.torso.add(this.head);

        const skull = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.38, 0.42), furMat);
        skull.castShadow = true;
        this.head.add(skull);

        const snout = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.36), snoutMat);
        snout.position.set(0, -0.05, 0.3);
        this.head.add(snout);

        const earGeo = new THREE.ConeGeometry(0.1, 0.28, 5);
        const lEar = new THREE.Mesh(earGeo, furMat);
        lEar.position.set(-0.17, 0.26, -0.04);
        lEar.rotation.z = 0.2;
        this.head.add(lEar);

        const rEar = new THREE.Mesh(earGeo, furMat);
        rEar.position.set(0.17, 0.26, -0.04);
        rEar.rotation.z = -0.2;
        this.head.add(rEar);

        const eyeGeo = new THREE.SphereGeometry(0.045, 8, 8);
        const lEye = new THREE.Mesh(eyeGeo, eyeMat);
        lEye.position.set(-0.1, 0.08, 0.21);
        this.head.add(lEye);
        const rEye = new THREE.Mesh(eyeGeo, eyeMat);
        rEye.position.set(0.1, 0.08, 0.21);
        this.head.add(rEye);

        // Left Arm
        this.leftArm = new THREE.Group();
        this.leftArm.position.set(-0.46, 0.58, 0);
        const lArmMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.7, 8), furMat);
        lArmMesh.position.y = -0.32;
        lArmMesh.castShadow = true;
        this.leftArm.add(lArmMesh);
        this.torso.add(this.leftArm);

        // Right Arm + Cleaver
        this.rightArm = new THREE.Group();
        this.rightArm.position.set(0.46, 0.58, 0);
        const rArmMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.7, 8), furMat);
        rArmMesh.position.y = -0.32;
        rArmMesh.castShadow = true;
        this.rightArm.add(rArmMesh);

        this.tppCleaver = this.createCleaverMesh();
        this.tppCleaver.position.set(0, -0.68, 0.14);
        this.tppCleaver.rotation.x = Math.PI / 2;
        this.rightArm.add(this.tppCleaver);
        this.torso.add(this.rightArm);
    }

    createCleaverMesh() {
        const g = new THREE.Group();
        const handle = new THREE.Mesh(
            new THREE.CylinderGeometry(0.035, 0.04, 0.34, 8),
            new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.6 })
        );
        g.add(handle);

        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.62, 0.03), this.bladeMat);
        blade.position.set(0.12, 0.45, 0);
        blade.castShadow = true;
        g.add(blade);
        return g;
    }

    buildFppWeapon() {
        this.fppGroup = new THREE.Group();
        this.fppCleaver = this.createCleaverMesh();
        this.fppCleaver.scale.set(0.65, 0.65, 0.65);
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

        // Movement input
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
            const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
            const dir = new THREE.Vector3();
            dir.addScaledVector(forward, moveZ);
            dir.addScaledVector(right, moveX);
            if (dir.lengthSq() > 0.001) dir.normalize();

            const nextX = this.group.position.x + dir.x * speed * dt;
            const nextZ = this.group.position.z + dir.z * speed * dt;

            // World bounds & obstacle collision
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

        // Character rotation matches yaw
        this.group.rotation.y = this.yaw + Math.PI;

        // Limb animations
        if (isMoving) {
            const freq = isSprinting ? 13 : 8.5;
            this.leftLeg.rotation.x = Math.sin(elapsed * freq) * 0.65;
            this.rightLeg.rotation.x = -Math.sin(elapsed * freq) * 0.65;
            this.leftArm.rotation.x = -Math.sin(elapsed * freq) * 0.45;
            this.pelvis.position.y = 0.95 + Math.abs(Math.sin(elapsed * freq)) * 0.07;
        } else {
            this.leftLeg.rotation.x *= 0.85;
            this.rightLeg.rotation.x *= 0.85;
            this.leftArm.rotation.x *= 0.85;
            this.pelvis.position.y = 0.95 + Math.sin(elapsed * 2.5) * 0.02;
        }
        this.tail.rotation.y = Math.sin(elapsed * 4) * 0.25;

        // Cleaver swing animation
        if (this.isSwinging) {
            this.swingTimer += dt;
            const p = Math.min(1, this.swingTimer / this.swingDuration);
            const arc = Math.sin(p * Math.PI);
            this.rightArm.rotation.x = -0.6 + arc * 2.1;
            this.rightArm.rotation.z = -0.25 - arc * 0.7;

            if (this.fppCleaver) {
                this.fppCleaver.position.set(0.36 - arc * 0.35, -0.32 - arc * 0.08, -0.58 - arc * 0.15);
                this.fppCleaver.rotation.set(-0.25 - arc * 1.15, -0.35 + arc * 1.1, 0.25 + arc * 0.6);
            }
            if (p >= 1) {
                this.isSwinging = false;
            }
        } else {
            this.rightArm.rotation.x = this.isBlocking ? 1.15 : 0.2;
            this.rightArm.rotation.z = this.isBlocking ? 0.55 : -0.1;
            if (this.fppCleaver) {
                const bob = isMoving ? Math.sin(elapsed * 9) * 0.02 : Math.sin(elapsed * 2) * 0.006;
                this.fppCleaver.position.set(0.36, -0.32 + bob, -0.58);
                this.fppCleaver.rotation.set(this.isBlocking ? -0.9 : -0.25, -0.35, this.isBlocking ? 1.1 : 0.25);
            }
        }

        // Camera Positioning (FPP vs TPP)
        const px = this.group.position.x;
        const py = this.group.position.y;
        const pz = this.group.position.z;

        if (this.mode === 'FPP') {
            this.camera.position.set(px, py + 1.72, pz);
            const lookTarget = new THREE.Vector3(
                px + Math.sin(this.yaw) * Math.cos(this.pitch),
                py + 1.72 + Math.sin(this.pitch),
                pz + Math.cos(this.yaw) * Math.cos(this.pitch)
            );
            this.camera.lookAt(lookTarget);
        } else {
            const dist = 4.6;
            const camX = px - Math.sin(this.yaw) * Math.cos(this.pitch) * dist;
            const camY = Math.max(0.7, py + 1.8 - Math.sin(this.pitch) * dist);
            const camZ = pz - Math.cos(this.yaw) * Math.cos(this.pitch) * dist;
            this.camera.position.lerp(new THREE.Vector3(camX, camY, camZ), 0.22);
            this.camera.lookAt(px, py + 1.45, pz);
        }

        return { isMoving, isSprinting };
    }
}

window.BakhaController = BakhaController;
