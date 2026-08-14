// 鼠标跟随粒子特效（浅紫色）
// 移动端（触摸设备）自动不启用
(function () {
  if ('ontouchstart' in window) return;

  var canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;top:0;left:0;pointer-events:none;z-index:9999;';
  document.body.appendChild(canvas);

  var ctx = canvas.getContext('2d');
  var W = (canvas.width = window.innerWidth);
  var H = (canvas.height = window.innerHeight);
  var particles = [];
  var mouse = { x: -100, y: -100 };

  window.addEventListener('resize', function () {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  });

  window.addEventListener('mousemove', function (e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    for (var i = 0; i < 2; i++) {
      particles.push({
        x: mouse.x,
        y: mouse.y,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        r: Math.random() * 4 + 2,
        life: 1
      });
    }
  });

  function draw() {
    ctx.clearRect(0, 0, W, H);
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.02;
      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(167, 139, 250, ' + p.life + ')';
      ctx.fill();
    }
    if (particles.length > 300) particles.splice(0, particles.length - 300);
    requestAnimationFrame(draw);
  }
  draw();
})();
