import { AdminFeedback } from './AdminFeedback.jsx';
import { AdminRail } from './AdminRail.jsx';
import { AdminTopBar } from './AdminTopBar.jsx';

export function AdminShell({
  activeModule,
  children,
  error,
  modules,
  onCreateSection,
  onLogout,
  onModuleChange,
  onThemeChange,
  selectedModule,
  status,
  theme,
  user,
}) {
  return (
    <main className="admin-shell admin-shell--brief" data-admin-theme={theme}>
      <AdminRail
        activeModule={activeModule}
        modules={modules}
        onLogout={onLogout}
        onModuleChange={onModuleChange}
        user={user}
      />

      <section className="admin-workspace">
        <AdminTopBar
          module={selectedModule}
          onCreateSection={onCreateSection}
          onThemeChange={onThemeChange}
          status={status}
          theme={theme}
          user={user}
        />
        <AdminFeedback error={error} status={status} />
        <div className="admin-scroll-region">{children}</div>
      </section>
    </main>
  );
}
