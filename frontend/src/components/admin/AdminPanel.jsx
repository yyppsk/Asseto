import { FileText, Settings, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { apiRequest, navigate } from '../../api.js';
import { AdminShell } from './AdminShell.jsx';
import { ContentModule } from './ContentModule.jsx';
import { SystemModule } from './SystemModule.jsx';
import { UsersModule } from './UsersModule.jsx';
import { getStoredAdminTheme, storeAdminTheme } from './adminTheme.js';

const adminModules = [
  {
    id: 'content',
    label: 'Content',
    title: 'Content Control',
    detail: 'Manage the public race-story sections shown on the landing experience.',
    group: 'Operate',
    icon: FileText,
  },
  {
    id: 'users',
    label: 'Members and Roles',
    title: 'Members and Roles',
    detail: 'Review members and keep admin permissions deliberate.',
    group: 'Community',
    icon: Users,
    superAdminOnly: true,
  },
  {
    id: 'system',
    label: 'System',
    title: 'System Control',
    detail: 'Inspect migrations and run pending operational tasks.',
    group: 'System',
    icon: Settings,
    superAdminOnly: true,
  },
];

export function AdminPanel() {
  const [user, setUser] = useState(null);
  const [sections, setSections] = useState([]);
  const [users, setUsers] = useState([]);
  const [migrationStatus, setMigrationStatus] = useState(null);
  const [migrationRunning, setMigrationRunning] = useState(false);
  const [activeModule, setActiveModule] = useState('content');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [dirtySectionIds, setDirtySectionIds] = useState(() => new Set());
  const [adminTheme, setAdminTheme] = useState(getStoredAdminTheme);
  const [status, setStatus] = useState('Loading admin panel...');
  const [error, setError] = useState('');

  const availableModules = useMemo(
    () => adminModules.filter((module) => !module.superAdminOnly || user?.isSuperAdmin),
    [user?.isSuperAdmin],
  );
  const selectedModule = availableModules.find((module) => module.id === activeModule) || availableModules[0] || adminModules[0];

  useEffect(() => {
    let alive = true;

    async function loadAdmin() {
      try {
        const session = await apiRequest('/api/auth/session');

        if (!session.user) {
          navigate('/admin/login');
          return;
        }

        if (!session.user.isAdmin) {
          setUser(session.user);
          setStatus('');
          setError('Your account does not have admin access.');
          return;
        }

        const [content, userList, migrations] = await Promise.all([
          apiRequest('/api/admin/content'),
          session.user.isSuperAdmin ? apiRequest('/api/admin/users') : Promise.resolve({ users: [] }),
          session.user.isSuperAdmin ? apiRequest('/api/admin/system/migrations') : Promise.resolve(null),
        ]);

        if (!alive) return;

        const orderedSections = sortSections(content.sections || []);
        setUser(session.user);
        setSections(orderedSections);
        setUsers(userList.users || []);
        setMigrationStatus(migrations);
        setSelectedSectionId(orderedSections[0]?.id || '');
        setStatus('');
      } catch (requestError) {
        if (!alive) return;
        setStatus('');
        setError(readableError(requestError));
      }
    }

    loadAdmin();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (user && !availableModules.some((module) => module.id === activeModule)) {
      setActiveModule('content');
    }
  }, [activeModule, availableModules, user]);

  useEffect(() => {
    storeAdminTheme(adminTheme);
  }, [adminTheme]);

  function updateSection(id, patch) {
    setSections((current) => current.map((section) => (section.id === id ? { ...section, ...patch } : section)));
    setDirtySectionIds((current) => new Set(current).add(id));
  }

  async function saveSection(section) {
    setStatus(`Saving ${section.navLabel || section.title}...`);
    setError('');

    try {
      const result = await apiRequest(`/api/admin/content/${section.id}`, {
        method: 'PATCH',
        csrf: true,
        body: section,
      });
      setSections((current) => sortSections(current.map((entry) => (entry.id === section.id ? result.section : entry))));
      setDirtySectionIds((current) => {
        const next = new Set(current);
        next.delete(section.id);
        return next;
      });
      setStatus('Section saved.');
    } catch {
      setError('Could not save this section. Try again.');
      setStatus('');
    }
  }

  async function createSection() {
    setStatus('Creating section...');
    setError('');

    try {
      const nextOrder = Math.max(0, ...sections.map((section) => Number(section.sortOrder || 0))) + 10;
      const slug = `custom-${Date.now()}`;
      const result = await apiRequest('/api/admin/content', {
        method: 'POST',
        csrf: true,
        body: {
          slug,
          panelKey: slug,
          navLabel: 'New',
          navDetail: 'Draft',
          eyebrow: 'Draft',
          title: 'New Section',
          body: 'Add copy for this section.',
          sortOrder: nextOrder,
          progress: 0.5,
          isNavItem: true,
          isPublished: false,
          settings: { tone: 'quiet', links: [] },
        },
      });
      setSections((current) => sortSections([...current, result.section]));
      setSelectedSectionId(result.section.id);
      setActiveModule('content');
      setStatus('Draft created.');
    } catch (requestError) {
      setError(readableError(requestError));
      setStatus('');
    }
  }

  async function changeRole(targetUser, role) {
    setStatus(`Updating ${targetUser.email}...`);
    setError('');

    try {
      const result = await apiRequest(`/api/admin/users/${targetUser.id}/role`, {
        method: 'PATCH',
        csrf: true,
        body: { role },
      });
      setUsers((current) => current.map((entry) => (entry.id === targetUser.id ? result.user : entry)));
      setStatus('Role updated.');
    } catch {
      setError('Could not update this role. Try again.');
      setStatus('');
    }
  }

  async function runMigrationsFromAdmin() {
    setMigrationRunning(true);
    setStatus('Running migrations...');
    setError('');

    try {
      const result = await apiRequest('/api/admin/system/migrations/run', {
        method: 'POST',
        csrf: true,
      });
      setMigrationStatus(result);
      setStatus(result.applied?.length ? `Applied ${result.applied.length} migration${result.applied.length === 1 ? '' : 's'}.` : 'Everything is up to date.');
    } catch {
      setError('Could not run migrations. Check the system logs and try again.');
      setStatus('');
    } finally {
      setMigrationRunning(false);
    }
  }

  async function logout() {
    await apiRequest('/api/auth/logout', { method: 'POST', csrf: true }).catch(() => null);
    navigate('/');
  }

  return (
    <AdminShell
      activeModule={selectedModule.id}
      error={error}
      modules={availableModules}
      onCreateSection={createSection}
      onLogout={logout}
      onModuleChange={setActiveModule}
      onThemeChange={setAdminTheme}
      selectedModule={selectedModule}
      status={status}
      theme={adminTheme}
      user={user}
    >
      {user?.isAdmin && selectedModule.id === 'content' ? (
        <ContentModule
          dirtySectionIds={dirtySectionIds}
          onSave={saveSection}
          onSectionChange={updateSection}
          onSelectSection={setSelectedSectionId}
          sections={sections}
          selectedSectionId={selectedSectionId}
        />
      ) : null}

      {user?.isSuperAdmin && selectedModule.id === 'users' ? (
        <UsersModule onChangeRole={changeRole} users={users} />
      ) : null}

      {user?.isSuperAdmin && selectedModule.id === 'system' ? (
        <SystemModule migrations={migrationStatus} onRunMigrations={runMigrationsFromAdmin} running={migrationRunning} />
      ) : null}

      {user && !user.isAdmin ? (
        <section className="admin-empty-state">
          <h2>Admin access required</h2>
          <p>Your account does not have permission to manage this workspace.</p>
        </section>
      ) : null}
    </AdminShell>
  );
}

function sortSections(items) {
  return [...items].sort((left, right) => Number(left.sortOrder || 0) - Number(right.sortOrder || 0));
}

function readableError(error) {
  const label = String(error.message || '').replace(/_/g, ' ');
  return label ? label.charAt(0).toUpperCase() + label.slice(1) : 'Request failed.';
}
