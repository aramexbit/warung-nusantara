// Warung Nusantara's painter: every pixel of the night market, drawn on one canvas.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to the window.
// Nothing here knows the rules: it only reads the world's state and paints it.

import {
  CHEF, COOK, DISHES, FIELD, LANE_BACK, PALETTE, FONT, SHIFT_SECONDS, STARS,
} from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, align = 'center', weight = '700') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

/** One small food icon, drawn with shapes (no images, no network). */
function drawItemIcon(ctx, item, x, y, s) {
  const u = s / 24;
  ctx.save();
  ctx.translate(x, y);
  if (item === 'nasi') {
    ctx.fillStyle = '#f5f0e1';
    ctx.beginPath();
    ctx.arc(0, 2 * u, 9 * u, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#fff';
    for (let i = -2; i <= 2; i += 1) { ctx.beginPath(); ctx.arc(i * 3.4 * u, -1 * u, 1.6 * u, 0, Math.PI * 2); ctx.fill(); }
  } else if (item === 'mie') {
    ctx.strokeStyle = '#f2c94c';
    ctx.lineWidth = 2.4 * u;
    ctx.lineCap = 'round';
    for (let i = -1; i <= 1; i += 1) {
      ctx.beginPath();
      ctx.moveTo(-8 * u, i * 5 * u);
      ctx.bezierCurveTo(-3 * u, i * 5 * u - 4 * u, 3 * u, i * 5 * u + 4 * u, 8 * u, i * 5 * u);
      ctx.stroke();
    }
  } else if (item === 'ayam') {
    ctx.fillStyle = '#e8907c';
    ctx.beginPath(); ctx.arc(-2 * u, -1 * u, 6.5 * u, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#f5f0e1'; ctx.lineWidth = 2.6 * u;
    ctx.beginPath(); ctx.moveTo(3 * u, 4 * u); ctx.lineTo(8 * u, 9 * u); ctx.stroke();
    ctx.fillStyle = '#f5f0e1';
    ctx.beginPath(); ctx.arc(9 * u, 10 * u, 2.4 * u, 0, Math.PI * 2); ctx.fill();
  } else if (item === 'telur') {
    ctx.fillStyle = '#fdf3d0';
    ctx.beginPath(); ctx.ellipse(0, 0, 9 * u, 7 * u, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f2a93b';
    ctx.beginPath(); ctx.arc(0, 0, 3.6 * u, 0, Math.PI * 2); ctx.fill();
  } else if (item === 'sayur') {
    ctx.fillStyle = '#5da864';
    for (const [dx, dy, r] of [[-5, 2, 5], [0, -4, 6], [5, 2, 5]]) {
      ctx.beginPath(); ctx.ellipse(dx * u, dy * u, r * u, r * 0.6 * u, 0.6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = '#3f7d46'; ctx.lineWidth = 1.6 * u;
    ctx.beginPath(); ctx.moveTo(0, 8 * u); ctx.lineTo(0, -2 * u); ctx.stroke();
  } else if (item === 'bumbu') {
    ctx.fillStyle = '#e5534b';
    ctx.beginPath();
    ctx.moveTo(-8 * u, 2 * u);
    ctx.quadraticCurveTo(0, -8 * u, 8 * u, 3 * u);
    ctx.quadraticCurveTo(0, -2 * u, -8 * u, 2 * u);
    ctx.fill();
    ctx.fillStyle = '#7dc383';
    ctx.beginPath(); ctx.arc(7 * u, 0, 2.2 * u, 0, Math.PI * 2); ctx.fill();
  } else if (item === 'nasi-goreng' || item === 'mie-goreng') {
    ctx.fillStyle = '#8a5a2b';
    ctx.beginPath(); ctx.arc(0, 3 * u, 9 * u, Math.PI, 0); ctx.fill();
    ctx.fillStyle = item === 'nasi-goreng' ? '#d99a4e' : '#e8b23a';
    ctx.beginPath(); ctx.arc(0, 1 * u, 7.5 * u, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#7dc383';
    ctx.fillRect(-5 * u, -3 * u, 3 * u, 1.6 * u);
    ctx.fillRect(2 * u, -4 * u, 3 * u, 1.6 * u);
  } else if (item === 'ayam-cincang') {
    ctx.fillStyle = '#e8907c';
    for (const [dx, dy] of [[-5, -3], [4, -4], [-1, 4], [5, 3]]) {
      ctx.fillRect(dx * u - 3 * u, dy * u - 3 * u, 6 * u, 6 * u);
    }
  } else if (item === 'sate') {
    ctx.strokeStyle = '#d9b380'; ctx.lineWidth = 2 * u;
    ctx.beginPath(); ctx.moveTo(-9 * u, -7 * u); ctx.lineTo(9 * u, 7 * u); ctx.stroke();
    ctx.fillStyle = '#b06a35';
    for (const t of [-4, 0, 4]) {
      ctx.beginPath(); ctx.arc(t * u, -t * u, 3.6 * u, 0, Math.PI * 2); ctx.fill();
    }
  } else if (item === 'sayur-cincang') {
    ctx.fillStyle = '#7dc383';
    for (const [dx, dy] of [[-5, -3], [3, -5], [-2, 3], [5, 2]]) {
      ctx.beginPath(); ctx.ellipse(dx * u, dy * u, 4 * u, 2.4 * u, 0.5, 0, Math.PI * 2); ctx.fill();
    }
  } else if (item === 'telur-iris') {
    ctx.fillStyle = '#fdf3d0';
    ctx.beginPath(); ctx.ellipse(-3 * u, 0, 6 * u, 4.6 * u, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(4 * u, -1 * u, 6 * u, 4.6 * u, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f2a93b';
    ctx.beginPath(); ctx.arc(-3 * u, 0, 2 * u, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(4 * u, -1 * u, 2 * u, 0, Math.PI * 2); ctx.fill();
  } else if (item === 'gosong') {
    ctx.fillStyle = '#2b2320';
    ctx.beginPath(); ctx.arc(0, 0, 8 * u, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#8b93a3'; ctx.lineWidth = 1.6 * u;
    ctx.beginPath(); ctx.moveTo(-3 * u, -8 * u); ctx.quadraticCurveTo(-5 * u, -12 * u, -2 * u, -14 * u); ctx.stroke();
  }
  ctx.restore();
}

/** A bowl holding the finished dish, for tickets and plates. */
function drawDishBowl(ctx, dishId, x, y, s) {
  const u = s / 24;
  const needs = DISHES[dishId].needs;
  drawItemIcon(ctx, needs[0], x, y - 3 * u, s * 0.8);
  drawItemIcon(ctx, needs[1], x + 5 * u, y - 1 * u, s * 0.6);
  ctx.fillStyle = '#3f6fb5';
  ctx.beginPath(); ctx.arc(x, y + 5 * u, 10 * u, 0, Math.PI); ctx.fill();
  ctx.fillRect(x - 10 * u, y + 5 * u, 20 * u, 2 * u);
}

function drawCustomer(ctx, order, x, y, now) {
  const c = order.customer;
  const impatient = order.patience < 15;
  const bob = Math.sin(now * 2 + order.slot) * (impatient ? 3 : 1.5);
  ctx.save();
  ctx.translate(x, y + bob);
  // body
  ctx.fillStyle = c.shirt;
  rr(ctx, -16, -6, 32, 30, 8);
  ctx.fill();
  // arms
  ctx.fillStyle = c.skin;
  ctx.fillRect(-22, -2, 7, 18);
  ctx.fillRect(15, -2, 7, 18);
  // head
  ctx.fillStyle = c.skin;
  ctx.beginPath(); ctx.arc(0, -20, 13, 0, Math.PI * 2); ctx.fill();
  // hat
  if (c.hat === 'cap') {
    ctx.fillStyle = '#e5534b';
    ctx.beginPath(); ctx.arc(0, -23, 12, Math.PI, 0); ctx.fill();
    ctx.fillRect(0, -25, 16, 4);
  } else if (c.hat === 'songkok') {
    ctx.fillStyle = '#2b2118';
    ctx.beginPath(); ctx.arc(0, -24, 11, Math.PI, 0); ctx.fill();
    ctx.fillRect(-11, -26, 22, 5);
  } else if (c.hat === 'bandana') {
    ctx.fillStyle = '#f2c94c';
    ctx.beginPath(); ctx.arc(0, -23, 12.5, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
  } else {
    ctx.fillStyle = '#2b2118';
    ctx.beginPath(); ctx.arc(0, -24, 12, Math.PI, 0); ctx.fill();
  }
  // eyes + mouth
  ctx.fillStyle = '#2b2118';
  ctx.beginPath(); ctx.arc(-4.5, -20, 1.6, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(4.5, -20, 1.6, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#2b2118';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  if (impatient) { ctx.moveTo(-4, -13); ctx.lineTo(4, -13); }
  else { ctx.arc(0, -15, 4, 0.15 * Math.PI, 0.85 * Math.PI); }
  ctx.stroke();
  if (impatient) text(ctx, '!', 20, -34, 20, '#e5534b');
  ctx.restore();
}

function drawTicket(ctx, order, x, y, w, h, now) {
  const frac = Math.max(0, order.patience / order.maxPatience);
  const urgent = frac < 0.27;
  const shake = urgent ? Math.sin(now * 14) * 2 : 0;
  ctx.save();
  ctx.translate(shake, 0);
  ctx.fillStyle = urgent ? '#ffe1de' : PALETTE.ticket;
  rr(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.strokeStyle = urgent ? '#e5534b' : '#d9c9a8';
  ctx.lineWidth = urgent ? 3 : 2;
  ctx.stroke();
  drawDishBowl(ctx, order.dish, x + 30, y + 26, 34);
  text(ctx, DISHES[order.dish].name, x + 58, y + 18, 17, PALETTE.ticketInk, 'left');
  text(ctx, `Rp${DISHES[order.dish].price}rb`, x + 58, y + 40, 14, '#8a6d3b', 'left', '600');
  // patience bar
  const bw = w - 20;
  ctx.fillStyle = '#e3d9c2';
  rr(ctx, x + 10, y + h - 18, bw, 9, 4);
  ctx.fill();
  ctx.fillStyle = frac > 0.5 ? '#5da864' : frac > 0.27 ? '#f2a93b' : '#e5534b';
  if (frac > 0) { rr(ctx, x + 10, y + h - 18, Math.max(9, bw * frac), 9, 4); ctx.fill(); }
  ctx.restore();
}

function drawStationBase(ctx, def, highlight, now) {
  const { x, y, w, h } = def;
  ctx.fillStyle = PALETTE.counter;
  rr(ctx, x - w / 2, y - h / 2, w, h, 10);
  ctx.fill();
  ctx.fillStyle = PALETTE.counterTop;
  rr(ctx, x - w / 2, y - h / 2, w, 14, 7);
  ctx.fill();
  if (highlight) {
    ctx.strokeStyle = `rgba(242, 201, 76, ${0.55 + 0.35 * Math.sin(now * 5)})`;
    ctx.lineWidth = 4;
    rr(ctx, x - w / 2 - 4, y - h / 2 - 4, w + 8, h + 8, 12);
    ctx.stroke();
  }
  text(ctx, def.label, x, y + h / 2 + 16, 13, PALETTE.muted, 'center', '600');
}

function drawTimingBar(ctx, x, y, w, progress, cook) {
  ctx.fillStyle = '#1a1210';
  rr(ctx, x - w / 2, y, w, 10, 5);
  ctx.fill();
  if (cook.perfectFrom !== undefined) {
    ctx.fillStyle = '#5da864';
    const a = (cook.perfectFrom / cook.burntAfter) * w;
    const b = (cook.perfectTo / cook.burntAfter) * w;
    ctx.fillRect(x - w / 2 + a, y, b - a, 10);
  }
  const frac = Math.min(1, progress / (cook.burntAfter || cook.seconds));
  ctx.fillStyle = progress >= (cook.burntAfter || Infinity) ? '#3a3230' : '#f2c94c';
  if (frac > 0) { rr(ctx, x - w / 2, y, Math.max(10, w * frac), 10, 5); ctx.fill(); }
  ctx.strokeStyle = '#f7f1e3';
  ctx.lineWidth = 1.5;
  rr(ctx, x - w / 2, y, w, 10, 5);
  ctx.stroke();
}

const COMPONENT_IDS = ['bumbu', 'nasi-goreng', 'mie-goreng', 'ayam-cincang', 'sate', 'sayur-cincang', 'telur-iris'];

function hintFor(station, chef, plateSlots) {
  const def = station.def;
  if (def.kind === 'bin') return chef.carry ? 'Tangan penuh' : `Ambil ${def.gives}`;
  if (def.kind === 'trash') return chef.carry ? 'Buang' : '';
  if (def.kind === 'serve') return chef.carry && DISHES[chef.carry] ? 'Antar pesanan' : 'Bawa hidangan ke sini';
  if (def.kind === 'sink') return station.washing ? 'Mencuci…' : 'Cuci piring kotor';
  if (def.kind === 'plate') {
    if (chef.carry) return COMPONENT_IDS.includes(chef.carry) ? 'Taruh di piring' : 'Bahan mentah';
    for (const slot of plateSlots) if (slot && slot.dish) return 'Ambil hidangan';
    return 'Taruh bahan di piring';
  }
  if (station.item === null) return chef.carry ? 'Taruh di sini' : 'Bawa bahan dulu';
  if (station.burnt) return 'Gosong! Ambil & buang';
  if (station.done) return 'Angkat — sudah matang';
  return 'Memasak…';
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
    offsetX = (canvas.width - FIELD.width * scale) / 2;
    offsetY = (canvas.height - FIELD.height * scale) / 2;
  }

  function drawChef(chef, state, now) {
    const moving = chef.targetX !== null;
    const bob = moving ? Math.abs(Math.sin(now * 10)) * 4 : Math.sin(now * 2) * 1.5;
    const y = (chef.lane === LANE_BACK ? CHEF.laneBack : CHEF.laneFront) - bob;
    const x = chef.x;
    const hop = chef.hop > 0 ? Math.sin((0.18 - chef.hop) / 0.18 * Math.PI) * 14 : 0;
    ctx.save();
    ctx.translate(x, y - hop);
    // legs
    ctx.fillStyle = '#2b3a55';
    const step = moving ? Math.sin(now * 10) * 6 : 0;
    ctx.fillRect(-10 + step, -26, 8, 26);
    ctx.fillRect(2 - step, -26, 8, 26);
    // body + apron
    ctx.fillStyle = '#f5ead2';
    rr(ctx, -17, -58, 34, 36, 10);
    ctx.fill();
    ctx.fillStyle = '#c0392b';
    rr(ctx, -13, -58, 26, 30, 8);
    ctx.fill();
    // arms
    ctx.fillStyle = '#f2c9a0';
    ctx.fillRect(-22, -52, 7, 22);
    ctx.fillRect(15, -52, 7, 22);
    // head
    ctx.fillStyle = '#f2c9a0';
    ctx.beginPath(); ctx.arc(0, -70, 14, 0, Math.PI * 2); ctx.fill();
    // chef hat
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(-7, -82, 8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(7, -82, 8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(0, -86, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(-13, -84, 26, 6);
    // face
    ctx.fillStyle = '#2b2118';
    ctx.beginPath(); ctx.arc(-5 * chef.dir, -70, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(5 * chef.dir, -70, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#2b2118';
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(2 * chef.dir, -64, 4, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    // carried item above the head
    if (chef.carry) {
      ctx.fillStyle = 'rgba(20, 28, 51, 0.85)';
      rr(ctx, -26, -128, 52, 34, 10);
      ctx.fill();
      if (DISHES[chef.carry]) drawDishBowl(ctx, chef.carry, 0, -111, 30);
      else drawItemIcon(ctx, chef.carry, 0, -111, 26);
    }
    ctx.restore();
  }

  function draw(state, screen, best, now) {
    resize();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PALETTE.sky;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);

    // Night sky + stars.
    const sky = ctx.createLinearGradient(0, 0, 0, 720);
    sky.addColorStop(0, PALETTE.sky);
    sky.addColorStop(1, PALETTE.skyLow);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = '#f7f1e3';
    for (let i = 0; i < 26; i += 1) {
      const sx = (i * 173 + 41) % 1280;
      const sy = (i * 97 + 13) % 120 + 8;
      ctx.globalAlpha = 0.25 + 0.45 * Math.abs(Math.sin(now * 0.7 + i));
      ctx.beginPath(); ctx.arc(sx, sy, 1.6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Awning: red and cream stripes across the top.
    for (let i = 0; i < 16; i += 1) {
      ctx.fillStyle = i % 2 === 0 ? PALETTE.awningRed : PALETTE.awningCream;
      ctx.fillRect(i * 80, 0, 80, 34);
      ctx.beginPath();
      ctx.moveTo(i * 80, 34);
      ctx.lineTo(i * 80 + 40, 52);
      ctx.lineTo(i * 80 + 80, 34);
      ctx.fill();
    }
    // String lights under the awning.
    for (let i = 0; i < 24; i += 1) {
      const lx = 30 + i * 54;
      const ly = 58 + Math.sin(i * 0.9) * 6;
      ctx.strokeStyle = '#3a2c1e';
      ctx.beginPath(); ctx.moveTo(lx - 27, 52); ctx.lineTo(lx, ly); ctx.lineTo(lx + 27, 52); ctx.stroke();
      ctx.fillStyle = `rgba(242, 201, 76, ${0.6 + 0.4 * Math.sin(now * 3 + i)})`;
      ctx.beginPath(); ctx.arc(lx, ly + 3, 4, 0, Math.PI * 2); ctx.fill();
    }

    // Stall sign + HUD.
    ctx.fillStyle = 'rgba(20, 16, 10, 0.55)';
    rr(ctx, 330, 66, 620, 40, 10);
    ctx.fill();
    text(ctx, 'WARUNG NUSANTARA', 640, 87, 26, '#ffd766');
    const timeLeft = Math.max(0, SHIFT_SECONDS - state.elapsed);
    const mm = Math.floor(timeLeft / 60);
    const ss = Math.floor(timeLeft % 60);
    text(ctx, `${mm}:${String(ss).padStart(2, '0')}`, 60, 88, 26, timeLeft < 30 ? '#ff8a7a' : PALETTE.text, 'left');
    text(ctx, `Rp${state.coins}rb`, 1220, 88, 26, PALETTE.gold, 'right');
    for (let i = 0; i < 3; i += 1) {
      ctx.fillStyle = i < state.lives ? '#e5534b' : '#4a2c15';
      ctx.beginPath();
      const hx = 1090 + i * 26;
      const hy = 88;
      ctx.moveTo(hx, hy + 6);
      ctx.bezierCurveTo(hx - 10, hy - 4, hx - 5, hy - 12, hx, hy - 5);
      ctx.bezierCurveTo(hx + 5, hy - 12, hx + 10, hy - 4, hx, hy + 6);
      ctx.fill();
    }
    if (state.combo > 1) text(ctx, `KOMBO x${state.combo.toFixed(1)}`, 640, 122, 18, '#ffd766');

    // Customers + tickets. The combo line sits just under the sign, so the tickets start
    // below it (y 128) instead of under it.
    for (const order of state.orders) {
      drawTicket(ctx, order, order.x - 92, 128, 184, 74, now);
      drawCustomer(ctx, order, order.x, 222, now);
    }

    // Back counter (ingredient bins + serve hatch).
    ctx.fillStyle = PALETTE.woodDark;
    ctx.fillRect(40, 250, 1200, 14);
    for (const s of state.stations) {
      if (s.def.lane !== LANE_BACK) continue;
      const near = screen === SCREEN_PLAY && state.chef.lane === LANE_BACK
        && Math.abs(s.def.x - state.chef.x) <= 96;
      if (s.def.kind === 'serve') {
        ctx.fillStyle = '#3a2c1e';
        rr(ctx, s.def.x - 60, s.def.y - 44, 120, 88, 10);
        ctx.fill();
        ctx.fillStyle = '#ffd766';
        rr(ctx, s.def.x - 52, s.def.y - 36, 104, 72, 8);
        ctx.fill();
        text(ctx, 'ANTAR', s.def.x, s.def.y - 14, 18, '#2b2118');
        text(ctx, 'pesanan', s.def.x, s.def.y + 10, 13, '#5a4632', 'center', '600');
        if (near) {
          ctx.strokeStyle = `rgba(242, 201, 76, ${0.55 + 0.35 * Math.sin(now * 5)})`;
          ctx.lineWidth = 4;
          rr(ctx, s.def.x - 64, s.def.y - 48, 128, 96, 12);
          ctx.stroke();
        }
        continue;
      }
      drawStationBase(ctx, s.def, near, now);
      drawItemIcon(ctx, s.def.gives, s.def.x, s.def.y - 6, 44);
    }

    // Front counter (cooking stations).
    ctx.fillStyle = PALETTE.woodDark;
    ctx.fillRect(40, 424, 1200, 14);
    for (const s of state.stations) {
      if (s.def.lane !== 'front') continue;
      const near = screen === SCREEN_PLAY && state.chef.lane === 'front'
        && Math.abs(s.def.x - state.chef.x) <= 96;
      drawStationBase(ctx, s.def, near, now);
      const { x, y } = s.def;
      if (s.def.kind === 'chop') {
        ctx.fillStyle = '#c9a06a';
        rr(ctx, x - 52, y - 18, 104, 12, 6);
        ctx.fill();
        if (s.item) drawItemIcon(ctx, s.item, x - 20, y - 24, 30);
        if (s.item && !s.done) {
          ctx.fillStyle = '#1a1210';
          rr(ctx, x - 40, y - 52, 80, 8, 4);
          ctx.fill();
          ctx.fillStyle = '#7dc383';
          rr(ctx, x - 40, y - 52, 80 * Math.min(1, s.progress / COOK.chop.seconds), 8, 4);
          ctx.fill();
        }
        if (s.done) text(ctx, 'Siap!', x + 28, y - 24, 14, '#7dc383');
      } else if (s.def.kind === 'wok') {
        // fire
        const flick = Math.sin(now * 9 + x) * 3;
        ctx.fillStyle = '#e8821e';
        ctx.beginPath();
        ctx.moveTo(x - 26, y + 8);
        ctx.quadraticCurveTo(x - 10, y - 26 - flick, x, y - 8);
        ctx.quadraticCurveTo(x + 10, y - 26 - flick, x + 26, y + 8);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#2b2118';
        ctx.beginPath(); ctx.arc(x, y - 2, 30, 0, Math.PI); ctx.fill();
        ctx.fillStyle = '#4a4a52';
        ctx.fillRect(x - 34, y - 6, 68, 6);
        if (s.item) drawItemIcon(ctx, s.item, x, y - 14, 30);
        if (s.item) drawTimingBar(ctx, x, y - 48, 110, s.progress, COOK.wok);
        if (s.burnt) text(ctx, 'GOSONG!', x, y - 62, 14, '#ff8a7a');
        else if (s.done) text(ctx, 'Angkat!', x, y - 62, 14, '#7dc383');
        // steam
        ctx.fillStyle = 'rgba(247, 241, 227, 0.35)';
        for (let i = 0; i < 3; i += 1) {
          const sy = y - 30 - ((now * 22 + i * 18) % 54);
          ctx.beginPath(); ctx.arc(x - 12 + i * 12 + Math.sin(now * 3 + i) * 3, sy, 5, 0, Math.PI * 2); ctx.fill();
        }
      } else if (s.def.kind === 'grill') {
        ctx.fillStyle = '#3a3a40';
        ctx.fillRect(x - 56, y - 10, 112, 10);
        ctx.strokeStyle = '#6b6b72';
        ctx.lineWidth = 2;
        for (let i = -4; i <= 4; i += 1) {
          ctx.beginPath(); ctx.moveTo(x + i * 12, y - 10); ctx.lineTo(x + i * 12, y); ctx.stroke();
        }
        if (s.item) drawItemIcon(ctx, s.output || 'sate', x, y - 22, 32);
        if (s.item) drawTimingBar(ctx, x, y - 52, 110, s.progress, COOK.grill);
        if (s.burnt) text(ctx, 'GOSONG!', x, y - 66, 14, '#ff8a7a');
        else if (s.done) text(ctx, 'Angkat!', x, y - 66, 14, '#7dc383');
        ctx.fillStyle = 'rgba(139, 147, 163, 0.4)';
        for (let i = 0; i < 2; i += 1) {
          const sy = y - 34 - ((now * 16 + i * 26) % 44);
          ctx.beginPath(); ctx.arc(x - 8 + i * 16, sy, 6, 0, Math.PI * 2); ctx.fill();
        }
      } else if (s.def.kind === 'plate') {
        for (let i = 0; i < 3; i += 1) {
          const px = x - 72 + i * 72;
          ctx.fillStyle = '#e8e2d4';
          ctx.beginPath(); ctx.arc(px, y - 6, 26, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#c9c2b2';
          ctx.beginPath(); ctx.arc(px, y - 6, 17, 0, Math.PI * 2); ctx.fill();
          const slot = state.plateSlots[i];
          if (slot) {
            if (slot.dish) drawDishBowl(ctx, slot.dish, px, y - 8, 34);
            else slot.components.forEach((c, j) => drawItemIcon(ctx, c, px - 10 + j * 20, y - 12, 22));
          }
        }
        const clean = 3 - state.plateSlots.filter(Boolean).length - state.dirtyPlates;
        text(ctx, `Piring bersih: ${Math.max(0, clean)}`, x, y + 34, 12, PALETTE.muted, 'center', '600');
      } else if (s.def.kind === 'sink') {
        ctx.fillStyle = '#3f6fb5';
        rr(ctx, x - 44, y - 16, 88, 26, 8);
        ctx.fill();
        ctx.fillStyle = '#7fb3e8';
        for (let i = 0; i < 4; i += 1) {
          const bx = x - 30 + i * 20 + Math.sin(now * 4 + i) * 2;
          const by = y - 4 - ((now * 10 + i * 7) % 12);
          ctx.beginPath(); ctx.arc(bx, by, 3, 0, Math.PI * 2); ctx.fill();
        }
        if (s.washing) {
          ctx.fillStyle = '#1a1210';
          rr(ctx, x - 40, y - 44, 80, 8, 4);
          ctx.fill();
          ctx.fillStyle = '#7fb3e8';
          rr(ctx, x - 40, y - 44, 80 * Math.min(1, s.progress / 2), 8, 4);
          ctx.fill();
        }
        if (state.dirtyPlates > 0) text(ctx, `Kotor: ${state.dirtyPlates}`, x, y + 34, 12, '#ff8a7a', 'center', '600');
      } else if (s.def.kind === 'trash') {
        ctx.fillStyle = '#4a4a52';
        rr(ctx, x - 26, y - 18, 52, 36, 6);
        ctx.fill();
        ctx.fillStyle = '#33333a';
        rr(ctx, x - 30, y - 24, 60, 10, 5);
        ctx.fill();
      }
    }

    // Floor: a woven mat along the chef's lane, a sack of rice and a crate of chillies.
    ctx.fillStyle = PALETTE.floor;
    ctx.fillRect(0, 470, FIELD.width, 250);
    ctx.fillStyle = PALETTE.floorLine;
    for (let i = 0; i < 8; i += 1) ctx.fillRect(0, 540 + i * 22, FIELD.width, 2);
    ctx.fillStyle = '#7a3b2e';
    rr(ctx, 60, 636, 1160, 44, 10);
    ctx.fill();
    ctx.fillStyle = '#93503f';
    for (let i = 0; i < 10; i += 1) ctx.fillRect(120 + i * 116, 652, 56, 6);
    // rice sack
    ctx.fillStyle = '#d9c9a8';
    ctx.beginPath();
    ctx.moveTo(76, 700);
    ctx.quadraticCurveTo(70, 648, 100, 640);
    ctx.quadraticCurveTo(130, 648, 124, 700);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#b8a88f';
    ctx.fillRect(88, 636, 24, 10);
    text(ctx, 'BERAS', 100, 676, 11, '#5a4632', 'center', '600');
    // chilli crate
    ctx.fillStyle = '#6b4423';
    rr(ctx, 1150, 656, 76, 44, 6);
    ctx.fill();
    ctx.fillStyle = '#e5534b';
    for (let i = 0; i < 5; i += 1) {
      ctx.beginPath(); ctx.arc(1162 + i * 13, 652, 5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#7dc383';
    ctx.fillRect(1158, 644, 4, 6);
    ctx.fillRect(1197, 644, 4, 6);

    // The chef, and the station hint.
    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED || screen === SCREEN_TITLE) drawChef(state.chef, state, now);
    if (screen === SCREEN_PLAY) {
      const near = state.stations.find((s) => s.def.lane === state.chef.lane
        && Math.abs(s.def.x - state.chef.x) <= 96);
      if (near) {
        const hint = hintFor(near, state.chef, state.plateSlots);
        if (hint) {
          ctx.font = `700 16px ${FONT}`;
          const w = ctx.measureText(`E — ${hint}`).width + 40;
          ctx.fillStyle = 'rgba(20, 16, 10, 0.7)';
          rr(ctx, state.chef.x - w / 2, 618, w, 30, 15);
          ctx.fill();
          text(ctx, `E — ${hint}`, state.chef.x, 634, 16, '#ffd766');
        }
      }
    }

    // Message toast.
    if (state.messageTimer > 0 && state.message) {
      ctx.globalAlpha = Math.min(1, state.messageTimer);
      ctx.font = `700 16px ${FONT}`;
      const w = ctx.measureText(state.message).width + 44;
      ctx.fillStyle = 'rgba(20, 16, 10, 0.8)';
      rr(ctx, 640 - w / 2, 128, w, 32, 16);
      ctx.fill();
      text(ctx, state.message, 640, 145, 16, PALETTE.text);
      ctx.globalAlpha = 1;
    }
    if (state.perfectFlash > 0) {
      ctx.globalAlpha = Math.min(1, state.perfectFlash);
      text(ctx, 'SEMPURNA!', 640, 200, 34, '#ffd766');
      ctx.globalAlpha = 1;
    }

    // Controls hint.
    if (screen === SCREEN_PLAY) {
      text(ctx, 'A/D gerak  •  W/S ganti meja  •  E pakai stasiun  •  Klik stasiun untuk jalan ke sana  •  P jeda',
        640, 700, 14, PALETTE.muted, 'center', '500');
    }

    // Overlays.
    if (screen === SCREEN_TITLE) {
      ctx.fillStyle = 'rgba(10, 14, 28, 0.6)';
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      text(ctx, 'WARUNG NUSANTARA', 640, 210, 64, '#ffd766');
      text(ctx, 'Night Market Rush', 640, 262, 28, PALETTE.text, 'center', '500');
      text(ctx, 'Ambil bahan, potong, masak di wajan atau panggangan, tata di piring, antar sebelum pelanggan pergi.',
        640, 330, 18, PALETTE.text, 'center', '500');
      text(ctx, 'Piring kotor dicuci di wastafel. Masakan gosong dibuang. Pesanan cepat = kombo + tip.',
        640, 360, 18, PALETTE.text, 'center', '500');
      text(ctx, 'A/D bergerak  •  W/S ganti meja  •  E pakai stasiun  •  Klik juga bisa', 640, 400, 17, PALETTE.muted, 'center', '600');
      text(ctx, 'Tekan SPASI atau klik untuk mulai', 640, 470, 24, '#ffd766');
      if (best > 0) text(ctx, `Rekor: Rp${best}rb`, 640, 520, 18, PALETTE.text, 'center', '600');
    } else if (screen === SCREEN_PAUSED) {
      ctx.fillStyle = 'rgba(10, 14, 28, 0.6)';
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      text(ctx, 'JEDA', 640, 330, 56, PALETTE.text);
      text(ctx, 'Tekan P untuk lanjut', 640, 390, 20, PALETTE.muted, 'center', '500');
    } else if (screen === SCREEN_OVER) {
      ctx.fillStyle = 'rgba(10, 14, 28, 0.72)';
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      const stars = state.coins >= STARS[2] ? 3 : state.coins >= STARS[1] ? 2 : state.coins >= STARS[0] ? 1 : 0;
      text(ctx, state.overReason === 'lives' ? 'WARUNG TUTUP!' : 'SHIFT SELESAI!', 640, 200, 52, '#ffd766');
      for (let i = 0; i < 3; i += 1) {
        ctx.fillStyle = i < stars ? '#f2c94c' : '#4a2c15';
        ctx.beginPath();
        const sx = 640 + (i - 1) * 70;
        const sy = 270;
        for (let p = 0; p < 5; p += 1) {
          const a = -Math.PI / 2 + p * (Math.PI * 2 / 5);
          const a2 = a + Math.PI / 5;
          ctx.lineTo(sx + Math.cos(a) * 30, sy + Math.sin(a) * 30);
          ctx.lineTo(sx + Math.cos(a2) * 13, sy + Math.sin(a2) * 13);
        }
        ctx.closePath();
        ctx.fill();
      }
      text(ctx, `Rp${state.coins}rb  •  ${state.served} pesanan diantar  •  ${state.perfectCount} masakan sempurna`, 640, 350, 22, PALETTE.text);
      text(ctx, `Rekor: Rp${Math.max(best, state.coins)}rb`, 640, 392, 18, PALETTE.muted, 'center', '600');
      text(ctx, 'Tekan SPASI untuk main lagi', 640, 460, 22, '#ffd766');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, resize };
}
