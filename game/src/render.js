// Warung Nusantara's painter: every pixel of the night market, drawn on one canvas.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to the window.
// Nothing here knows the rules: it only reads the world's state and paints it.
//
// The look follows the reference the user picked (Cooking Master): a warm, dense,
// anime-style kitchen. A generated illustration of the warung's dining room is the
// backdrop (game/assets/warung-bg.jpg); the counters, the big customers with their
// speech-bubble orders, the steel ingredient trays and the cooking stations are all
// drawn over it. If the backdrop has not loaded, a warm gradient stands in.

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

/** A customer, drawn big (about 140px tall) so the face reads at a glance, like the
 * reference's diners. Feet at (x, y); the head is up near the speech bubble. */
function drawCustomer(ctx, order, x, y, now) {
  const c = order.customer;
  const impatient = order.patience < 15;
  const bob = Math.sin(now * 2 + order.slot) * (impatient ? 4 : 2);
  ctx.save();
  ctx.translate(x, y + bob);
  // soft shadow under the feet
  ctx.fillStyle = 'rgba(20, 12, 6, 0.3)';
  ctx.beginPath(); ctx.ellipse(0, 2, 36, 7, 0, 0, Math.PI * 2); ctx.fill();
  // body
  ctx.fillStyle = c.shirt;
  rr(ctx, -34, -96, 68, 96, 18);
  ctx.fill();
  // collar + buttons
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath(); ctx.moveTo(-10, -96); ctx.lineTo(0, -84); ctx.lineTo(10, -96); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  for (let i = 0; i < 3; i += 1) { ctx.beginPath(); ctx.arc(0, -70 + i * 16, 2.2, 0, Math.PI * 2); ctx.fill(); }
  // arms
  ctx.fillStyle = c.skin;
  rr(ctx, -44, -90, 13, 52, 6);
  ctx.fill();
  rr(ctx, 31, -90, 13, 52, 6);
  ctx.fill();
  // head
  ctx.fillStyle = c.skin;
  ctx.beginPath(); ctx.arc(0, -122, 27, 0, Math.PI * 2); ctx.fill();
  // ears
  ctx.beginPath(); ctx.arc(-27, -122, 6, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(27, -122, 6, 0, Math.PI * 2); ctx.fill();
  // hair / hat
  if (c.hat === 'cap') {
    ctx.fillStyle = '#e5534b';
    ctx.beginPath(); ctx.arc(0, -128, 26, Math.PI, 0); ctx.fill();
    ctx.fillRect(0, -132, 34, 8);
  } else if (c.hat === 'songkok') {
    ctx.fillStyle = '#2b2118';
    ctx.beginPath(); ctx.arc(0, -130, 25, Math.PI, 0); ctx.fill();
    ctx.fillRect(-25, -134, 50, 9);
  } else if (c.hat === 'bandana') {
    ctx.fillStyle = '#f2c94c';
    ctx.beginPath(); ctx.arc(0, -126, 27, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
    ctx.fillRect(-27, -140, 8, 22);
    ctx.fillRect(19, -140, 8, 22);
  } else {
    ctx.fillStyle = '#2b2118';
    ctx.beginPath(); ctx.arc(0, -128, 27, Math.PI, 0); ctx.fill();
    ctx.beginPath(); ctx.arc(-24, -112, 8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(24, -112, 8, 0, Math.PI * 2); ctx.fill();
  }
  // eyes
  ctx.fillStyle = '#2b2118';
  ctx.beginPath(); ctx.arc(-10, -122, 3.4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(10, -122, 3.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(-9, -123.5, 1.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(11, -123.5, 1.2, 0, Math.PI * 2); ctx.fill();
  // blush
  ctx.fillStyle = 'rgba(229, 83, 75, 0.35)';
  ctx.beginPath(); ctx.arc(-18, -112, 5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(18, -112, 5, 0, Math.PI * 2); ctx.fill();
  // mouth: smile, or a flat line when the order is about to expire
  ctx.strokeStyle = '#2b2118';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  if (impatient) { ctx.moveTo(-8, -108); ctx.lineTo(8, -108); }
  else { ctx.arc(0, -114, 8, 0.15 * Math.PI, 0.85 * Math.PI); }
  ctx.stroke();
  if (impatient) text(ctx, '!', 38, -158, 28, '#e5534b');
  ctx.restore();
}

/** An order as a speech bubble above the customer's head, like the reference: the
 * dish in a bowl, its name and price, and a patience bar along the bottom. */
function drawTicket(ctx, order, x, y, w, h, now) {
  const frac = Math.max(0, order.patience / order.maxPatience);
  const urgent = frac < 0.27;
  const shake = urgent ? Math.sin(now * 14) * 2 : 0;
  ctx.save();
  ctx.translate(shake, 0);
  // tail down to the customer's head
  ctx.fillStyle = urgent ? '#ffe1de' : PALETTE.ticket;
  ctx.beginPath();
  ctx.moveTo(x + w / 2 - 12, y + h - 2);
  ctx.lineTo(x + w / 2 + 12, y + h - 2);
  ctx.lineTo(x + w / 2, y + h + 16);
  ctx.closePath();
  ctx.fill();
  // bubble
  ctx.fillStyle = urgent ? '#ffe1de' : PALETTE.ticket;
  rr(ctx, x, y, w, h, 14);
  ctx.fill();
  ctx.strokeStyle = urgent ? '#e5534b' : '#d9c9a8';
  ctx.lineWidth = urgent ? 3 : 2;
  ctx.stroke();
  drawDishBowl(ctx, order.dish, x + 30, y + 26, 34);
  text(ctx, DISHES[order.dish].name, x + 56, y + 20, 16, PALETTE.ticketInk, 'left');
  text(ctx, `Rp${DISHES[order.dish].price}rb`, x + 56, y + 42, 14, '#8a6d3b', 'left', '600');
  // patience bar
  const bw = w - 20;
  ctx.fillStyle = '#e3d9c2';
  rr(ctx, x + 10, y + h - 18, bw, 9, 4);
  ctx.fill();
  ctx.fillStyle = frac > 0.5 ? '#5da864' : frac > 0.27 ? '#f2a93b' : '#e5534b';
  if (frac > 0) { rr(ctx, x + 10, y + h - 18, Math.max(9, bw * frac), 9, 4); ctx.fill(); }
  ctx.restore();
}

/** A station's wooden counter block, with a warm highlight on top and a pulsing gold
 * ring when the chef stands near it on the right lane. */
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
  // The label sits on a dark pill: the dining-room cloth behind it is too busy for bare text.
  ctx.font = `600 13px ${FONT}`;
  const lw = ctx.measureText(def.label).width + 18;
  ctx.fillStyle = 'rgba(20, 16, 10, 0.65)';
  rr(ctx, x - lw / 2, y + h / 2 + 7, lw, 18, 9);
  ctx.fill();
  text(ctx, def.label, x, y + h / 2 + 16, 13, '#f7f1e3', 'center', '600');
}

/** A steel ingredient tray on a bin: a silver well with a big pile of the ingredient. */
function drawBinTray(ctx, def, now) {
  const { x, y, w, h } = def;
  ctx.fillStyle = '#9a9aa2';
  rr(ctx, x - w / 2, y - h / 2, w, h, 10);
  ctx.fill();
  ctx.fillStyle = '#c9c9d1';
  rr(ctx, x - w / 2 + 4, y - h / 2 + 4, w - 8, h - 8, 8);
  ctx.fill();
  ctx.fillStyle = '#7d7d88';
  rr(ctx, x - w / 2 + 8, y - h / 2 + 8, w - 16, h - 30, 6);
  ctx.fill();
  // a heaped pile of the ingredient, bigger than the icon alone
  drawItemIcon(ctx, def.gives, x, y - 4, 58);
  drawItemIcon(ctx, def.gives, x - 24, y + 8, 30);
  drawItemIcon(ctx, def.gives, x + 24, y + 8, 30);
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

export function createRenderer(canvas, bg) {
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
    const bob = moving ? Math.abs(Math.sin(now * 10)) * 5 : Math.sin(now * 2) * 2;
    const y = (chef.lane === LANE_BACK ? CHEF.laneBack : CHEF.laneFront) - bob;
    const x = chef.x;
    const hop = chef.hop > 0 ? Math.sin((0.18 - chef.hop) / 0.18 * Math.PI) * 16 : 0;
    ctx.save();
    ctx.translate(x, y - hop);
    // soft shadow
    ctx.fillStyle = 'rgba(20, 12, 6, 0.3)';
    ctx.beginPath(); ctx.ellipse(0, 2, 30, 6, 0, 0, Math.PI * 2); ctx.fill();
    // legs
    ctx.fillStyle = '#2b3a55';
    const step = moving ? Math.sin(now * 10) * 8 : 0;
    ctx.fillRect(-12 + step, -32, 10, 32);
    ctx.fillRect(2 - step, -32, 10, 32);
    // body + apron
    ctx.fillStyle = '#f5ead2';
    rr(ctx, -21, -72, 42, 44, 12);
    ctx.fill();
    ctx.fillStyle = '#c0392b';
    rr(ctx, -16, -72, 32, 37, 10);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(-16, -72, 32, 4);
    // arms
    ctx.fillStyle = '#f2c9a0';
    rr(ctx, -27, -64, 9, 28, 4);
    ctx.fill();
    rr(ctx, 18, -64, 9, 28, 4);
    ctx.fill();
    // head
    ctx.fillStyle = '#f2c9a0';
    ctx.beginPath(); ctx.arc(0, -86, 17, 0, Math.PI * 2); ctx.fill();
    // chef hat
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(-9, -100, 10, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(9, -100, 10, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(0, -105, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(-16, -102, 32, 7);
    // face
    ctx.fillStyle = '#2b2118';
    ctx.beginPath(); ctx.arc(-6 * chef.dir, -86, 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(6 * chef.dir, -86, 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(229, 83, 75, 0.35)';
    ctx.beginPath(); ctx.arc(-11, -79, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(11, -79, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#2b2118';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(2 * chef.dir, -79, 5, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    // carried item above the head
    if (chef.carry) {
      ctx.fillStyle = 'rgba(20, 28, 51, 0.85)';
      rr(ctx, -30, -156, 60, 38, 12);
      ctx.fill();
      if (DISHES[chef.carry]) drawDishBowl(ctx, chef.carry, 0, -137, 32);
      else drawItemIcon(ctx, chef.carry, 0, -137, 28);
    }
    ctx.restore();
  }

  function draw(state, screen, best, now) {
    resize();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PALETTE.sky;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);

    // Backdrop: the warung's dining room. Until it loads, a warm gradient stands in.
    if (bg && bg.complete && bg.naturalWidth > 0) {
      ctx.drawImage(bg, 0, 0, FIELD.width, FIELD.height);
    } else {
      const sky = ctx.createLinearGradient(0, 0, 0, 720);
      sky.addColorStop(0, '#3a2a1c');
      sky.addColorStop(0.55, '#2b2118');
      sky.addColorStop(1, '#241a12');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    }
    // A gentle dark veil over the dining room so the counters and tickets read clearly.
    ctx.fillStyle = 'rgba(20, 12, 6, 0.18)';
    ctx.fillRect(0, 0, FIELD.width, 300);

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
    const timeLeft = Math.max(0, SHIFT_SECONDS - state.elapsed);
    const mm = Math.floor(timeLeft / 60);
    const ss = Math.floor(timeLeft % 60);
    // timer: a little clock + the time, top left
    ctx.fillStyle = 'rgba(20, 16, 10, 0.55)';
    rr(ctx, 40, 50, 128, 40, 10);
    ctx.fill();
    ctx.strokeStyle = timeLeft < 30 ? '#ff8a7a' : PALETTE.text;
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(62, 70, 11, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(62, 70); ctx.lineTo(62, 62); ctx.moveTo(62, 70); ctx.lineTo(68, 70); ctx.stroke();
    text(ctx, `${mm}:${String(ss).padStart(2, '0')}`, 80, 71, 24, timeLeft < 30 ? '#ff8a7a' : PALETTE.text, 'left');
    // stall sign, then hearts and coins in their own pills (the sign is narrower now
    // so the hearts fit between it and the coins)
    ctx.fillStyle = 'rgba(20, 16, 10, 0.55)';
    rr(ctx, 330, 50, 600, 40, 10);
    ctx.fill();
    text(ctx, 'WARUNG NUSANTARA', 630, 71, 24, '#ffd766');
    ctx.fillStyle = 'rgba(20, 16, 10, 0.55)';
    rr(ctx, 950, 50, 80, 40, 10);
    ctx.fill();
    for (let i = 0; i < 3; i += 1) {
      ctx.fillStyle = i < state.lives ? '#e5534b' : 'rgba(74, 44, 21, 0.7)';
      ctx.beginPath();
      const hx = 966 + i * 22;
      const hy = 70;
      ctx.moveTo(hx, hy + 6);
      ctx.bezierCurveTo(hx - 10, hy - 4, hx - 5, hy - 12, hx, hy - 5);
      ctx.bezierCurveTo(hx + 5, hy - 12, hx + 10, hy - 4, hx, hy + 6);
      ctx.fill();
    }
    // coins, top right
    ctx.fillStyle = 'rgba(20, 16, 10, 0.55)';
    rr(ctx, 1050, 50, 190, 40, 10);
    ctx.fill();
    ctx.fillStyle = PALETTE.gold;
    ctx.beginPath(); ctx.arc(1072, 70, 11, 0, Math.PI * 2); ctx.fill();
    text(ctx, '$', 1072, 71, 15, '#7a5a00');
    text(ctx, `Rp${state.coins}rb`, 1090, 71, 22, PALETTE.gold, 'left');
    // combo pill, under the coins (clear of the rightmost bubble)
    if (state.combo > 1) {
      ctx.fillStyle = 'rgba(20, 16, 10, 0.55)';
      rr(ctx, 1140, 98, 100, 28, 14);
      ctx.fill();
      text(ctx, `KOMBO x${state.combo.toFixed(1)}`, 1190, 113, 16, '#ffd766');
    }

    // Customers + their speech-bubble orders.
    for (const order of state.orders) {
      drawTicket(ctx, order, order.x - 92, 96, 184, 72, now);
      drawCustomer(ctx, order, order.x, 300, now);
    }

    // Back counter (ingredient bins + serve hatch).
    ctx.fillStyle = PALETTE.woodDark;
    ctx.fillRect(40, 296, 1200, 14);
    for (const s of state.stations) {
      if (s.def.lane !== LANE_BACK) continue;
      const near = screen === SCREEN_PLAY && state.chef.lane === LANE_BACK
        && Math.abs(s.def.x - state.chef.x) <= 96;
      if (s.def.kind === 'serve') {
        // serve hatch: a warm yellow hatch with a little service bell on top
        ctx.fillStyle = '#3a2c1e';
        rr(ctx, s.def.x - 60, s.def.y - 44, 120, 88, 10);
        ctx.fill();
        ctx.fillStyle = '#ffd766';
        rr(ctx, s.def.x - 52, s.def.y - 36, 104, 72, 8);
        ctx.fill();
        text(ctx, 'ANTAR', s.def.x, s.def.y - 14, 18, '#2b2118');
        text(ctx, 'pesanan', s.def.x, s.def.y + 10, 13, '#5a4632', 'center', '600');
        ctx.fillStyle = '#c9c9d1';
        ctx.beginPath(); ctx.arc(s.def.x, s.def.y - 52, 12, Math.PI, 0); ctx.fill();
        ctx.fillRect(s.def.x - 12, s.def.y - 52, 24, 4);
        if (near) {
          ctx.strokeStyle = `rgba(242, 201, 76, ${0.55 + 0.35 * Math.sin(now * 5)})`;
          ctx.lineWidth = 4;
          rr(ctx, s.def.x - 64, s.def.y - 48, 128, 96, 12);
          ctx.stroke();
        }
        continue;
      }
      drawStationBase(ctx, s.def, near, now);
      drawBinTray(ctx, s.def, now);
    }

    // Front counter (cooking stations).
    ctx.fillStyle = PALETTE.woodDark;
    ctx.fillRect(40, 416, 1200, 14);
    for (const s of state.stations) {
      if (s.def.lane !== 'front') continue;
      const near = screen === SCREEN_PLAY && state.chef.lane === 'front'
        && Math.abs(s.def.x - state.chef.x) <= 96;
      drawStationBase(ctx, s.def, near, now);
      const { x, y } = s.def;
      if (s.def.kind === 'chop') {
        // wooden board + knife
        ctx.fillStyle = '#c9a06a';
        rr(ctx, x - 56, y - 18, 112, 14, 7);
        ctx.fill();
        ctx.fillStyle = '#a87c4a';
        ctx.fillRect(x - 56, y - 8, 112, 4);
        ctx.save();
        ctx.translate(x + 44, y - 26);
        ctx.rotate(0.5);
        ctx.fillStyle = '#c9c9d1';
        ctx.fillRect(-4, -18, 8, 22);
        ctx.fillStyle = '#6b4423';
        ctx.fillRect(-4, 4, 8, 12);
        ctx.restore();
        if (s.item) drawItemIcon(ctx, s.item, x - 18, y - 26, 32);
        if (s.item && !s.done) {
          ctx.fillStyle = '#1a1210';
          rr(ctx, x - 44, y - 54, 88, 8, 4);
          ctx.fill();
          ctx.fillStyle = '#7dc383';
          rr(ctx, x - 44, y - 54, 88 * Math.min(1, s.progress / COOK.chop.seconds), 8, 4);
          ctx.fill();
        }
        if (s.done) text(ctx, 'Siap!', x + 30, y - 26, 14, '#7dc383');
      } else if (s.def.kind === 'wok') {
        // fire under the wok, wide enough to lick out from behind the bowl
        const flick = Math.sin(now * 9 + x) * 3;
        ctx.fillStyle = '#e8821e';
        ctx.beginPath();
        ctx.moveTo(x - 40, y + 10);
        ctx.quadraticCurveTo(x - 16, y - 30 - flick, x, y - 10);
        ctx.quadraticCurveTo(x + 16, y - 30 - flick, x + 40, y + 10);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#f2c94c';
        ctx.beginPath();
        ctx.moveTo(x - 22, y + 10);
        ctx.quadraticCurveTo(x - 8, y - 14 - flick, x, y - 2);
        ctx.quadraticCurveTo(x + 8, y - 14 - flick, x + 22, y + 10);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#2b2118';
        ctx.beginPath(); ctx.arc(x, y - 2, 32, 0, Math.PI); ctx.fill();
        ctx.fillStyle = '#4a4a52';
        ctx.fillRect(x - 36, y - 6, 72, 6);
        if (s.item) drawItemIcon(ctx, s.item, x, y - 16, 32);
        if (s.item) drawTimingBar(ctx, x, y - 50, 110, s.progress, COOK.wok);
        if (s.burnt) text(ctx, 'GOSONG!', x, y - 64, 14, '#ff8a7a');
        else if (s.done) text(ctx, 'Angkat!', x, y - 64, 14, '#7dc383');
        // steam
        ctx.fillStyle = 'rgba(247, 241, 227, 0.35)';
        for (let i = 0; i < 3; i += 1) {
          const sy = y - 32 - ((now * 22 + i * 18) % 54);
          ctx.beginPath(); ctx.arc(x - 12 + i * 12 + Math.sin(now * 3 + i) * 3, sy, 5, 0, Math.PI * 2); ctx.fill();
        }
      } else if (s.def.kind === 'grill') {
        // glowing coals + grate
        const glow = 0.5 + 0.3 * Math.sin(now * 6 + x);
        ctx.fillStyle = `rgba(232, 130, 30, ${glow})`;
        ctx.fillRect(x - 52, y - 12, 104, 12);
        ctx.fillStyle = '#3a3a40';
        ctx.fillRect(x - 56, y - 12, 112, 10);
        ctx.strokeStyle = '#8b8b93';
        ctx.lineWidth = 2;
        for (let i = -4; i <= 4; i += 1) {
          ctx.beginPath(); ctx.moveTo(x + i * 12, y - 12); ctx.lineTo(x + i * 12, y - 2); ctx.stroke();
        }
        if (s.item) drawItemIcon(ctx, s.output || 'sate', x, y - 26, 34);
        if (s.item) drawTimingBar(ctx, x, y - 56, 110, s.progress, COOK.grill);
        if (s.burnt) text(ctx, 'GOSONG!', x, y - 70, 14, '#ff8a7a');
        else if (s.done) text(ctx, 'Angkat!', x, y - 70, 14, '#7dc383');
        ctx.fillStyle = 'rgba(139, 147, 163, 0.4)';
        for (let i = 0; i < 2; i += 1) {
          const sy = y - 38 - ((now * 16 + i * 26) % 44);
          ctx.beginPath(); ctx.arc(x - 8 + i * 16, sy, 6, 0, Math.PI * 2); ctx.fill();
        }
      } else if (s.def.kind === 'plate') {
        for (let i = 0; i < 3; i += 1) {
          const px = x - 72 + i * 72;
          ctx.fillStyle = '#f2ede2';
          ctx.beginPath(); ctx.arc(px, y - 6, 28, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#d9d2c2';
          ctx.beginPath(); ctx.arc(px, y - 6, 19, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath(); ctx.arc(px, y - 6, 15, 0, Math.PI * 2); ctx.fill();
          const slot = state.plateSlots[i];
          if (slot) {
            if (slot.dish) drawDishBowl(ctx, slot.dish, px, y - 8, 36);
            else slot.components.forEach((c, j) => drawItemIcon(ctx, c, px - 10 + j * 20, y - 12, 22));
          }
        }
        const clean = 3 - state.plateSlots.filter(Boolean).length - state.dirtyPlates;
        text(ctx, `Piring bersih: ${Math.max(0, clean)}`, x, y + 34, 12, '#f7f1e3', 'center', '600');
      } else if (s.def.kind === 'sink') {
        // steel basin + blue water + bubbles
        ctx.fillStyle = '#8a8a92';
        rr(ctx, x - 48, y - 20, 96, 32, 8);
        ctx.fill();
        ctx.fillStyle = '#3f6fb5';
        rr(ctx, x - 42, y - 14, 84, 22, 6);
        ctx.fill();
        ctx.fillStyle = '#7fb3e8';
        for (let i = 0; i < 4; i += 1) {
          const bx = x - 30 + i * 20 + Math.sin(now * 4 + i) * 2;
          const by = y - 4 - ((now * 10 + i * 7) % 12);
          ctx.beginPath(); ctx.arc(bx, by, 3, 0, Math.PI * 2); ctx.fill();
        }
        // tap
        ctx.strokeStyle = '#c9c9d1';
        ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(x + 20, y - 34); ctx.lineTo(x + 20, y - 20); ctx.stroke();
        if (s.washing) {
          ctx.fillStyle = '#1a1210';
          rr(ctx, x - 40, y - 48, 80, 8, 4);
          ctx.fill();
          ctx.fillStyle = '#7fb3e8';
          rr(ctx, x - 40, y - 48, 80 * Math.min(1, s.progress / 2), 8, 4);
          ctx.fill();
        }
        if (state.dirtyPlates > 0) text(ctx, `Kotor: ${state.dirtyPlates}`, x, y + 34, 12, '#ff8a7a', 'center', '600');
      } else if (s.def.kind === 'trash') {
        ctx.fillStyle = '#4a4a52';
        rr(ctx, x - 28, y - 20, 56, 40, 6);
        ctx.fill();
        ctx.fillStyle = '#33333a';
        rr(ctx, x - 32, y - 26, 64, 10, 5);
        ctx.fill();
        ctx.fillStyle = '#6b6b72';
        ctx.fillRect(x - 4, y - 30, 8, 6);
      }
    }

    // Floor dressing on the backdrop's wooden floor: a woven mat, a rice sack, sauce
    // bottles, a chalkboard menu and a crate of chillies.
    ctx.fillStyle = '#7a3b2e';
    rr(ctx, 60, 640, 1160, 44, 10);
    ctx.fill();
    ctx.fillStyle = '#93503f';
    for (let i = 0; i < 10; i += 1) ctx.fillRect(120 + i * 116, 656, 56, 6);
    // rice sack
    ctx.fillStyle = '#d9c9a8';
    ctx.beginPath();
    ctx.moveTo(76, 704);
    ctx.quadraticCurveTo(70, 652, 100, 644);
    ctx.quadraticCurveTo(130, 652, 124, 704);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#b8a88f';
    ctx.fillRect(88, 640, 24, 10);
    text(ctx, 'BERAS', 100, 680, 11, '#5a4632', 'center', '600');
    // sauce bottles
    for (let i = 0; i < 2; i += 1) {
      const bx = 150 + i * 30;
      ctx.fillStyle = i === 0 ? '#c0392b' : '#f2c94c';
      rr(ctx, bx, 668, 20, 36, 6);
      ctx.fill();
      ctx.fillStyle = '#f5ead2';
      ctx.fillRect(bx + 6, 660, 8, 8);
    }
    // chalkboard menu on the right
    ctx.fillStyle = '#2b2118';
    rr(ctx, 1060, 540, 150, 96, 8);
    ctx.fill();
    ctx.strokeStyle = '#8a5a2b';
    ctx.lineWidth = 4;
    rr(ctx, 1060, 540, 150, 96, 8);
    ctx.stroke();
    text(ctx, 'MENU', 1135, 558, 15, '#ffd766');
    text(ctx, 'Nasi Goreng 15', 1135, 580, 12, '#f7f1e3', 'center', '500');
    text(ctx, 'Mie Ayam 12', 1135, 598, 12, '#f7f1e3', 'center', '500');
    text(ctx, 'Sate Ayam 18', 1135, 616, 12, '#f7f1e3', 'center', '500');
    // chilli crate
    ctx.fillStyle = '#6b4423';
    rr(ctx, 1150, 660, 76, 44, 6);
    ctx.fill();
    ctx.fillStyle = '#e5534b';
    for (let i = 0; i < 5; i += 1) {
      ctx.beginPath(); ctx.arc(1162 + i * 13, 656, 5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#7dc383';
    ctx.fillRect(1158, 648, 4, 6);
    ctx.fillRect(1197, 648, 4, 6);

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
          const hx = Math.max(8, Math.min(FIELD.width - w - 8, state.chef.x - w / 2));
          ctx.fillStyle = 'rgba(20, 16, 10, 0.72)';
          rr(ctx, hx, 600, w, 30, 15);
          ctx.fill();
          text(ctx, `E — ${hint}`, hx + w / 2, 616, 16, '#ffd766');
        }
      }
    }

    // Message toast.
    if (state.messageTimer > 0 && state.message) {
      ctx.globalAlpha = Math.min(1, state.messageTimer);
      ctx.font = `700 16px ${FONT}`;
      const w = ctx.measureText(state.message).width + 44;
      ctx.fillStyle = 'rgba(20, 16, 10, 0.8)';
      rr(ctx, 640 - w / 2, 660, w, 32, 16);
      ctx.fill();
      text(ctx, state.message, 640, 677, 16, PALETTE.text);
      ctx.globalAlpha = 1;
    }
    if (state.perfectFlash > 0) {
      ctx.globalAlpha = Math.min(1, state.perfectFlash);
      text(ctx, 'SEMPURNA!', 640, 540, 34, '#ffd766');
      ctx.globalAlpha = 1;
    }

    // Controls hint.
    if (screen === SCREEN_PLAY) {
      text(ctx, 'A/D gerak  •  W/S ganti meja  •  E pakai stasiun  •  Klik stasiun untuk jalan ke sana  •  P jeda',
        640, 710, 14, '#f7f1e3', 'center', '500');
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
