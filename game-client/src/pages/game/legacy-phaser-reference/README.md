# Legacy Phaser scene (kept for reference, not built)

This folder holds the original 2D top-down Phaser + Matter.js scene
(`MainScene.js`, `config.js`). It is **not imported anywhere** in the app
anymore — `GamePage.jsx` now boots `../engine/GameEngine.js`, a Three.js +
cannon-es 3D engine (first/third-person camera, real physics, jointed
3D characters, extruded 3D buildings).

It's kept here rather than deleted only so the exact previous building
placement / interaction-zone logic is easy to diff against if you ever
want to double check the new engine reproduces the same building list,
spawn point, etc. It has no runtime effect and can be safely deleted once
you've confirmed the new engine covers everything you need.

`phaser` and `matter-js` were removed from `package.json` accordingly —
if you want to keep this folder runnable standalone, re-add them.
