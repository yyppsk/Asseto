import { CircleDot, LogOut } from 'lucide-react';
import { displayRole } from './adminTheme.js';

export function AdminRail({ activeModule, modules, onLogout, onModuleChange, user }) {
  const groupedModules = modules.reduce((groups, module) => {
    const group = module.group || 'Operate';
    return { ...groups, [group]: [...(groups[group] || []), module] };
  }, {});

  return (
    <aside className="admin-rail">
      <button className="admin-brand" type="button" onClick={() => window.location.assign('/')}>
        <span className="admin-brand__mark">PI</span>
        <span>
          <strong>Paddock India</strong>
          <small>Operations</small>
        </span>
      </button>

      <div className="admin-environment-pill">
        <CircleDot aria-hidden="true" />
        Local workspace
      </div>

      <nav className="admin-nav" aria-label="Admin modules">
        {Object.entries(groupedModules).map(([group, groupModules]) => (
          <div className="admin-nav__group" key={group}>
            <span>{group}</span>
            {groupModules.map((module) => (
              <AdminNavButton
                active={activeModule === module.id}
                key={module.id}
                module={module}
                onClick={() => onModuleChange(module.id)}
              />
            ))}
          </div>
        ))}
      </nav>

      <div className="admin-rail__account">
        <span>{displayRole(user)}</span>
        <strong>{user?.email || 'Loading account'}</strong>
        {user ? (
          <button className="admin-logout" type="button" onClick={onLogout}>
            <LogOut aria-hidden="true" />
            Logout
          </button>
        ) : null}
      </div>
    </aside>
  );
}

function AdminNavButton({ active, module, onClick }) {
  const Icon = module.icon;

  return (
    <button
      aria-current={active ? 'page' : undefined}
      className={active ? 'admin-nav__item is-active' : 'admin-nav__item'}
      type="button"
      onClick={onClick}
    >
      <Icon aria-hidden="true" />
      <span>
        <strong>{module.label}</strong>
        <small>{module.detail}</small>
      </span>
    </button>
  );
}
