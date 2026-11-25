// Warung Nusantara's rules and state, with no drawing and no browser in it: the chef,
// the two counters, cooking stations, plates, the sink, orders, tips, combos and the
// shift clock. step() advances one fixed step and returns what happened as bit flags, so
// the caller can react (and play sounds) without the world knowing about screens.
// Nothing here allocates after createWorld returns.

import {
  CHEF, COOK, DISHES, DISH_IDS, INTERACT_RADIUS, LANE_BACK, LANE_FRONT, LIVES,
  ORDER, PLATE_COUNT, SHIFT_SECONDS, STATIONS, WASH_SECONDS, COMBO, STARS,
} from './config.js';

export const EVENT_PICKUP = 1;
export const EVENT_SERVE = 2;
export const EVENT_EXPIRE = 4;
export const EVENT_BURNT = 8;
export const EVENT_COOK_DONE = 16;
export const EVENT_OVER = 32;
export const EVENT_ERROR = 64;
export const EVENT_WASH_DONE = 128;
export const EVENT_PERFECT = 256;

const CUSTOMER_SLOTS = [220, 540, 850, 1030];

function isComponent(item) {
  if (item === null) return false;
  return item === 'bumbu' || item === 'nasi-goreng' || item === 'mie-goreng'
    || item === 'ayam-cincang' || item === 'sate' || item === 'sayur-cincang' || item === 'telur-iris';
}

/** The dishes whose ingredient list still fits `components` plus `item`. */
function fitsDish(components, item) {
  const next = components.concat([item]);
  return DISH_IDS.filter((id) => next.every((c) => DISHES[id].needs.includes(c)));
}

