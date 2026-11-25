// Keyboard and pointer input for the warung. Held keys steer the chef left and right;
// one-shot presses (interact, switch counter lane, pause, confirm) are queued as bit
// flags and taken once by the loop, so a press between two frames is never lost and never
// counted twice. A mouse click is recorded raw; the loop turns it into a walk target.

export const ACTION_INTERACT = 1;
export const ACTION_PAUSE = 2;
export const ACTION_CONFIRM = 4;
export const ACTION_LANE_UP = 8;
export const ACTION_LANE_DOWN = 16;

const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const INTERACT = new Set(['KeyE']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const LANE_UP = new Set(['ArrowUp', 'KeyW']);
const LANE_DOWN = new Set(['ArrowDown', 'KeyS']);

export function createInput(target) {
  let left = false;
  let right = false;
  let actions = 0;
  let click = null;

  window.addEventListener('keydown', (event) => {
    if (LEFT.has(event.code)) left = true;
    else if (RIGHT.has(event.code)) right = true;
    else if (INTERACT.has(event.code)) {
      if (!event.repeat) actions |= ACTION_INTERACT;
    } else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (LANE_UP.has(event.code)) {
      if (!event.repeat) actions |= ACTION_LANE_UP;
    } else if (LANE_DOWN.has(event.code)) {
      if (!event.repeat) actions |= ACTION_LANE_DOWN;
    } else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (LEFT.has(event.code)) left = false;
    else if (RIGHT.has(event.code)) right = false;
  });
  // A key released while the tab is hidden never sends keyup: let go of everything on blur.
  window.addEventListener('blur', () => {
    left = false;
    right = false;
  });
  target.addEventListener('pointerdown', (event) => {
    click = { clientX: event.clientX, clientY: event.clientY };
    // A click also confirms: it starts the game from the title or the game-over screen.
    actions |= ACTION_CONFIRM;
  });

  return {
    /** -1 for left, 1 for right, 0 for neither or both. */
    direction() {
      return (right ? 1 : 0) - (left ? 1 : 0);
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** The last click since the last call, in client pixels, or null. */
    takeClick() {
      const taken = click;
      click = null;
      return taken;
    },
  };
}
