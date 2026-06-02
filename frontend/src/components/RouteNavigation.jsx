import { Button } from './ui/Button.jsx';

const routeStops = [
  { stage: 'intro', progress: 0.02, label: 'Start', detail: 'Grid' },
  { stage: 'pace', progress: 0.35, label: 'Sector', detail: 'Race line' },
  { stage: 'social', progress: 0.58, label: 'Social', detail: 'Chicane' },
  { stage: 'contact', progress: 0.86, label: 'Contact', detail: 'Finish' },
];

export function RouteNavigation() {
  return (
    <nav className="track-nav" aria-label="Lap navigation">
      <div className="track-nav__header">
        <span>Lap Map</span>
        <strong id="route-progress-value">0%</strong>
      </div>
      <div className="track-nav__road" aria-hidden="true">
        <span className="track-nav__road-progress"></span>
        <span className="track-nav__runner"></span>
      </div>
      <div className="track-nav__stops">
        {routeStops.map((stop) => (
          <Button
            key={stop.stage}
            type="button"
            className="track-nav__stop"
            data-route-stage={stop.stage}
            data-route-progress={stop.progress}
            aria-current={stop.stage === 'intro'}
          >
            <span className="track-nav__marker" aria-hidden="true"></span>
            <span className="track-nav__text">
              <strong>{stop.label}</strong>
              <small>{stop.detail}</small>
            </span>
          </Button>
        ))}
      </div>
    </nav>
  );
}
