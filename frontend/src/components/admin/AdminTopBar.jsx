import { ExternalLink, Moon, Plus, Sun } from 'lucide-react';
import { navigate } from '../../api.js';

export function AdminTopBar({ module, onCreateSection, onThemeChange, status, theme, user }) {
  return (
    <header className="admin-topbar">
      <div className="admin-topbar__copy">
        <p className="eyebrow">Race Control</p>
        <h1>{module.title}</h1>
        <span>{module.detail}</span>
      </div>

      <div className="admin-topbar__actions">
        <div className={status ? 'admin-live-status is-active' : 'admin-live-status'}>
          <span aria-hidden="true"></span>
          {status || 'Ready'}
        </div>
        <AppearanceToggle theme={theme} onChange={onThemeChange} />
        <button className="admin-secondary-action" type="button" onClick={() => navigate('/')}>
          <ExternalLink aria-hidden="true" />
          View Site
        </button>
        {user?.isAdmin && module.id === 'content' ? (
          <button type="button" onClick={onCreateSection}>
            <Plus aria-hidden="true" />
            New Section
          </button>
        ) : null}
      </div>
    </header>
  );
}

function AppearanceToggle({ onChange, theme }) {
  const options = [
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'light', label: 'Light', icon: Sun },
  ];

  return (
    <div className="admin-theme-toggle" aria-label="Admin appearance">
      {options.map((option) => {
        const Icon = option.icon;
        const active = theme === option.value;

        return (
          <button
            aria-pressed={active}
            className={active ? 'is-active' : ''}
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
          >
            <Icon aria-hidden="true" />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
