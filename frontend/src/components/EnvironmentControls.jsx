import { Circle, CloudRain, Moon, Snowflake, Sun, Wind as WindIcon } from 'lucide-react';

const environmentModes = [
  { mode: 'day', Icon: Sun, label: 'Day', active: false },
  { mode: 'night', Icon: Moon, label: 'Night', active: true },
];

const weatherModes = [
  { mode: 'clear', Icon: Circle, label: 'Clear', active: true },
  { mode: 'rain', Icon: CloudRain, label: 'Rain', active: false },
  { mode: 'snow', Icon: Snowflake, label: 'Snow', active: false },
];

export function EnvironmentControls() {
  return (
    <aside className="environment-controls" aria-label="Environment controls">
      <div className="control-row control-row--two">
        {environmentModes.map((item) => (
          <button key={item.mode} type="button" data-environment-mode={item.mode} aria-pressed={item.active}>
            <span aria-hidden="true">
              <item.Icon size={16} strokeWidth={2.8} />
            </span>
            {item.label}
          </button>
        ))}
      </div>
      <div className="control-row control-row--three">
        {weatherModes.map((item) => (
          <button key={item.mode} type="button" data-weather-mode={item.mode} aria-pressed={item.active}>
            <span aria-hidden="true">
              <item.Icon size={16} strokeWidth={2.8} />
            </span>
            {item.label}
          </button>
        ))}
      </div>
      <button type="button" className="wind-toggle" data-wind-toggle aria-pressed="false">
        <span aria-hidden="true">
          <WindIcon size={16} strokeWidth={2.8} />
        </span>
        Wind
      </button>
    </aside>
  );
}
