/**
 * Three.js Scene — V2
 * Morphing shapes, mouse physics, aurora colors, energy pulses, shooting stars
 */
(function () {
    const container = document.getElementById('scene-container');
    if (!container || !window.THREE) return;

    // --- Setup ---
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 32;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const isMobile = window.innerWidth < 768;
    const COUNT = isMobile ? 1800 : 5000;
    const R = 11;

    // --- Mouse ---
    const mouse = { x: 0, y: 0, tx: 0, ty: 0, world: new THREE.Vector3() };
    const raycaster = new THREE.Raycaster();
    const mouseNDC = new THREE.Vector2();

    // --- Shape generators ---
    function sphere(i, total) {
        const phi = Math.acos(1 - 2 * (i + 0.5) / total);
        const theta = Math.PI * (1 + Math.sqrt(5)) * i; // golden angle
        return [
            R * Math.sin(phi) * Math.cos(theta),
            R * Math.sin(phi) * Math.sin(theta),
            R * Math.cos(phi)
        ];
    }

    function torus(i, total) {
        const u = (i / total) * Math.PI * 2;
        const v = ((i * 7.13) % total / total) * Math.PI * 2;
        const tubeR = 4;
        const ringR = R - tubeR;
        return [
            (ringR + tubeR * Math.cos(v)) * Math.cos(u),
            (ringR + tubeR * Math.cos(v)) * Math.sin(u),
            tubeR * Math.sin(v)
        ];
    }

    function helix(i, total) {
        const t = (i / total) * Math.PI * 8;
        const strand = i % 2 === 0 ? 1 : -1;
        const helixR = 5;
        const rise = (i / total - 0.5) * R * 2.5;
        return [
            helixR * Math.cos(t) * strand,
            rise,
            helixR * Math.sin(t) * strand
        ];
    }

    // --- Swan shape ---
    // Cubic bezier helper
    function bez(p0, p1, p2, p3, t) {
        const u = 1 - t;
        return [
            u*u*u*p0[0] + 3*u*u*t*p1[0] + 3*u*t*t*p2[0] + t*t*t*p3[0],
            u*u*u*p0[1] + 3*u*u*t*p1[1] + 3*u*t*t*p2[1] + t*t*t*p3[1],
        ];
    }

    // Interpolate along a polyline
    function samplePolyline(pts, t) {
        const total = pts.length - 1;
        const idx = Math.min(Math.floor(t * total), total - 1);
        const frac = t * total - idx;
        return [
            pts[idx][0] + (pts[idx + 1][0] - pts[idx][0]) * frac,
            pts[idx][1] + (pts[idx + 1][1] - pts[idx][1]) * frac,
        ];
    }

    // Build a clean, recognizable swan silhouette (side profile, facing right)
    // Everything in local coords, will be scaled to fit scene
    const swanCache = [];
    (function buildSwan() {
        // Classic swimming swan profile — the S-curved neck is key
        // Coordinate space: x = right, y = up
        // Body is centered around (-1, -2), neck rises to head at top-right

        // === OUTLINE PATHS ===

        // Body underside (front-right to back-left)
        const belly = [
            [3.5, -1.5], [3, -3], [2, -4.2], [0, -5],
            [-2, -5.3], [-4, -5], [-6, -4.2], [-7.5, -3]
        ];

        // Tail (sweeps up from back of body)
        const tail = [
            [-7.5, -3], [-8.5, -1], [-9, 1], [-8.5, 3], [-7.5, 4.5], [-6.5, 5]
        ];

        // Back / wing hump (back to front, top of body)
        const back = [
            [-6.5, 5], [-5, 4], [-3, 2.8], [-1, 2], [1, 1.2], [3, 0.5], [3.5, -0.2]
        ];

        // Neck — S-curve, the signature feature
        // Starts at front-top of body, curves up-right, then back-left, then to head
        const neckPath = [];
        // Using cubic bezier for the beautiful S-curve
        // Lower neck: rises forward from body
        for (let i = 0; i <= 40; i++) {
            const t = i / 40;
            const [x, y] = bez(
                [3.5, -0.2],   // base of neck at body
                [5.5, 2],      // control: pushes forward/up
                [6, 5],        // control: continues forward/up
                [5, 7.5],      // midpoint: neck bends back
                t
            );
            neckPath.push([x, y]);
        }
        // Upper neck: curves back then forward to head
        for (let i = 1; i <= 40; i++) {
            const t = i / 40;
            const [x, y] = bez(
                [5, 7.5],      // midpoint
                [4, 9.5],      // control: curves back
                [3, 11],       // control: approaches head
                [3.2, 12],     // top of head
                t
            );
            neckPath.push([x, y]);
        }

        // Head — small oval at top of neck
        const headCx = 3.2, headCy = 12, headR = 1.0;

        // Beak — points forward-right, slightly downward
        const beakPath = [
            [4.2, 12.3], [5.8, 11.8], [6.2, 11.5], [5.8, 11.2], [4.2, 11.4]
        ];

        // === SAMPLE POINTS ===

        // Heavy outline sampling — this is what makes the shape read
        function samplePath(path, count) {
            for (let i = 0; i < count; i++) {
                const t = i / count;
                const [x, y] = samplePolyline(path, t);
                // Outline particle + tiny z jitter
                swanCache.push([x, y, (Math.random() - 0.5) * 0.3]);
            }
        }

        // Outline (dense — makes the silhouette crisp)
        samplePath(belly, 250);
        samplePath(tail, 200);
        samplePath(back, 200);

        // Neck — extra dense, it's the star
        for (let i = 0; i < 500; i++) {
            const t = i / 500;
            const [x, y] = samplePolyline(neckPath, t);
            // Neck thickness: thicker at base, very thin at top
            const thickness = 0.6 * (1 - t * 0.65);
            const ox = (Math.random() - 0.5) * thickness;
            const oy = (Math.random() - 0.5) * thickness * 0.3;
            swanCache.push([x + ox, y + oy, (Math.random() - 0.5) * thickness]);
        }
        // Neck outline (extra crisp edges)
        for (let i = 0; i < 200; i++) {
            const t = i / 200;
            const [x, y] = samplePolyline(neckPath, t);
            swanCache.push([x, y, (Math.random() - 0.5) * 0.15]);
        }

        // Head
        for (let i = 0; i < 150; i++) {
            const a = (i / 150) * Math.PI * 2;
            const r = Math.random() * headR;
            swanCache.push([
                headCx + Math.cos(a) * r,
                headCy + Math.sin(a) * r * 0.85,
                (Math.random() - 0.5) * 0.4
            ]);
        }
        // Head outline
        for (let i = 0; i < 80; i++) {
            const a = (i / 80) * Math.PI * 2;
            swanCache.push([
                headCx + Math.cos(a) * headR,
                headCy + Math.sin(a) * headR * 0.85,
                0
            ]);
        }

        // Beak
        samplePath(beakPath, 100);
        // Fill beak
        for (let i = 0; i < 60; i++) {
            const t = Math.random();
            const [x, y] = samplePolyline(beakPath, t);
            swanCache.push([x, y + (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.15]);
        }

        // === FILL THE BODY INTERIOR ===
        // Use rejection sampling: generate random points in bounding box,
        // keep those that are inside the body polygon
        const bodyOutline = [...belly, ...tail.slice(1), ...back.slice(1)];

        function pointInPolygon(x, y, poly) {
            let inside = false;
            for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
                const xi = poly[i][0], yi = poly[i][1];
                const xj = poly[j][0], yj = poly[j][1];
                if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) {
                    inside = !inside;
                }
            }
            return inside;
        }

        // Bounding box of body
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const p of bodyOutline) {
            minX = Math.min(minX, p[0]);
            maxX = Math.max(maxX, p[0]);
            minY = Math.min(minY, p[1]);
            maxY = Math.max(maxY, p[1]);
        }

        // Fill body
        let filled = 0;
        const maxAttempts = 20000;
        let attempts = 0;
        while (filled < 2500 && attempts < maxAttempts) {
            attempts++;
            const rx = minX + Math.random() * (maxX - minX);
            const ry = minY + Math.random() * (maxY - minY);
            if (pointInPolygon(rx, ry, bodyOutline)) {
                swanCache.push([rx, ry, (Math.random() - 0.5) * 1.5]);
                filled++;
            }
        }

        // Wing detail — subtle raised feather lines on back
        for (let w = 0; w < 4; w++) {
            const baseY = 1.5 + w * 0.8;
            for (let i = 0; i < 60; i++) {
                const t = i / 60;
                const x = -6 + t * 8;
                const y = baseY - Math.sin(t * Math.PI) * 1.2 - w * 0.3;
                if (pointInPolygon(x, y, bodyOutline)) {
                    swanCache.push([x, y, (Math.random() - 0.5) * 0.5]);
                }
            }
        }
    })();

    function swan(i, total) {
        const idx = i % swanCache.length;
        const pt = swanCache[idx];
        // Deterministic jitter based on index
        const jx = Math.sin(i * 127.1) * 0.08;
        const jy = Math.cos(i * 311.7) * 0.08;
        // Scale to fit scene, center vertically
        const scale = 0.95;
        return [
            pt[0] * scale + jx,
            (pt[1] - 3.5) * scale + jy,  // shift down so swan is centered
            pt[2] * scale
        ];
    }

    // Seeded pseudo-random for deterministic scatter
    function seededRand(seed) {
        const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
        return x - Math.floor(x);
    }

    function scatter(i, total) {
        return [
            (seededRand(i * 3) - 0.5) * R * 3,
            (seededRand(i * 3 + 1) - 0.5) * R * 3,
            (seededRand(i * 3 + 2) - 0.5) * R * 3
        ];
    }

    // Swan appears in the rotation — sphere → swan → torus → helix → scatter → repeat
    const shapes = [sphere, swan, torus, helix, scatter];
    const holdTimes = [4.0, 5.5, 4.0, 4.0, 3.0]; // swan holds longer so people notice
    let currentShape = 0;
    let nextShape = 1;
    let morphProgress = 0;
    const MORPH_SPEED = 0.003;
    let holdTimer = 0;
    let isMorphing = false;

    // --- Particle buffers ---
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(COUNT * 3);
    const targetA = new Float32Array(COUNT * 3); // shape A
    const targetB = new Float32Array(COUNT * 3); // shape B
    const velocities = new Float32Array(COUNT * 3);
    const seeds = new Float32Array(COUNT); // per-particle random seed
    const sizes = new Float32Array(COUNT);

    // Init shape A
    for (let i = 0; i < COUNT; i++) {
        const [x, y, z] = sphere(i, COUNT);
        const i3 = i * 3;
        positions[i3] = targetA[i3] = x;
        positions[i3 + 1] = targetA[i3 + 1] = y;
        positions[i3 + 2] = targetA[i3 + 2] = z;
        const [bx, by, bz] = torus(i, COUNT);
        targetB[i3] = bx;
        targetB[i3 + 1] = by;
        targetB[i3 + 2] = bz;
        velocities[i3] = 0;
        velocities[i3 + 1] = 0;
        velocities[i3 + 2] = 0;
        seeds[i] = Math.random();
        sizes[i] = 1.0 + Math.random() * 2.0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));

    // --- Shaders ---
    const vertexShader = `
        attribute float aSize;
        attribute float aSeed;
        uniform float uTime;
        uniform float uPulse;
        varying vec3 vColor;
        varying float vAlpha;
        varying float vDist;

        // HSL to RGB
        vec3 hsl2rgb(float h, float s, float l) {
            float c = (1.0 - abs(2.0 * l - 1.0)) * s;
            float x = c * (1.0 - abs(mod(h * 6.0, 2.0) - 1.0));
            float m = l - c * 0.5;
            vec3 rgb;
            float hh = h * 6.0;
            if (hh < 1.0) rgb = vec3(c, x, 0.0);
            else if (hh < 2.0) rgb = vec3(x, c, 0.0);
            else if (hh < 3.0) rgb = vec3(0.0, c, x);
            else if (hh < 4.0) rgb = vec3(0.0, x, c);
            else if (hh < 5.0) rgb = vec3(x, 0.0, c);
            else rgb = vec3(c, 0.0, x);
            return rgb + m;
        }

        void main() {
            // Aurora color: shifts based on position + time
            float hue = mod(aSeed * 0.3 + position.y * 0.02 + uTime * 0.08, 1.0);
            // Mostly blue-cyan-violet (0.5–0.85), but ~12% of particles glow BTC orange (0.07–0.09)
            float btcChance = step(0.88, aSeed); // ~12% of particles
            float baseHue = 0.5 + hue * 0.35;
            float btcHue = 0.07 + hue * 0.02; // warm orange range
            hue = mix(baseHue, btcHue, btcChance);
            float sat = mix(0.8, 0.95, btcChance) + sin(uTime + aSeed * 6.28) * 0.15;
            float lit = mix(0.5, 0.55, btcChance) + sin(uTime * 2.0 + aSeed * 12.0) * 0.12;
            vColor = hsl2rgb(hue, sat, lit);

            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            float dist = length(mvPosition.xyz);
            vDist = dist;

            // Depth-based alpha
            vAlpha = smoothstep(60.0, 8.0, dist);

            // Pulse brightening
            float pulseDist = length(position.xyz);
            float pulseWave = smoothstep(0.5, 0.0, abs(pulseDist - uPulse * 20.0));
            vAlpha += pulseWave * 0.5;

            // Size: depth-based + pulse
            float s = aSize * (1.0 + pulseWave * 2.0);
            gl_PointSize = s * (220.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
        }
    `;

    const fragmentShader = `
        varying vec3 vColor;
        varying float vAlpha;
        varying float vDist;
        void main() {
            float d = length(gl_PointCoord - vec2(0.5));
            if (d > 0.5) discard;

            // Soft glow with bright core
            float core = smoothstep(0.15, 0.0, d);
            float glow = smoothstep(0.5, 0.0, d);
            float alpha = (glow * 0.5 + core * 0.5) * vAlpha * 0.85;

            // Brighter core color
            vec3 col = mix(vColor, vec3(1.0), core * 0.4);

            gl_FragColor = vec4(col, alpha);
        }
    `;

    const material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
            uTime: { value: 0 },
            uPulse: { value: 0 },
        },
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    // --- Shooting stars ---
    const STAR_COUNT = 6;
    const starGeom = new THREE.BufferGeometry();
    const starPos = new Float32Array(STAR_COUNT * 6); // line segments (start + end)
    const starCol = new Float32Array(STAR_COUNT * 6);
    starGeom.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeom.setAttribute('color', new THREE.BufferAttribute(starCol, 3));

    const starMat = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    });

    const stars = new THREE.LineSegments(starGeom, starMat);
    scene.add(stars);

    // Star state
    const starData = [];
    for (let i = 0; i < STAR_COUNT; i++) {
        starData.push({
            active: false,
            pos: new THREE.Vector3(),
            vel: new THREE.Vector3(),
            life: 0,
            maxLife: 0,
        });
    }

    function spawnStar() {
        const inactive = starData.find(s => !s.active);
        if (!inactive) return;
        inactive.active = true;
        inactive.life = 0;
        inactive.maxLife = 0.5 + Math.random() * 0.8;
        inactive.isBtc = Math.random() < 0.25; // ~25% are BTC orange

        // Spawn from edge
        const angle = Math.random() * Math.PI * 2;
        const dist = 18 + Math.random() * 8;
        inactive.pos.set(
            Math.cos(angle) * dist,
            (Math.random() - 0.5) * 20,
            (Math.random() - 0.5) * 10
        );

        // Velocity toward center-ish
        const target = new THREE.Vector3(
            (Math.random() - 0.5) * 6,
            (Math.random() - 0.5) * 6,
            (Math.random() - 0.5) * 6
        );
        inactive.vel.copy(target.sub(inactive.pos).normalize().multiplyScalar(25 + Math.random() * 20));
    }

    // --- Energy pulse state ---
    let pulseTimer = 0;
    let pulseActive = 0;

    // --- Scroll ---
    let scrollY = 0;
    window.addEventListener('scroll', () => { scrollY = window.pageYOffset; }, { passive: true });

    // --- Main loop ---
    let time = 0;
    let dt = 0;
    let lastFrame = performance.now();

    function animate(now) {
        requestAnimationFrame(animate);
        dt = Math.min((now - lastFrame) / 1000, 0.05);
        lastFrame = now;
        time += dt;

        // Smooth mouse
        mouse.x += (mouse.tx - mouse.x) * 0.06;
        mouse.y += (mouse.ty - mouse.y) * 0.06;

        // Project mouse into 3D world
        mouseNDC.set(mouse.x, mouse.y);
        raycaster.setFromCamera(mouseNDC, camera);
        const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
        raycaster.ray.intersectPlane(plane, mouse.world);

        // --- Morphing ---
        holdTimer += dt;
        if (!isMorphing && holdTimer > holdTimes[currentShape]) {
            isMorphing = true;
            morphProgress = 0;
            nextShape = (currentShape + 1) % shapes.length;
            // Compute targetB
            for (let i = 0; i < COUNT; i++) {
                const [x, y, z] = shapes[nextShape](i, COUNT);
                const i3 = i * 3;
                targetB[i3] = x;
                targetB[i3 + 1] = y;
                targetB[i3 + 2] = z;
            }
        }

        if (isMorphing) {
            // Slower morph into swan for dramatic reveal
            const morphRate = (nextShape === 1) ? MORPH_SPEED + dt * 0.18 : MORPH_SPEED + dt * 0.3;
            morphProgress += morphRate;
            if (morphProgress >= 1) {
                morphProgress = 1;
                isMorphing = false;
                holdTimer = 0;
                currentShape = nextShape;
                // Copy B into A
                targetA.set(targetB);
            }
        }

        // Eased morph factor
        const t = isMorphing ? morphProgress * morphProgress * (3 - 2 * morphProgress) : 0; // smoothstep

        // --- Update particles ---
        const pos = geometry.attributes.position.array;
        for (let i = 0; i < COUNT; i++) {
            const i3 = i * 3;
            const seed = seeds[i];

            // Target position (lerp between shapes)
            let tx = targetA[i3] + (targetB[i3] - targetA[i3]) * t;
            let ty = targetA[i3 + 1] + (targetB[i3 + 1] - targetA[i3 + 1]) * t;
            let tz = targetA[i3 + 2] + (targetB[i3 + 2] - targetA[i3 + 2]) * t;

            // Add organic wobble
            const wobbleStr = 0.4;
            tx += Math.sin(time * 0.7 + seed * 50) * wobbleStr;
            ty += Math.cos(time * 0.6 + seed * 60) * wobbleStr;
            tz += Math.sin(time * 0.8 + seed * 70) * wobbleStr;

            // Mouse repulsion
            if (mouse.world.x !== 0 || mouse.world.y !== 0) {
                const dx = pos[i3] - mouse.world.x;
                const dy = pos[i3 + 1] - mouse.world.y;
                const dz = pos[i3 + 2] - mouse.world.z;
                const distSq = dx * dx + dy * dy + dz * dz;
                const mouseRadius = 8;
                if (distSq < mouseRadius * mouseRadius && distSq > 0.01) {
                    const dist = Math.sqrt(distSq);
                    const force = (mouseRadius - dist) / mouseRadius;
                    const pushStr = 6.0 * force * force;
                    velocities[i3] += (dx / dist) * pushStr * dt;
                    velocities[i3 + 1] += (dy / dist) * pushStr * dt;
                    velocities[i3 + 2] += (dz / dist) * pushStr * dt;
                }
            }

            // Spring toward target + velocity
            const spring = 2.0;
            const damping = 0.92;

            velocities[i3] += (tx - pos[i3]) * spring * dt;
            velocities[i3 + 1] += (ty - pos[i3 + 1]) * spring * dt;
            velocities[i3 + 2] += (tz - pos[i3 + 2]) * spring * dt;

            velocities[i3] *= damping;
            velocities[i3 + 1] *= damping;
            velocities[i3 + 2] *= damping;

            pos[i3] += velocities[i3];
            pos[i3 + 1] += velocities[i3 + 1];
            pos[i3 + 2] += velocities[i3 + 2];
        }
        geometry.attributes.position.needsUpdate = true;

        // --- Rotation (nearly frozen during swan so the silhouette reads) ---
        const swanFactor = (currentShape === 1 && !isMorphing) ? 1.0
            : (nextShape === 1 && isMorphing) ? morphProgress
            : (currentShape === 1 && isMorphing) ? (1.0 - morphProgress)
            : 0;
        const rotSpeed = 0.12 * (1 - swanFactor * 0.95);
        const mouseInf = 0.4 * (1 - swanFactor * 0.85);
        const wobble = 0.2 * (1 - swanFactor * 0.9);
        points.rotation.y = time * rotSpeed + mouse.x * mouseInf;
        points.rotation.x = Math.sin(time * 0.08) * wobble + mouse.y * mouseInf * 0.6;

        // --- Energy pulse ---
        pulseTimer += dt;
        if (pulseTimer > 3.5) { // pulse every 3.5s
            pulseTimer = 0;
            pulseActive = 0;
        }
        pulseActive += dt * 0.8;
        material.uniforms.uPulse.value = pulseActive;
        material.uniforms.uTime.value = time;

        // --- Shooting stars ---
        if (Math.random() < 0.02) spawnStar(); // ~1.2 per second

        for (let i = 0; i < STAR_COUNT; i++) {
            const s = starData[i];
            const i6 = i * 6;
            if (!s.active) {
                // Zero out
                for (let j = 0; j < 6; j++) starPos[i6 + j] = 0;
                for (let j = 0; j < 6; j++) starCol[i6 + j] = 0;
                continue;
            }

            s.life += dt;
            if (s.life > s.maxLife) {
                s.active = false;
                continue;
            }

            const tail = s.pos.clone();
            s.pos.add(s.vel.clone().multiplyScalar(dt));
            const head = s.pos;

            // Trail: head to a point slightly behind
            const trailLen = 2.5;
            const dir = s.vel.clone().normalize().multiplyScalar(-trailLen);
            const tailPt = head.clone().add(dir);

            starPos[i6] = head.x;
            starPos[i6 + 1] = head.y;
            starPos[i6 + 2] = head.z;
            starPos[i6 + 3] = tailPt.x;
            starPos[i6 + 4] = tailPt.y;
            starPos[i6 + 5] = tailPt.z;

            const alpha = 1 - s.life / s.maxLife;
            if (s.isBtc) {
                // BTC orange streak
                starCol[i6] = 0.97 * alpha;
                starCol[i6 + 1] = 0.57 * alpha;
                starCol[i6 + 2] = 0.1 * alpha;
                starCol[i6 + 3] = 0.6 * alpha;
                starCol[i6 + 4] = 0.3 * alpha;
                starCol[i6 + 5] = 0.02;
            } else {
                // Cyan to white
                starCol[i6] = 0.3 + alpha * 0.7;
                starCol[i6 + 1] = 0.9 * alpha;
                starCol[i6 + 2] = alpha;
                starCol[i6 + 3] = 0.1;
                starCol[i6 + 4] = 0.3 * alpha;
                starCol[i6 + 5] = 0.5 * alpha;
            }
        }
        starGeom.attributes.position.needsUpdate = true;
        starGeom.attributes.color.needsUpdate = true;

        // --- Camera ---
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        const scrollP = maxScroll > 0 ? scrollY / maxScroll : 0;
        camera.position.y = -scrollP * 15;
        camera.position.z = 32 + scrollP * 8;
        camera.lookAt(0, camera.position.y * 0.4, 0);

        renderer.render(scene, camera);
    }

    // --- Events ---
    window.addEventListener('mousemove', (e) => {
        mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.ty = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    window.addEventListener('touchmove', (e) => {
        if (e.touches.length > 0) {
            mouse.tx = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
            mouse.ty = -(e.touches[0].clientY / window.innerHeight) * 2 + 1;
        }
    }, { passive: true });

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    animate(performance.now());
})();
