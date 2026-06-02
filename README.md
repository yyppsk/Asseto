# Asseto Spa Scroll

A Vite + Three.js scroll experience where the car races around Spa-Francorchamps and reveals social/contact details at the chicane.

## Run

```bash
yarn install
yarn dev
```

The dev server defaults to `http://localhost:5173`.

## Assets

- Car: `public/models/ferrari.glb`, downloaded from the official Three.js example assets.
- Track: `public/data/tum-spa-track.csv` and `public/data/tum-spa-raceline.csv`, downloaded from https://github.com/TUMFTM/racetrack-database and used under LGPL-3.0.

The large Mustang OBJ from the workspace is left untouched, but the app now uses the smaller real GLB car so the scene starts with a realistic vehicle instead of a generated placeholder.
