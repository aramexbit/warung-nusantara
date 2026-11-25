// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s
// steps (several in a slow frame, none in a fast one), and the renderer paints what is
// there. The game moves between four screens: title, play, paused and game over.
// Sounds are tiny WebAudio blips, made on the first gesture so no audio plays unasked.
//
// ?seed=N fixes the order pattern. ?shot=start|play|rush|end (with &seed=N) stages that
// scene instead of running the loop, paints it twice and sets window.__shotReady for a
// screenshot.
import { BEST_KEY, FIELD, LANE_BACK, LANE_FRONT, STEP } from './config.js';
import { createRandom } from './random.js';
import {
  createWorld, EVENT_BURNT, EVENT_COOK_DONE, EVENT_ERROR, EVENT_EXPIRE, EVENT_OVER,
  EVENT_PERFECT, EVENT_PICKUP, EVENT_SERVE, EVENT_WASH_DONE,
} from './world.js';
import {
  ACTION_CONFIRM, ACTION_INTERACT, ACTION_LANE_DOWN, ACTION_LANE_UP, ACTION_PAUSE, createInput,
} from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
// The dining-room backdrop (game/assets/warung-bg.jpg). The renderer draws a warm
// gradient until it loads; a failed load keeps the gradient.
const bg = new Image();
bg.src = './assets/warung-bg.jpg';
const renderer = createRenderer(canvas, bg);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

/** The smallest synth that still reads as a kitchen: one oscillator per sound. */
let audio = null;
function ensureAudio() {
  if (audio === null) {
    try {
      audio = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      audio = undefined;
    }
  }
  if (audio && audio.state === 'suspended') audio.resume();
  return audio || null;
}
function blip(freq, seconds, type = 'sine', gain = 0.08, when = 0) {
  const ctx = ensureAudio();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  amp.gain.setValueAtTime(gain, ctx.currentTime + when);
  amp.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + when + seconds);
  osc.connect(amp);
  amp.connect(ctx.destination);
  osc.start(ctx.currentTime + when);
  osc.stop(ctx.currentTime + when + seconds + 0.02);
}
function playEvents(events) {
  if (events & EVENT_SERVE) { blip(660, 0.12); blip(880, 0.18, 'sine', 0.08, 0.1); }
  if (events & EVENT_PERFECT) { blip(880, 0.1); blip(1108, 0.1, 'sine', 0.08, 0.08); blip(1318, 0.16, 'sine', 0.08, 0.16); }
  if (events & EVENT_PICKUP) blip(520, 0.07, 'triangle', 0.06);
  if (events & EVENT_COOK_DONE) blip(988, 0.14, 'sine', 0.07);
  if (events & EVENT_WASH_DONE) blip(740, 0.1, 'triangle', 0.06);
  if (events & EVENT_BURNT) blip(160, 0.3, 'sawtooth', 0.07);
  if (events & EVENT_EXPIRE) { blip(220, 0.2, 'sawtooth', 0.06); blip(180, 0.25, 'sawtooth', 0.06, 0.12); }
  if (events & EVENT_ERROR) blip(140, 0.1, 'square', 0.05);
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  // The scene is painted twice (once to settle the canvas, once for the capture) and
  // only then is the page told the shot is ready; the probe waits for that flag before
  // screenshotting, so a shot never catches a half-drawn frame. The backdrop is part
  // of the shot: wait for it (or 3 s) before the first paint.
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, performance.now() / 1000);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  if (bg.complete) requestAnimationFrame(paint);
  else {
    let started = false;
    const go = () => { if (!started) { started = true; requestAnimationFrame(paint); } };
    bg.addEventListener('load', go, { once: true });
    bg.addEventListener('error', go, { once: true });
    setTimeout(go, 3000);
  }
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  // The title screen shows the staged kitchen behind the overlay; starting resets it.
  stageShot('start', world);

  // Screen readers (and anyone watching the page's text) hear the screen changes.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Bermain. Layani pelanggan sebelum mereka pergi.');
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (world.state.coins > best) {
      best = world.state.coins;
      saveBest(best);
    }
    announce(`Shift selesai. Rp${world.state.coins}rb, ${world.state.served} pesanan diantar. Rekor Rp${best}rb.`);
  }

  /** A click on the canvas: a station to walk to and use, or a spot on the floor to walk to. */
  function clickToLogical(click) {
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / FIELD.width, rect.height / FIELD.height);
    const offsetX = (rect.width - FIELD.width * scale) / 2;
    const offsetY = (rect.height - FIELD.height * scale) / 2;
    return {
      x: (click.clientX - rect.left - offsetX) / scale,
      y: (click.clientY - rect.top - offsetY) / scale,
    };
  }

  function handleActions() {
    const actions = input.takeActions();
    const click = input.takeClick();
    if (click) ensureAudio();
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) startGame();
    else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Jeda.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Bermain.');
    }
    return { actions, click: click ? clickToLogical(click) : null };
  }

  function step(now) {
    const { actions, click } = handleActions();
    if (screen === SCREEN_TITLE) return;
    let move = input.direction();
    let lane = null;
    if (actions & ACTION_LANE_UP) lane = LANE_BACK;
    else if (actions & ACTION_LANE_DOWN) lane = LANE_FRONT;
    let clickInput = null;
    if (click && screen === SCREEN_PLAY) {
      const station = world.stationAt(click.x, click.y);
      clickInput = station
        ? { x: station.def.x, stationId: station.def.id }
        : { x: click.x, stationId: null };
    }
    if (screen !== SCREEN_PLAY) return;
    const events = world.step(STEP, {
      move,
      lane,
      interact: Boolean(actions & ACTION_INTERACT),
      click: clickInput,
    });
    if (events) playEvents(events);
    if (events & EVENT_OVER) endGame();
    else if (events & EVENT_SERVE) announce(world.state.message);
    else if (events & EVENT_EXPIRE) announce(world.state.message);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP) {
        step(now);
        accumulator -= STEP;
        if (screen !== SCREEN_PLAY) { accumulator = 0; break; }
      }
    } else {
      // Title, pause and game-over still pump actions (start / resume / restart).
      handleActions();
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best, now / 1000);
  }

  // Leaving the tab pauses a running game rather than letting orders expire unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Jeda.');
    }
  });

  announce('Warung Nusantara. Tekan Spasi atau klik untuk mulai.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
