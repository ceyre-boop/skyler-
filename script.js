// ── Animated smoky background ──────────────────────────────────────────────
(function () {
  const canvas = document.getElementById('smoke-canvas');
  const ctx = canvas.getContext('2d');
  let t = 0;
  let W, H;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  function blob(cx, cy, rx, ry, r, g, b, alpha) {
    // Elliptical radial gradient for each smoke wisp
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
    grad.addColorStop(0,   `rgba(${r},${g},${b},${alpha})`);
    grad.addColorStop(0.4, `rgba(${r},${g},${b},${alpha * 0.55})`);
    grad.addColorStop(0.75,`rgba(${r},${g},${b},${alpha * 0.15})`);
    grad.addColorStop(1,   'rgba(0,0,0,0)');

    ctx.save();
    // Scale to create ellipse (wider than tall, or vice-versa)
    ctx.translate(cx, cy);
    ctx.scale(rx / Math.max(rx, ry), ry / Math.max(rx, ry));
    ctx.translate(-cx, -cy);

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  function draw() {
    // Deep dark base
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#0b0610';
    ctx.fillRect(0, 0, W, H);

    ctx.globalCompositeOperation = 'lighter';

    const s = Math.sin, c = Math.cos;

    // ── Left side: deep moody blues ────────────────────────────────────────
    blob(
      W * -0.05 + s(t * 0.25) * W * 0.06,
      H * 0.5   + s(t * 0.18) * H * 0.18,
      W * 0.55, H * 0.75,
      12, 28, 160, 0.38
    );
    blob(
      W * 0.12  + s(t * 0.19 + 1) * W * 0.05,
      H * 0.25  + c(t * 0.22)     * H * 0.12,
      W * 0.38, H * 0.50,
      8, 50, 190, 0.28
    );
    blob(
      W * 0.05  + c(t * 0.15 + 2) * W * 0.04,
      H * 0.78  + s(t * 0.21)     * H * 0.10,
      W * 0.32, H * 0.44,
      20, 70, 200, 0.22
    );
    // Accent: electric blue highlight
    blob(
      W * 0.18  + s(t * 0.30) * W * 0.03,
      H * 0.55  + c(t * 0.26) * H * 0.08,
      W * 0.20, H * 0.30,
      30, 100, 220, 0.18
    );

    // ── Right side: deep smoky reds ────────────────────────────────────────
    blob(
      W * 1.05  + s(t * 0.23) * W * 0.06,
      H * 0.5   + c(t * 0.17) * H * 0.18,
      W * 0.55, H * 0.75,
      170, 18, 28, 0.40
    );
    blob(
      W * 0.88  + c(t * 0.20 + 2) * W * 0.05,
      H * 0.28  + s(t * 0.24)     * H * 0.12,
      W * 0.40, H * 0.52,
      200, 30, 20, 0.30
    );
    blob(
      W * 0.92  + s(t * 0.16 + 3) * W * 0.04,
      H * 0.76  + c(t * 0.19)     * H * 0.10,
      W * 0.34, H * 0.45,
      150, 10, 10, 0.25
    );
    // Accent: orange-red ember
    blob(
      W * 0.80  + c(t * 0.28) * W * 0.03,
      H * 0.45  + s(t * 0.24) * H * 0.08,
      W * 0.22, H * 0.32,
      220, 50, 10, 0.18
    );

    // ── Center: where the colours meet, dark purple merge ──────────────────
    blob(
      W * 0.5   + s(t * 0.12) * W * 0.04,
      H * 0.5   + c(t * 0.14) * H * 0.06,
      W * 0.22, H * 0.50,
      80, 10, 100, 0.18
    );

    ctx.globalCompositeOperation = 'source-over';

    t += 0.006;
    requestAnimationFrame(draw);
  }

  draw();
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
