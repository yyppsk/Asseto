# Real Track Models

Version 2 loads the downloaded model package from:

```text
frontend/public/models/real track/source/track.glb
```

The original downloaded folder name is kept intact so any embedded or sibling texture references stay valid. The URL used by Vite is:

```text
/models/real%20track/source/track.glb
```

Version 2 now hides the procedural Spa road and derives the car route from the imported model's `road` mesh. The model is fitted larger than the earlier pass so the Ferrari sits at a more believable scale, and the route is built from averaged road UV cross-sections rather than one brittle vertex stripe. This keeps the car on the visible asphalt through the late social/contact stretch.

Version 3 loads the test model from:

```text
backup/version-1-and-3/public/models/real track 2/nurburgring_race_driver_grid_ds.glb
```

Version 3 is kept only as backup code/assets and is no longer imported by the active app. It derived an open test route from marker mesh chunks in the imported model. This is good enough for a local test page, but the highest-quality future improvement would be a hand-authored centerline or exported curve from the track source file.

Suggested free candidates to try:

- Sketchfab "Race Track (23mb glb)" by cemalettinPRO:
  https://sketchfab.com/3d-models/race-track-23mb-glb-1d3a0a5a7f5c48ecbc8ff967ec36e6e5
- RigModels racetrack search, including several free racetrack/segment assets:
  https://rigmodels.com/index.php?searchkeyword=racetrack
