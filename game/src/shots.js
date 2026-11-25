// The screenshot scenes behind ?shot=start|play|rush|end. Each one plays the real rules
// forward from a fresh world, steered by a small autopilot that works the oldest order's
// recipe (bins -> chop/wok/grill -> plate -> serve, washing plates when it must), so the
// frame is what a real game looks like and the same seed always gives the same frame.

import { COOK, DISHES, LANE_BACK, LANE_FRONT, SHIFT_SECONDS, STEP } from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_IDLE_SECONDS = 12;

/** Where each component comes from: the station that makes it and the raw item it needs. */
const MAKE = {
  'nasi-goreng': { station: 'wok', raw: 'nasi' },
  'mie-goreng': { station: 'wok', raw: 'mie' },
  'ayam-cincang': { station: 'chop', raw: 'ayam' },
  sate: { station: 'grill', raw: 'ayam' },
  'sayur-cincang': { station: 'chop', raw: 'sayur' },
  'telur-iris': { station: 'chop', raw: 'telur' },
  bumbu: { station: 'bin-bumbu', raw: 'bumbu' },
};

function stationById(world, id) {
  return world.state.stations.find((s) => s.def.id === id);
}

function chefAt(world, stationId) {
  const s = stationById(world, stationId);
  return Math.abs(world.state.chef.x - s.def.x) <= 5 && world.state.chef.lane === s.def.lane;
}

/**
 * The autopilot: a queue of small jobs, each a station to use plus the moment it may be
 * used and the moment it counts as done. One step of the world per call; returns true
 * while the autopilot still has work to do.
 */
function createAutopilot(world) {
  let jobs = [];
  let current = null;
  let clicked = false;
  let waited = 0;

  function planFor(order) {
    const jobsOut = [];
    for (const component of DISHES[order.dish].needs) {
      const make = MAKE[component];
      if (make.station.startsWith('bin')) {
        jobsOut.push({ station: make.station, ready: () => true, done: () => world.state.chef.carry === component });
      } else {
        const rawBin = `bin-${make.raw}`;
        jobsOut.push({ station: rawBin, ready: () => true, done: () => world.state.chef.carry === make.raw });
        jobsOut.push({
          station: make.station,
          ready: () => world.state.chef.carry === make.raw,
          done: () => {
            const s = stationById(world, make.station);
            return s.item === make.raw && !s.done && !s.burnt;
          },
        });
        jobsOut.push({
          station: make.station,
          ready: () => {
            const s = stationById(world, make.station);
            return s.done && !s.burnt;
          },
          done: () => world.state.chef.carry === component,
        });
      }
      jobsOut.push({ station: 'plate', ready: () => true, done: () => world.state.chef.carry === null });
    }
    jobsOut.push({ station: 'plate', ready: () => true, done: () => world.state.chef.carry === order.dish });
    jobsOut.push({ station: 'serve', ready: () => true, done: () => !world.state.orders.includes(order) });
    return jobsOut;
  }

  function replan() {
    // A burnt station comes first: take the mess out and throw it away.
    for (const s of world.state.stations) {
      if (!s.burnt) continue;
      jobs = [
        { station: s.def.id, ready: () => true, done: () => world.state.chef.carry === 'gosong' },
        { station: 'trash', ready: () => true, done: () => world.state.chef.carry === null },
      ];
      current = null;
      clicked = false;
      return;
    }
    // No clean plate and a dirty one waiting: wash first.
    if (world.cleanPlates() <= 0 && world.state.dirtyPlates > 0) {
      jobs = [{ station: 'sink', ready: () => true, done: () => world.state.dirtyPlates === 0 || world.cleanPlates() > 0 }];
      current = null;
      clicked = false;
      return;
    }
    // Work the most urgent order.
    let urgent = null;
    for (const o of world.state.orders) if (!urgent || o.patience < urgent.patience) urgent = o;
    if (!urgent) {
      jobs = [];
      return;
    }
    jobs = planFor(urgent);
    current = null;
    clicked = false;
  }

  function step() {
    if (world.state.over) return false;
    if (jobs.length === 0) replan();
    if (jobs.length === 0) {
      world.step(STEP, { move: 0, lane: null, interact: false, click: null });
      return true;
    }
    if (current === null) {
      current = jobs[0];
      clicked = false;
      waited = 0;
    }
    if (current.done()) {
      jobs.shift();
      current = null;
      clicked = false;
      return step();
    }
    // A job whose moment never comes (the wok burnt while the chef was busy) is
    // abandoned after eight seconds: the replan takes the mess out first.
    waited += 1;
    if (waited > 480) {
      jobs = [];
      current = null;
      clicked = false;
      return step();
    }
    if (!current.ready()) {
      world.step(STEP, { move: 0, lane: null, interact: false, click: null });
      return true;
    }
    if (!clicked) {
      const s = stationById(world, current.station);
      world.step(STEP, { move: 0, lane: null, interact: false, click: { x: s.def.x, stationId: s.def.id } });
      clicked = true;
      return true;
    }
    // Walking to the station, or the station is being used on arrival.
    world.step(STEP, { move: 0, lane: null, interact: false, click: null });
    if (chefAt(world, current.station) && world.state.chef.targetX === null && !current.done()) {
      // Arrived but the click's auto-use did not fire (hands were full, say): retry once.
      clicked = false;
    }
    return true;
  }

  return { step };
}

