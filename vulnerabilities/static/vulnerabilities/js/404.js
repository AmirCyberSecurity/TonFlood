const canvas = document.getElementById("bg");
const ctx = canvas.getContext("2d");

let W, H;

function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
}
resize();
window.addEventListener("resize", resize);

let mouseX = 0, mouseY = 0;
let targetMX = 0, targetMY = 0;
window.addEventListener("mousemove", e => {
    targetMX = (e.clientX / W - 0.5) * 2;
    targetMY = (e.clientY / H - 0.5) * 2;
});

let scrollDepth = 0;
window.addEventListener("scroll", () => {
    scrollDepth = Math.min(window.scrollY / (document.body.scrollHeight - H), 1);
});

const bhOffsetX = () => W * 0.75;
const bhOffsetY = () => H * 0.48;

const stars = Array.from({ length: 400 }, () => ({
    x: Math.random() * 2000 - 500,
    y: Math.random() * 2000 - 500,
    r: Math.pow(Math.random(), 3) * 1.5 + 0.2,
    twinkle: Math.random() * Math.PI * 2,
    speed: 0.005 + Math.random() * 0.015,
}));

const rings = Array.from({ length: 18 }, (_, i) => ({
    radius: 95 + i * 34,
    tilt: 0.18 + i * 0.014,
    speed: 0.0018 - i * 0.00006,
    alpha: 0.04 + (1 - i / 18) * 0.11,
    warpAmp: 10 - i * 0.4,
    warpFreq: 3 + (i % 3),
    lineWidth: 1.2 + (1 - i / 18) * 3,
    perspShift: -0.15 + i * 0.008,
}));

const particles = Array.from({ length: 700 }, (_, i) => {
    const layer = i % 18;
    return {
        angle: Math.random() * Math.PI * 2,
        r: 95 + layer * 34 + (Math.random() - 0.5) * 25,
        tilt: 0.18 + layer * 0.014,
        speed: (0.004 - layer * 0.0001) * (Math.random() > 0.5 ? 1 : -1),
        size: 0.4 + Math.random() * 1.8,
        brightness: 0.2 + Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2,
    };
});

const photons = Array.from({ length: 200 }, (_, i) => ({
    angle: (i / 200) * Math.PI * 2,
    r: 70 + Math.random() * 12,
    speed: 0.006 + Math.random() * 0.004,
    alpha: 0.5 + Math.random() * 0.5,
    phase: Math.random() * Math.PI * 2,
}));

const jetParticles = Array.from({ length: 80 }, () => ({
    t: Math.random(),
    spread: (Math.random() - 0.5) * 18,
    speed: 0.004 + Math.random() * 0.006,
    alpha: 0.3 + Math.random() * 0.5,
    side: Math.random() > 0.5 ? 1 : -1,
}));

function drawStars(t) {
    const px = mouseX * 15;
    const py = mouseY * 8;
    stars.forEach(s => {
        const tw = 0.5 + 0.5 * Math.sin(s.twinkle + t * s.speed);
        ctx.beginPath();
        ctx.arc(s.x + px * (s.r / 2), s.y + py * (s.r / 2), s.r * tw, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${0.15 + 0.35 * tw * s.r})`;
        ctx.fill();
    });
}

function drawJets(t, zoom) {
    const px = mouseX * 6;
    const py = mouseY * 3;
    const ox = bhOffsetX() + px;
    const oy = bhOffsetY() + py;
    const maxLen = Math.max(H * 0.55, 280) * zoom;

    jetParticles.forEach(p => {
        p.t += p.speed;
        if (p.t > 1) p.t = 0;
        const dist = p.t * maxLen;
        const x = ox + p.spread * (1 + p.t * 2);
        const y = oy - dist * p.side;
        const a = p.alpha * (1 - p.t) * (0.3 + 0.7 * (1 - p.t));
        ctx.beginPath();
        ctx.arc(x, y, 1.2 * (1 - p.t * 0.5), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${a * 0.5})`;
        ctx.fill();
    });

    for (let side of [-1, 1]) {
        for (let pass = 0; pass < 3; pass++) {
            const w = [20, 8, 2][pass];
            const a = [0.04, 0.08, 0.2][pass];
            const jg = ctx.createLinearGradient(ox, oy, ox, oy - maxLen * side);
            jg.addColorStop(0, `rgba(255,255,255,${a})`);
            jg.addColorStop(0.4, `rgba(200,200,200,${a * 0.5})`);
            jg.addColorStop(1, `rgba(150,150,150,0)`);
            ctx.beginPath();
            ctx.moveTo(ox - w / 2, oy);
            ctx.quadraticCurveTo(
                ox + Math.sin(t * 0.0006) * 12,
                oy - (maxLen / 2) * side,
                ox, oy - maxLen * side
            );
            ctx.strokeStyle = jg;
            ctx.lineWidth = w;
            ctx.stroke();
        }
    }
}

