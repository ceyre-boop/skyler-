// ── Animated smoky background ──────────────────────────────────────────────
(function () {
  const canvas = document.getElementById('smoke-canvas');
  const ctx = canvas.getContext('2d');
  let t = 0;

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  function drawSmoke() {
    const W = canvas.width;
    const H = canvas.height;

    // Dark base
    ctx.fillStyle = '#0b0610';
    ctx.fillRect(0, 0, W, H);

    const s = Math.sin;
    const c = Math.cos;

    // Each wisp: [x, y, radiusX, radiusY, r, g, b, alpha]
    const wisps = [
      // ── Blue left ──
      [W * 0.0  + s(t * 0.3)  * W * 0.07, H * 0.5 + s(t * 0.2)  * H * 0.2,  W * 0.6, H * 0.8,  20,  60, 220, 0.55],
      [W * 0.1  + s(t * 0.22) * W * 0.05, H * 0.3 + c(t * 0.18) * H * 0.15, W * 0.4, H * 0.55, 10,  90, 200, 0.40],
      [W * 0.05 + c(t * 0.17) * W * 0.04, H * 0.75+ s(t * 0.25) * H * 0.12, W * 0.35,H * 0.45, 30, 110, 240, 0.30],
      [W * 0.2  + s(t * 0.28) * W * 0.03, H * 0.55+ c(t * 0.21) * H * 0.08, W * 0.2, H * 0.3,  50, 140, 255, 0.22],

      // ── Red right ──
      [W * 1.0  + s(t * 0.28) * W * 0.07, H * 0.5 + c(t * 0.19) * H * 0.2,  W * 0.6, H * 0.8,  200, 20,  30, 0.55],
      [W * 0.88 + c(t * 0.24) * W * 0.05, H * 0.28+ s(t * 0.22) * H * 0.15, W * 0.42,H * 0.55, 220, 35,  20, 0.42],
      [W * 0.92 + s(t * 0.18) * W * 0.04, H * 0.78+ c(t * 0.2)  * H * 0.12, W * 0.36,H * 0.46, 180, 15,  10, 0.32],
      [W * 0.78 + c(t * 0.32) * W * 0.03, H * 0.48+ s(t * 0.26) * H * 0.08, W * 0.24,H * 0.35, 230, 55,  10, 0.24],

      // ── Purple center blend ──
      [W * 0.5  + s(t * 0.14) * W * 0.04, H * 0.5 + c(t * 0.12) * H * 0.07, W * 0.28,H * 0.55, 100, 15, 120, 0.28],
    ];

    wisps.forEach(([cx, cy, rx, ry, r, g, b, a]) => {
      const rad = Math.max(rx, ry);
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
      grad.addColorStop(0,    `rgba(${r},${g},${b},${a})`);
      grad.addColorStop(0.45, `rgba(${r},${g},${b},${a * 0.5})`);
      grad.addColorStop(0.8,  `rgba(${r},${g},${b},${a * 0.15})`);
      grad.addColorStop(1,    'rgba(0,0,0,0)');

      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(rx / rad, ry / rad);
      ctx.translate(-cx, -cy);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    });

    t += 0.007;
    requestAnimationFrame(drawSmoke);
  }

  drawSmoke();
})();

// ── Stagger in link buttons ────────────────────────────────────────────────
const linkButtons = document.querySelectorAll('.link-btn');

linkButtons.forEach((button, index) => {
  button.style.opacity = '0';
  button.style.transform = 'translateY(8px)';

  window.setTimeout(() => {
    button.style.transition = 'opacity var(--enter-duration) ease, transform var(--enter-duration) ease';
    button.style.opacity = '1';
    button.style.transform = '';
  }, 60 + index * 40);
});

// ── Footer year ────────────────────────────────────────────────────────────
const footerLabel = document.querySelector('.footer small');
if (footerLabel) {
  footerLabel.textContent = `Built by Colin • ${new Date().getFullYear()}`;
}
