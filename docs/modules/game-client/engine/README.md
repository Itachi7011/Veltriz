# `game-client/src/pages/game/engine/` — module docs index

Every file in this folder, one doc each (two small tightly-coupled files
share one doc). Start with `GameEngine.md` if you're trying to trace how
something happens end-to-end — it's the orchestrator every other file
plugs into.

| File | What it owns |
|---|---|
| [`GameEngine.md`](./GameEngine.md) | The render loop, input, and every subsystem below |
| [`PhysicsController.md`](./PhysicsController.md) | On-foot movement, collision, gravity/jump, stairs |
| [`CameraRig.md`](./CameraRig.md) | Camera, mouse-look, the project's forward/right convention |
| [`CharacterModel.md`](./CharacterModel.md) | The shared human rig — player, NPCs, drivers, remote players |
| [`VehicleModel.md`](./VehicleModel.md) | Procedural car/truck/van/SUV/bike/motorbike geometry |
| [`VehicleController.md`](./VehicleController.md) | Per-vehicle driving physics |
| [`VehicleSystem.md`](./VehicleSystem.md) | The pool of active vehicles, enter/exit/carjack |
| [`BuildingBuilder.md`](./BuildingBuilder.md) | Procedural buildings/houses, walk-in house interiors |
| [`WorldBuilder.md`](./WorldBuilder.md) | Terrain, roads, zone labels, paved building/house aprons |
| [`NpcSystem.md`](./NpcSystem.md) | Pedestrian NPC spawning/wander/combat |
| [`WorldEventSystem.md`](./WorldEventSystem.md) | Scripted crowd events (rallies, gang clashes) |
| [`WeaponSystem.md`](./WeaponSystem.md) | Equip/aim/fire, hit detection |
| [`AudioSystem.md`](./AudioSystem.md) | Procedural Web Audio SFX/music |
| [`BillboardSystem.md`](./BillboardSystem.md) | Live-data building banners (stock/commodity/political/ad screens) |
| [`FactionData-and-FactionFlags.md`](./FactionData-and-FactionFlags.md) | Fictional political parties/gangs + their flag sprites |

Two conventions come up across almost every file above and are worth
internalizing before making changes anywhere in this folder:

1. **A character rig's front is local -Z**, requiring
   `rotation.y = heading/yaw + Math.PI` to face its direction of travel —
   explained fully in `CharacterModel.md`, with a real bug history of
   places that forgot it.
2. **A vehicle chassis's front is local +X**, and a wheel's axle has to be
   built along local **Z** — explained fully in `VehicleModel.md`, also
   with a real bug history (plus a separate, non-axis bug: a truck's cab/
   bed were once swapped front-to-back).
