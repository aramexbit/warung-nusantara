// Warung Nusantara — Night Market Rush: every tuning number, station, recipe and colour
// in one place. The playfield is a fixed 1280x720 logical area; the renderer scales it to
// the window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** One shift: three minutes of night-market rush. */
export const SHIFT_SECONDS = 180;

export const CHEF = {
  width: 46,
  height: 92,
  speed: 430,
  /** Feet y of the two counter lanes: the back lane stands a small step nearer the bins. */
  laneBack: 596,
  laneFront: 616,
};

/** How close (in x) the chef must be to use a station. */
export const INTERACT_RADIUS = 96;

export const LIVES = 3;

/** Station kinds. */
export const KIND_BIN = 'bin';
export const KIND_CHOP = 'chop';
export const KIND_WOK = 'wok';
export const KIND_GRILL = 'grill';
export const KIND_PLATE = 'plate';
export const KIND_SINK = 'sink';
export const KIND_TRASH = 'trash';
export const KIND_SERVE = 'serve';

/** Which lane a station lives on: back (ingredient bins + serve hatch) or front (cooking). */
export const LANE_BACK = 'back';
export const LANE_FRONT = 'front';

/**
 * Every station on the two counters. Bins give a raw ingredient; chop/wok/grill turn one
 * raw ingredient into one cooked component; plate assembles components into a dish; the
 * sink washes dirty plates back to clean; trash throws anything away; the serve hatch
 * hands a finished dish to the customer whose ticket matches it.
 */
export const STATIONS = [
  { id: 'bin-nasi', kind: KIND_BIN, lane: LANE_BACK, x: 140, y: 216, w: 104, h: 76, gives: 'nasi', label: 'NASI' },
  { id: 'bin-mie', kind: KIND_BIN, lane: LANE_BACK, x: 300, y: 216, w: 104, h: 76, gives: 'mie', label: 'MIE' },
  { id: 'bin-ayam', kind: KIND_BIN, lane: LANE_BACK, x: 460, y: 216, w: 104, h: 76, gives: 'ayam', label: 'AYAM' },
  { id: 'bin-telur', kind: KIND_BIN, lane: LANE_BACK, x: 620, y: 216, w: 104, h: 76, gives: 'telur', label: 'TELUR' },
  { id: 'bin-sayur', kind: KIND_BIN, lane: LANE_BACK, x: 780, y: 216, w: 104, h: 76, gives: 'sayur', label: 'SAYUR' },
  { id: 'bin-bumbu', kind: KIND_BIN, lane: LANE_BACK, x: 940, y: 216, w: 104, h: 76, gives: 'bumbu', label: 'BUMBU' },
  { id: 'serve', kind: KIND_SERVE, lane: LANE_BACK, x: 1130, y: 210, w: 120, h: 88, label: 'ANTAR' },
  { id: 'chop', kind: KIND_CHOP, lane: LANE_FRONT, x: 150, y: 372, w: 150, h: 84, label: 'TALENAN' },
  { id: 'wok', kind: KIND_WOK, lane: LANE_FRONT, x: 350, y: 372, w: 150, h: 84, label: 'WAJAN' },
  { id: 'grill', kind: KIND_GRILL, lane: LANE_FRONT, x: 550, y: 372, w: 150, h: 84, label: 'PANGGANGAN' },
  { id: 'plate', kind: KIND_PLATE, lane: LANE_FRONT, x: 760, y: 372, w: 220, h: 84, label: 'PIRING' },
  { id: 'sink', kind: KIND_SINK, lane: LANE_FRONT, x: 980, y: 372, w: 120, h: 84, label: 'WASTAFEL' },
  { id: 'trash', kind: KIND_TRASH, lane: LANE_FRONT, x: 1140, y: 372, w: 100, h: 84, label: 'SAMPAH' },
];

