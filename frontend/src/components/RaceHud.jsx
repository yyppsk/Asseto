export function RaceHud() {
  return (
    <>
      <aside className="race-hud" aria-label="Race status">
        <div>
          <span>Track</span>
          <strong id="track-name">Spa-Francorchamps</strong>
        </div>
        <div>
          <span>Segment</span>
          <strong id="segment-name">La Source</strong>
        </div>
      </aside>

      <aside className="grid-readout" aria-live="polite">
        <span>Grid</span>
        <strong id="grid-cell">--</strong>
        <small id="grid-position">X -- / Z --</small>
      </aside>

      <aside className="track-version-status" aria-live="polite">
        <span>Version</span>
        <strong id="track-version-label">Version 2</strong>
        <small id="track-version-detail">Loading real track variation</small>
      </aside>

      <div className="progress-rail" aria-hidden="true">
        <span id="lap-progress"></span>
      </div>

      <footer id="track-credit" className="credit">
        Track geometry from TUMFTM racetrack-database, LGPL-3.0.
      </footer>
    </>
  );
}