function drawGasParticles(t, zoom) {
    const px = mouseX * 10;
    const py = mouseY * 5;
    ctx.save();
    ctx.translate(bhOffsetX() + px, bhOffsetY() + py);
    ctx.transform(1, -0.08, 0.18, 1, 0, 0);

    particles.forEach(p => {
        p.angle += p.speed;
        const r = p.r * zoom;
        const x = Math.cos(p.angle) * r;
        const y = Math.sin(p.angle) * r * p.tilt;
        const flicker = 0.5 + 0.5 * Math.sin(p.phase + t * 0.003);
        const depthFactor = 0.6 + 0.4 * (Math.sin(p.angle) * 0.5 + 0.5);
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${p.brightness * flicker * depthFactor * 0.5})`;
        ctx.fill();
    });

    ctx.restore();
}

function drawPhotonRing(t, zoom) {
    const px = mouseX * 8;
    const py = mouseY * 4;
    ctx.save();
    ctx.translate(bhOffsetX() + px, bhOffsetY() + py);
    ctx.transform(1, -0.08, 0.18, 1, 0, 0);

    photons.forEach(p => {
        p.angle += p.speed;
        const r = p.r * zoom;
        const x = Math.cos(p.angle) * r;
        const y = Math.sin(p.angle) * r * 0.26;
        const flicker = 0.4 + 0.6 * Math.sin(p.phase + t * 0.008);
        const depth = 0.5 + 0.5 * Math.sin(p.angle + Math.PI * 0.5);
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${p.alpha * flicker * (0.4 + 0.6 * depth)})`;
        ctx.fill();
    });

    for (let pass = 0; pass < 4; pass++) {
        const w = [10, 5, 2.5, 1][pass];
        const a = [0.07, 0.14, 0.28, 0.55][pass];
        const r = 72 * zoom;
        ctx.beginPath();
        ctx.ellipse(0, 0, r + pass * 2, (r + pass * 2) * 0.26, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,255,255,${a})`;
        ctx.lineWidth = w;
        ctx.stroke();
    }

    ctx.restore();
}

function drawBlackHole(zoom) {
    const px = mouseX * 8;
    const py = mouseY * 4;
    const ox = bhOffsetX() + px;
    const oy = bhOffsetY() + py;
    const r = 56 * zoom;

    // Outer lensing glow
    const outerGlow = ctx.createRadialGradient(ox, oy, r * 0.8, ox, oy, r * 5);
    outerGlow.addColorStop(0, "rgba(255,255,255,0.12)");
    outerGlow.addColorStop(0.2, "rgba(200,200,200,0.06)");
    outerGlow.addColorStop(0.5, "rgba(100,100,100,0.02)");
    outerGlow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = outerGlow;
    ctx.beginPath();
    ctx.arc(ox, oy, r * 5, 0, Math.PI * 2);
    ctx.fill();

    // Dark halo
    const halo = ctx.createRadialGradient(ox, oy, r * 0.4, ox, oy, r * 3.8);
    halo.addColorStop(0, "rgba(0,0,0,1)");
    halo.addColorStop(0.55, "rgba(0,0,0,0.96)");
    halo.addColorStop(0.75, "rgba(0,0,0,0.55)");
    halo.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(ox, oy, r * 3.8, 0, Math.PI * 2);
    ctx.fill();

    // Event horizon
    ctx.beginPath();
    ctx.arc(ox, oy, r, 0, Math.PI * 2);
    ctx.fillStyle = "#000";
    ctx.fill();

}

function drawLensingGlow(zoom) {
    const px = mouseX * 8;
    const py = mouseY * 4;
    const ox = bhOffsetX() + px;
    const oy = bhOffsetY() + py;

    const ag = ctx.createRadialGradient(ox, oy, 0, ox, oy, 500 * zoom);
    ag.addColorStop(0, "rgba(0,0,0,0)");
    ag.addColorStop(0.2, "rgba(255,255,255,0.025)");
    ag.addColorStop(0.45, "rgba(255,255,255,0.05)");
    ag.addColorStop(0.7, "rgba(255,255,255,0.015)");
    ag.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = ag;
    ctx.fillRect(0, 0, W, H);
}

function animate(t) {
    mouseX += (targetMX - mouseX) * 0.04;
    mouseY += (targetMY - mouseY) * 0.04;

    const zoom = 1 + scrollDepth * 0.35;

    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.fillRect(0, 0, W, H);

    drawStars(t);
    drawLensingGlow(zoom);
    drawJets(t, zoom);
    drawGasParticles(t, zoom);
    drawPhotonRing(t, zoom);
    drawBlackHole(zoom);

    requestAnimationFrame(animate);
}

animate(0);