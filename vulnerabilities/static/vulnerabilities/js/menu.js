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

const cx = () => W / 2;
const cy = () => H / 2;

const stars = Array.from({ length: 400 }, () => ({
    x: Math.random() * 2000 - 500,
    y: Math.random() * 2000 - 500,
    r: Math.pow(Math.random(), 3) * 1.5 + 0.2,
    twinkle: Math.random() * Math.PI * 2,
    speed: 0.005 + Math.random() * 0.015,
}));

const rings = Array.from({ length: 18 }, (_, i) => ({
    radius: 72 + i * 28,
    tilt: 0.22 + i * 0.016,
    speed: 0.0018 - i * 0.00006,
    alpha: 0.035 + (1 - i / 18) * 0.09,
    warpAmp: 8 - i * 0.3,
    warpFreq: 3 + (i % 3),
    lineWidth: 1 + (1 - i / 18) * 2.5,
}));

const particles = Array.from({ length: 700 }, (_, i) => {
    const layer = i % 18;
    return {
        angle: Math.random() * Math.PI * 2,
        r: 72 + layer * 28 + (Math.random() - 0.5) * 20,
        tilt: 0.22 + layer * 0.016,
        speed: (0.004 - layer * 0.0001) * (Math.random() > 0.5 ? 1 : -1),
        size: 0.4 + Math.random() * 1.6,
        brightness: 0.2 + Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2,
    };
});

const photons = Array.from({ length: 200 }, (_, i) => ({
    angle: (i / 200) * Math.PI * 2,
    r: 55 + Math.random() * 10,
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
    const ox = cx() + px;
    const oy = cy() + py;
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
    ctx.translate(cx() + px, cy() + py);

    particles.forEach(p => {
        p.angle += p.speed;
        const r = p.r * zoom;
        const x = Math.cos(p.angle) * r;
        const y = Math.sin(p.angle) * r * p.tilt;
        const flicker = 0.5 + 0.5 * Math.sin(p.phase + t * 0.003);
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${p.brightness * flicker * 0.45})`;
        ctx.fill();
    });

    ctx.restore();
}

function drawPhotonRing(t, zoom) {
    const px = mouseX * 8;
    const py = mouseY * 4;
    ctx.save();
    ctx.translate(cx() + px, cy() + py);

    photons.forEach(p => {
        p.angle += p.speed;
        const r = p.r * zoom;
        const x = Math.cos(p.angle) * r;
        const y = Math.sin(p.angle) * r * 0.28;
        const flicker = 0.4 + 0.6 * Math.sin(p.phase + t * 0.008);
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${p.alpha * flicker})`;
        ctx.fill();
    });

    for (let pass = 0; pass < 4; pass++) {
        const w = [8, 4, 2, 1][pass];
        const a = [0.08, 0.15, 0.3, 0.6][pass];
        const r = 58 * zoom;
        ctx.beginPath();
        ctx.ellipse(0, 0, r + pass, (r + pass) * 0.28, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,255,255,${a})`;
        ctx.lineWidth = w;
        ctx.stroke();
    }

    ctx.restore();
}

function drawBlackHole(zoom) {
    const px = mouseX * 8;
    const py = mouseY * 4;
    const ox = cx() + px;
    const oy = cy() + py;
    const r = 56 * zoom;

    const halo = ctx.createRadialGradient(ox, oy, r * 0.3, ox, oy, r * 3.5);
    halo.addColorStop(0, "rgba(0,0,0,1)");
    halo.addColorStop(0.6, "rgba(0,0,0,0.92)");
    halo.addColorStop(0.8, "rgba(0,0,0,0.5)");
    halo.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(ox, oy, r * 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(ox, oy, r, 0, Math.PI * 2);
    ctx.fillStyle = "#000";
    ctx.fill();
}

function drawLensingGlow(zoom) {
    const px = mouseX * 8;
    const py = mouseY * 4;
    const ox = cx() + px;
    const oy = cy() + py;

    const ag = ctx.createRadialGradient(ox, oy, 0, ox, oy, 400 * zoom);
    ag.addColorStop(0, "rgba(0,0,0,0)");
    ag.addColorStop(0.25, "rgba(255,255,255,0.02)");
    ag.addColorStop(0.5, "rgba(255,255,255,0.04)");
    ag.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = ag;
    ctx.fillRect(0, 0, W, H);
}

function animate(t) {
    mouseX += (targetMX - mouseX) * 0.01;
    mouseY += (targetMY - mouseY) * 0.01;

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