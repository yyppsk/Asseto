import { Search, Shield, UserCog, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { AdminStatStrip } from './AdminStatStrip.jsx';

const roleOptions = [
  { value: 'user', label: 'Member' },
  { value: 'content_manager', label: 'Content Manager' },
  { value: 'super_admin', label: 'Super Admin' },
];

const roleFilters = [
  { value: 'all', label: 'All roles' },
  { value: 'user', label: 'Members' },
  { value: 'content_manager', label: 'Content Managers' },
  { value: 'super_admin', label: 'Super Admins' },
];

export function UsersModule({ onChangeRole, users }) {
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return users.filter((user) => {
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      const matchesQuery =
        !normalizedQuery ||
        String(user.email || '').toLowerCase().includes(normalizedQuery) ||
        String(user.displayName || '').toLowerCase().includes(normalizedQuery);
      return matchesRole && matchesQuery;
    });
  }, [query, roleFilter, users]);
  const stats = [
    { label: 'Members', value: users.length, icon: Users },
    { label: 'Admins', value: users.filter((user) => user.role === 'content_manager' || user.role === 'super_admin').length, icon: UserCog },
    { label: 'Super Admins', value: users.filter((user) => user.role === 'super_admin').length, icon: Shield },
  ];

  return (
    <div className="admin-module admin-module--users">
      <AdminStatStrip stats={stats} />

      <div className="admin-toolbar">
        <label className="admin-search">
          <Search aria-hidden="true" />
          <span className="sr-only">Search users</span>
          <input placeholder="Search by email or name" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <div className="admin-segmented" aria-label="Role filter">
          {roleFilters.map((filter) => (
            <button
              aria-pressed={roleFilter === filter.value}
              className={roleFilter === filter.value ? 'is-active' : ''}
              key={filter.value}
              type="button"
              onClick={() => setRoleFilter(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <section className="admin-table-card">
        <div className="admin-panel-heading">
          <div>
            <p className="eyebrow">Community</p>
            <h2>Role Management</h2>
          </div>
          <Users aria-hidden="true" />
        </div>
        <div className="admin-user-list">
          {filteredUsers.map((entry) => (
            <article className={entry.role === 'super_admin' ? 'user-role-row is-super-admin' : 'user-role-row'} key={entry.id}>
              <div>
                <strong>{entry.email}</strong>
                <span>{entry.displayName || 'No name set'}</span>
              </div>
              <span className="admin-badge">{roleLabel(entry.role)}</span>
              <select value={entry.role} onChange={(event) => onChangeRole(entry, event.target.value)}>
                {roleOptions.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </article>
          ))}
          {!filteredUsers.length ? <p className="admin-empty-note">No users match this filter.</p> : null}
        </div>
      </section>
    </div>
  );
}

function roleLabel(role) {
  return roleOptions.find((option) => option.value === role)?.label || 'Member';
}