/** Raw ingredients and the components they become. */
export const ITEMS = {
  nasi: { name: 'Nasi', color: '#f5f0e1', raw: true },
  mie: { name: 'Mie', color: '#f2c94c', raw: true },
  ayam: { name: 'Ayam', color: '#e8907c', raw: true },
  telur: { name: 'Telur', color: '#fdf3d0', raw: true },
  sayur: { name: 'Sayur', color: '#7dc383', raw: true },
  bumbu: { name: 'Bumbu', color: '#e5534b', raw: true },
  'nasi-goreng': { name: 'Nasi Goreng', color: '#d99a4e', cooked: 'wok' },
  'mie-goreng': { name: 'Mie Goreng', color: '#e8b23a', cooked: 'wok' },
  'ayam-cincang': { name: 'Ayam Cincang', color: '#e8907c', cooked: 'chop' },
  sate: { name: 'Sate', color: '#b06a35', cooked: 'grill' },
  'sayur-cincang': { name: 'Sayur Cincang', color: '#7dc383', cooked: 'chop' },
  'telur-iris': { name: 'Telur Iris', color: '#fdf3d0', cooked: 'chop' },
  gosong: { name: 'Gosong!', color: '#3a3230', burnt: true },
};

/** What each cooking station accepts, how long it takes, and the perfect window. */
export const COOK = {
  chop: {
    seconds: 1.6,
    accepts: { ayam: 'ayam-cincang', sayur: 'sayur-cincang', telur: 'telur-iris' },
  },
  wok: {
    seconds: 3.0,
    perfectFrom: 2.0,
    perfectTo: 3.4,
    burntAfter: 4.6,
    accepts: { nasi: 'nasi-goreng', mie: 'mie-goreng' },
  },
  grill: {
    seconds: 3.6,
    perfectFrom: 2.4,
    perfectTo: 4.0,
    burntAfter: 5.2,
    accepts: { ayam: 'sate' },
  },
};

export const WASH_SECONDS = 2.0;
export const PLATE_COUNT = 3;

/** The four dishes on the menu: price in thousands of rupiah, and the components a plate needs. */
export const DISHES = {
  'nasi-goreng': { name: 'Nasi Goreng', price: 15, needs: ['nasi-goreng', 'bumbu'] },
  'mie-ayam': { name: 'Mie Ayam', price: 12, needs: ['mie-goreng', 'ayam-cincang'] },
  'sate-ayam': { name: 'Sate Ayam', price: 18, needs: ['sate', 'bumbu'] },
  'gado-gado': { name: 'Gado-Gado', price: 10, needs: ['sayur-cincang', 'telur-iris'] },
};
export const DISH_IDS = ['nasi-goreng', 'mie-ayam', 'sate-ayam', 'gado-gado'];

/** Customers: how orders arrive, how long a customer waits, and the tip for a fast serve. */
export const ORDER = {
  firstAfter: 8,
  interval: 12,
  intervalJitter: 4,
  patience: 55,
  maxActive: 4,
  tipMax: 0.5,
};

/** Combo: each serve in a row without a mistake or an expired order adds 10%, up to double. */
export const COMBO = { step: 0.1, max: 2.0 };

/** Coins for one, two and three stars at the end of the shift. */
export const STARS = [140, 240, 360];

export const PALETTE = {
  sky: '#141c33',
  skyLow: '#232a45',
  awningRed: '#c0392b',
  awningCream: '#f5ead2',
  wood: '#6b4423',
  woodDark: '#4a2c15',
  counter: '#8a5a2b',
  counterTop: '#a9713a',
  floor: '#2b2118',
  floorLine: '#3a2c1e',
  text: '#f7f1e3',
  muted: '#b8a88f',
  gold: '#f2c94c',
  green: '#7dc383',
  red: '#e5534b',
  panel: '#1e2438',
  panelLine: '#3a4364',
  ticket: '#fff8e7',
  ticketInk: '#2b2118',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'warung-nusantara.best';
