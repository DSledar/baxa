// Custom GLSL Shaders for Barzan Night Sky, Glowing Cleaver Edge, and Blood Rage Aura
window.BakhaShaders = {
    createSkyDome: function () {
        const skyGeo = new THREE.SphereGeometry(95, 32, 24);
        const skyMat = new THREE.ShaderMaterial({
            side: THREE.BackSide,
            depthWrite: false,
            uniforms: {
                uTime: { value: 0 },
                uTopColor: { value: new THREE.Color(0x040712) },
                uHorizonColor: { value: new THREE.Color(0x28110b) },
                uMoonDir: { value: new THREE.Vector3(0.4, 0.55, -0.7).normalize() }
            },
            vertexShader: `
                varying vec3 vWorldPos;
                void main() {
                    vec4 wp = modelMatrix * vec4(position, 1.0);
                    vWorldPos = wp.xyz;
                    gl_Position = projectionMatrix * viewMatrix * wp;
                }
            `,
            fragmentShader: `
                uniform float uTime;
                uniform vec3 uTopColor;
                uniform vec3 uHorizonColor;
                uniform vec3 uMoonDir;
                varying vec3 vWorldPos;

                float hash(vec2 p) {
                    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
                }

                void main() {
                    vec3 dir = normalize(vWorldPos);
                    float h = clamp(dir.y, 0.0, 1.0);
                    vec3 col = mix(uHorizonColor, uTopColor, pow(h, 0.55));

                    // Moonlight halo
                    float moonDot = max(dot(dir, uMoonDir), 0.0);
                    col += vec3(0.85, 0.72, 0.55) * pow(moonDot, 180.0) * 1.4;
                    col += vec3(0.35, 0.22, 0.15) * pow(moonDot, 12.0) * 0.45;

                    // Twinkling stars
                    vec2 starUV = floor(dir.xz / (dir.y + 0.15) * 42.0);
                    float s = hash(starUV);
                    if (s > 0.992 && dir.y > 0.08) {
                        float twinkle = 0.5 + 0.5 * sin(uTime * 3.0 + s * 100.0);
                        col += vec3(1.0, 0.95, 0.85) * twinkle * smoothstep(0.08, 0.4, dir.y);
                    }

                    gl_FragColor = vec4(col, 1.0);
                }
            `
        });
        return new THREE.Mesh(skyGeo, skyMat);
    },

    createEmberBladeMaterial: function (baseTexture) {
        return new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uRage: { value: 0 },
                uMap: { value: baseTexture }
            },
            vertexShader: `
                varying vec2 vUv;
                varying vec3 vNormal;
                void main() {
                    vUv = uv;
                    vNormal = normalize(normalMatrix * normal);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float uTime;
                uniform float uRage;
                uniform sampler2D uMap;
                varying vec2 vUv;
                varying vec3 vNormal;

                void main() {
                    vec3 tex = texture2D(uMap, vUv).rgb;
                    float rim = pow(1.0 - abs(vNormal.z), 2.5);
                    float pulse = 0.6 + 0.4 * sin(uTime * 5.0 + vUv.y * 8.0);
                    vec3 ember = mix(vec3(0.95, 0.55, 0.08), vec3(1.0, 0.15, 0.15), uRage);
                    vec3 finalCol = tex * 0.85 + ember * rim * (0.45 + uRage * 1.1) * pulse;
                    gl_FragColor = vec4(finalCol, 1.0);
                }
            `
        });
    }
};
