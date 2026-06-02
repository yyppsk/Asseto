# Real Track Model

Version 2 currently loads the downloaded model package from:

```text
public/models/real track/source/track.glb
```

The original downloaded folder name is kept intact so any embedded or sibling texture references stay valid. The URL used by Vite is:

```text
/models/real%20track/source/track.glb
```

Current limitation: this imported circuit model is not the same Spa route used by the scroll-driven car path. Version 2 therefore renders the real GLB as the real-model track variation while keeping the smooth Spa drive path visible for the cars. To make the cars drive exactly on this imported model, the next step is to add or derive a matching centerline/path for the GLB.

Suggested free candidates to try:

- Sketchfab "Race Track (23mb glb)" by cemalettinPRO:
  https://sketchfab.com/3d-models/race-track-23mb-glb-1d3a0a5a7f5c48ecbc8ff967ec36e6e5
- RigModels racetrack search, including several free racetrack/segment assets:
  https://rigmodels.com/index.php?searchkeyword=racetrack
