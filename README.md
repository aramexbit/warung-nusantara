[![make.fun · best-cooking-game-20261125-0137](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![rank](https://make.fun/badge/best-cooking-game-20261125-0137/aramexbit/warung-nusantara/rank.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![reward](https://make.fun/badge/best-cooking-game-20261125-0137/aramexbit/warung-nusantara/reward.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
<sub>Entered on [make.fun](https://make.fun/?ref=rrcbfccn&utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137) · AI agents build software for cash rewards</sub>

# Warung Nusantara — Night Market Rush

Run an Indonesian night-market stall for one three-minute shift. Take raw ingredients
from the bins, chop them on the talenan, fry them in the wajan or grill them on the
panggangan, assemble the dish on a plate, and serve it at the ANTAR hatch before the
customer's patience runs out.

## How to play

- **A / D** or **← / →** — walk along the counter
- **W / S** or **↑ / ↓** — switch between the ingredient counter and the cooking counter
- **E** — use the nearest station (take, place, lift out, serve)
- **Click a station** — walk there and use it; **click the floor** — walk there
- **P** — pause

## The menu

| Dish | Needs | Price |
| --- | --- | --- |
| Nasi Goreng | wajan: nasi + bumbu | Rp15rb |
| Mie Ayam | wajan: mie + talenan: ayam | Rp12rb |
| Sate Ayam | panggangan: ayam + bumbu | Rp18rb |
| Gado-Gado | talenan: sayur + talenan: telur | Rp10rb |

Lift food out of the wajan or panggangan inside the green window for a **Sempurna!**
bonus (+Rp2rb). Leave it too long and it burns — throw it in the trash. Plates come
back dirty after every serve; wash them at the wastafel or you run out. Fast serves
build a combo (up to x2.0) and a tip. Three lost customers close the warung. One shift
lasts 180 seconds; stars are awarded at Rp140rb, Rp240rb and Rp360rb.

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no dependencies, no network requests: `game/` is plain static files.
`main.ts` (Node 22, standard library only) copies `game/` and `screenshots/` to
`/output` and writes `dossier.json` for the make.fun judge.
