import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Circle, CloudRain, Moon, Settings2, Snowflake, Sun, Wind as WindIcon } from 'lucide-react';

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
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    function handlePointerDown(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <aside className="environment-controls scene-controls" data-open={open} ref={rootRef} aria-label="Scene controls">
      <button className="scene-controls__trigger" type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <span className="scene-controls__trigger-icon" aria-hidden="true">
          <Settings2 size={17} strokeWidth={2.6} />
        </span>
        <span className="scene-controls__trigger-copy">
          <strong>Scene</strong>
          <small>Weather & light</small>
        </span>
        <ChevronDown className="scene-controls__chevron" size={16} strokeWidth={2.8} aria-hidden="true" />
      </button>
      <div className="scene-controls__panel">
        <div className="scene-controls__group">
          <span className="scene-controls__label">Lighting</span>
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
        </div>
        <div className="scene-controls__group">
          <span className="scene-controls__label">Weather</span>
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
        </div>
        <button type="button" className="wind-toggle" data-wind-toggle aria-pressed="false">
          <span aria-hidden="true">
            <WindIcon size={16} strokeWidth={2.8} />
          </span>
          Wind
        </button>
      </div>
    </aside>
  );
}