function playUntil(world, minServed, minOrders, maxSeconds) {
  const pilot = createAutopilot(world);
  const steps = Math.floor(maxSeconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    if (world.state.over) break;
    if (world.state.served >= minServed && world.state.orders.length >= minOrders) break;
    pilot.step();
  }
}

function stageStart(world) {
  world.reset();
  // Twelve quiet seconds: orders arrive, the stall fills in.
  for (let i = 0; i < START_IDLE_SECONDS / STEP; i += 1) {
    world.step(STEP, { move: 0, lane: null, interact: false, click: null });
  }
  // A wok mid-sizzle and a board mid-chop, the way a kitchen looks at 19:00.
  const wok = stationById(world, 'wok');
  wok.item = 'nasi';
  wok.output = 'nasi-goreng';
  wok.progress = 2.2;
  const chop = stationById(world, 'chop');
  chop.item = 'ayam';
  chop.output = 'ayam-cincang';
  chop.progress = 1.0;
  world.state.plateSlots[0] = { components: ['nasi-goreng'], dish: null };
  world.state.chef.x = 500;
  world.state.chef.lane = LANE_FRONT;
  return { screen: SCREEN_TITLE, best: 0 };
}

function stagePlay(world) {
  world.reset();
  // Play until a dish is served and the board is full again, so the frame shows the
  // whole loop at once: tickets, a wok mid-sizzle and a chef mid-task. The autopilot
  // serves faster than orders spawn, so stage one extra order to keep the board busy.
  playUntil(world, 1, 2, 50);
  world.stageOrder();
  return { screen: SCREEN_PLAY, best: world.state.coins };
}

function stageRush(world) {
  world.reset();
  playUntil(world, 4, 3, 100);
  world.stageOrder();
  world.stageOrder();
  return { screen: SCREEN_PLAY, best: world.state.coins };
}

function stageEnd(world) {
  world.reset();
  // Play the whole shift on autopilot, then let the clock run out.
  const pilot = createAutopilot(world);
  for (let i = 0; i < SHIFT_SECONDS / STEP; i += 1) {
    if (world.state.over) break;
    pilot.step();
  }
  if (!world.state.over) {
    world.state.elapsed = SHIFT_SECONDS;
    world.step(STEP, { move: 0, lane: null, interact: false, click: null });
  }
  return { screen: SCREEN_OVER, best: world.state.coins };
}

/**
 * Set `world` to the named scene (start, play, rush or end; any other name is start) and
 * return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  if (name === 'play') return stagePlay(world);
  if (name === 'rush') return stageRush(world);
  if (name === 'end') return stageEnd(world);
  return stageStart(world);
}