export function createWorld(random) {
  const chef = {
    x: 640, lane: LANE_FRONT, dir: 1, carry: null,
    targetX: null, targetLane: null, autoInteract: null, hop: 0,
  };
  const stations = STATIONS.map((def) => ({
    def, item: null, progress: 0, done: false, burnt: false, washing: false, flash: 0,
  }));
  const plateSlots = [];
  for (let i = 0; i < PLATE_COUNT; i += 1) plateSlots.push(null);
  const orders = [];
  const state = {
    chef, stations, plateSlots, orders,
    elapsed: 0, coins: 0, served: 0, expired: 0, burntCount: 0, perfectCount: 0,
    combo: 1, comboStreak: 0, lives: LIVES, dirtyPlates: 0,
    spawnTimer: ORDER.firstAfter, over: false, overReason: '',
    message: '', messageTimer: 0, perfectFlash: 0,
  };

  function cleanPlates() {
    let inUse = 0;
    for (const slot of plateSlots) if (slot !== null) inUse += 1;
    return PLATE_COUNT - inUse - state.dirtyPlates;
  }

  function stationById(id) {
    for (const s of stations) if (s.def.id === id) return s;
    return null;
  }

  /** The station on `lane` nearest to x, within reach, or null. */
  function nearestStation(lane, x) {
    let best = null;
    let bestDist = INTERACT_RADIUS;
    for (const s of stations) {
      if (s.def.lane !== lane) continue;
      const d = Math.abs(s.def.x - x);
      if (d <= bestDist) {
        bestDist = d;
        best = s;
      }
    }
    return best;
  }

  /** The station whose drawn box contains the point (with a little padding), or null. */
  function stationAt(x, y) {
    for (const s of stations) {
      const d = s.def;
      if (x >= d.x - d.w / 2 - 8 && x <= d.x + d.w / 2 + 8 && y >= d.y - d.h / 2 - 10 && y <= d.y + d.h / 2 + 10) return s;
    }
    return null;
  }

  function newCustomer() {
    const skins = ['#f2c9a0', '#d9a066', '#a06a3b', '#8a5a2b'];
    const shirts = ['#e5534b', '#2e86ab', '#7dc383', '#f2c94c', '#9b59b6'];
    const hats = ['cap', 'songkok', 'bandana', 'none'];
    return {
      skin: skins[Math.floor(random() * skins.length)],
      shirt: shirts[Math.floor(random() * shirts.length)],
      hat: hats[Math.floor(random() * hats.length)],
    };
  }

  function spawnOrder() {
    let slot = -1;
    for (let i = 0; i < ORDER.maxActive; i += 1) {
      if (!orders.some((o) => o.slot === i)) { slot = i; break; }
    }
    if (slot === -1) return;
    const dish = DISH_IDS[Math.floor(random() * DISH_IDS.length)];
    orders.push({
      dish, slot, x: CUSTOMER_SLOTS[slot], patience: ORDER.patience,
      maxPatience: ORDER.patience, customer: newCustomer(), born: state.elapsed,
    });
  }

  function say(text) {
    state.message = text;
    state.messageTimer = 2.2;
  }

  function serveDish(station) {
    if (chef.carry === null || !DISHES[chef.carry]) return EVENT_ERROR;
    const dish = chef.carry;
    let target = null;
    for (const o of orders) if (o.dish === dish) { target = o; break; }
    if (target === null) {
      say(`Tidak ada yang pesan ${DISHES[dish].name}`);
      return EVENT_ERROR;
    }
    const tip = Math.round(DISHES[dish].price * ORDER.tipMax * (target.patience / target.maxPatience));
    const earned = Math.round((DISHES[dish].price + tip) * state.combo);
    state.coins += earned;
    state.served += 1;
    state.comboStreak += 1;
    state.combo = Math.min(COMBO.max, 1 + state.comboStreak * COMBO.step);
    state.dirtyPlates += 1;
    orders.splice(orders.indexOf(target), 1);
    chef.carry = null;
    say(`+Rp${earned}rb — ${DISHES[dish].name} diantar!`);
    return EVENT_SERVE;
  }

  function useStation(station) {
    const def = station.def;
    station.flash = 0.35;
    if (def.kind === 'bin') {
      if (chef.carry !== null) { say('Tangan penuh!'); return EVENT_ERROR; }
      chef.carry = def.gives;
      return EVENT_PICKUP;
    }
    if (def.kind === 'trash') {
      if (chef.carry === null) return EVENT_ERROR;
      chef.carry = null;
      say('Dibuang.');
      return EVENT_PICKUP;
    }
    if (def.kind === 'serve') return serveDish(station);
    if (def.kind === 'sink') {
      if (state.dirtyPlates === 0) { say('Tidak ada piring kotor.'); return EVENT_ERROR; }
      if (station.washing) return EVENT_ERROR;
      station.washing = true;
      station.progress = 0;
      return EVENT_PICKUP;
    }
    if (def.kind === 'plate') {
      if (chef.carry !== null) {
        if (!isComponent(chef.carry)) { say('Bahan mentah tidak bisa disajikan.'); return EVENT_ERROR; }
        // Prefer a slot this component still fits, with the most pieces already on it.
        let target = -1;
        let targetScore = -1;
        for (let i = 0; i < plateSlots.length; i += 1) {
          const slot = plateSlots[i];
          if (slot === null) continue;
          if (slot.dish !== null) continue;
          if (fitsDish(slot.components, chef.carry).length === 0) continue;
          if (slot.components.length > targetScore) { targetScore = slot.components.length; target = i; }
        }
        if (target === -1) {
          if (cleanPlates() <= 0) { say('Tidak ada piring bersih — cuci dulu!'); return EVENT_ERROR; }
          for (let i = 0; i < plateSlots.length; i += 1) {
            if (plateSlots[i] === null) { target = i; break; }
          }
          if (target === -1) { say('Tidak ada piring kosong.'); return EVENT_ERROR; }
          plateSlots[target] = { components: [], dish: null };
        }
        const slot = plateSlots[target];
        slot.components.push(chef.carry);
        chef.carry = null;
        const done = DISH_IDS.find((id) => {
          const needs = DISHES[id].needs;
          return needs.length === slot.components.length && needs.every((c) => slot.components.includes(c));
        });
        if (done) {
          slot.dish = done;
          say(`${DISHES[done].name} siap diantar!`);
        }
        return EVENT_PICKUP;
      }
      // Empty hands: pick up a finished dish.
      for (let i = 0; i < plateSlots.length; i += 1) {
        const slot = plateSlots[i];
        if (slot !== null && slot.dish !== null) {
          chef.carry = slot.dish;
          plateSlots[i] = null;
          return EVENT_PICKUP;
        }
      }
      return EVENT_ERROR;
    }
    // chop / wok / grill
    const cook = COOK[def.kind];
    if (station.item === null) {
      if (chef.carry === null) return EVENT_ERROR;
      const out = cook.accepts[chef.carry];
      if (!out) { say(`Tidak bisa dimasak di ${def.label}.`); return EVENT_ERROR; }
      station.item = chef.carry;
      station.output = out;
      station.progress = 0;
      station.done = false;
      station.burnt = false;
      chef.carry = null;
      return EVENT_PICKUP;
    }
    if (station.burnt) {
      if (chef.carry !== null) { say('Tangan penuh!'); return EVENT_ERROR; }
      chef.carry = 'gosong';
      station.item = null;
      station.burnt = false;
      return EVENT_PICKUP;
    }
    if (!station.done) return EVENT_ERROR;
    if (chef.carry !== null) { say('Tangan penuh!'); return EVENT_ERROR; }
    const perfect = cook.perfectFrom !== undefined
      && station.progress >= cook.perfectFrom && station.progress <= cook.perfectTo;
    chef.carry = station.output;
    if (perfect) {
      state.coins += 2;
      state.perfectCount += 1;
      state.perfectFlash = 1.2;
      say('Sempurna! +Rp2rb');
    }
    station.item = null;
    station.done = false;
    return perfect ? EVENT_PERFECT : EVENT_PICKUP;
  }

  function interact() {
    const station = nearestStation(chef.lane, chef.x);
    if (station === null) return 0;
    return useStation(station);
  }

  function reset() {
    chef.x = 640;
    chef.lane = LANE_FRONT;
    chef.dir = 1;
    chef.carry = null;
    chef.targetX = null;
    chef.targetLane = null;
    chef.autoInteract = null;
    chef.hop = 0;
    for (const s of stations) {
      s.item = null;
      s.progress = 0;
      s.done = false;
      s.burnt = false;
      s.washing = false;
      s.flash = 0;
    }
    for (let i = 0; i < plateSlots.length; i += 1) plateSlots[i] = null;
    orders.length = 0;
    state.elapsed = 0;
    state.coins = 0;
    state.served = 0;
    state.expired = 0;
    state.burntCount = 0;
    state.perfectCount = 0;
    state.combo = 1;
    state.comboStreak = 0;
    state.lives = LIVES;
    state.dirtyPlates = 0;
    state.spawnTimer = ORDER.firstAfter;
    state.over = false;
    state.overReason = '';
    state.message = '';
    state.messageTimer = 0;
    state.perfectFlash = 0;
  }

  /**
   * One fixed step. `input` is { move (-1/0/1), lane ('back'/'front'/null to switch),
   * interact (bool), click ({x, stationId} or null) }. Returns the EVENT_* flags.
   */
  function step(dt, input) {
    let events = 0;
    if (state.over) return events;
    state.elapsed += dt;
    if (state.messageTimer > 0) state.messageTimer -= dt;
    if (state.perfectFlash > 0) state.perfectFlash -= dt;
    if (chef.hop > 0) chef.hop -= dt;

    // Lane switch (W/S or a click on the other counter's station).
    if (input.lane && input.lane !== chef.lane) {
      chef.lane = input.lane;
      chef.hop = 0.18;
    }
    // Click: walk to the station (switching lane first), then use it on arrival.
    if (input.click) {
      const s = input.click.stationId ? stationById(input.click.stationId) : null;
      if (s) {
        chef.targetX = s.def.x;
        chef.targetLane = s.def.lane;
        chef.autoInteract = s.def.id;
      } else {
        chef.targetX = Math.max(60, Math.min(1220, input.click.x));
        chef.targetLane = null;
        chef.autoInteract = null;
      }
    }
    // Keyboard steering cancels a walk target.
    if (input.move !== 0) {
      chef.targetX = null;
      chef.targetLane = null;
      chef.autoInteract = null;
      chef.x = Math.max(60, Math.min(1220, chef.x + input.move * CHEF.speed * dt));
      chef.dir = input.move;
    } else if (chef.targetX !== null) {
      if (chef.targetLane && chef.targetLane !== chef.lane) chef.lane = chef.targetLane;
      const dx = chef.targetX - chef.x;
      if (Math.abs(dx) <= 5) {
        chef.x = chef.targetX;
        chef.targetX = null;
        if (chef.autoInteract) {
          const s = stationById(chef.autoInteract);
          chef.autoInteract = null;
          if (s) events |= useStation(s);
        }
      } else {
        chef.dir = dx > 0 ? 1 : -1;
        chef.x += chef.dir * CHEF.speed * dt;
      }
    }
    if (input.interact) events |= interact();

    // Cooking stations advance; wok and grill burn if left too long.
    for (const s of stations) {
      if (s.flash > 0) s.flash -= dt;
      if (s.item === null) continue;
      const cook = COOK[s.def.kind];
      if (!cook) continue;
      s.progress += dt;
      if (!s.done && s.progress >= cook.seconds) {
        s.done = true;
        events |= EVENT_COOK_DONE;
      }
      if (cook.burntAfter && !s.burnt && s.progress >= cook.burntAfter) {
        s.burnt = true;
        s.done = false;
        state.burntCount += 1;
        events |= EVENT_BURNT;
        say('Gosong! Buang ke tempat sampah.');
      }
    }
    // The sink washes one dirty plate at a time.
    const sink = stationById('sink');
    if (sink && sink.washing) {
      sink.progress += dt;
      if (sink.progress >= WASH_SECONDS) {
        sink.washing = false;
        sink.progress = 0;
        state.dirtyPlates = Math.max(0, state.dirtyPlates - 1);
        events |= EVENT_WASH_DONE;
      }
    }

    // Orders arrive, wait, and walk away.
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0 && orders.length < ORDER.maxActive) {
      spawnOrder();
      state.spawnTimer = ORDER.interval + random() * ORDER.intervalJitter;
    }
    for (let i = orders.length - 1; i >= 0; i -= 1) {
      const o = orders[i];
      o.patience -= dt;
      if (o.patience <= 0) {
        orders.splice(i, 1);
        state.expired += 1;
        state.lives -= 1;
        state.combo = 1;
        state.comboStreak = 0;
        events |= EVENT_EXPIRE;
        say(`Pelanggan pergi — ${DISHES[o.dish].name} tidak jadi!`);
        if (state.lives <= 0) {
          state.over = true;
          state.overReason = 'lives';
          events |= EVENT_OVER;
        }
      }
    }

    if (!state.over && state.elapsed >= SHIFT_SECONDS) {
      state.over = true;
      state.overReason = 'shift';
      events |= EVENT_OVER;
    }
    return events;
  }

  /** Stars earned for the coins on the table (0-3). */
  function stars() {
    let n = 0;
    for (const bar of STARS) if (state.coins >= bar) n += 1;
    return n;
  }

  reset();
  return {
    state, reset, step, interact, nearestStation, stationAt, cleanPlates, stars,
    // Staging only (used by the screenshot scenes): put one more order on the board.
    stageOrder: spawnOrder,
    timeLeft() { return Math.max(0, SHIFT_SECONDS - state.elapsed); },
  };
}
