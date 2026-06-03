import { Activity, CheckCircle2, Database, History, PlayCircle } from 'lucide-react';
import { AdminStatStrip } from './AdminStatStrip.jsx';

export function SystemModule({ migrations, onRunMigrations, running }) {
  const pendingCount = Number(migrations?.pendingCount || 0);
  const appliedHistory = migrations?.appliedHistory || [];
  const stats = [
    { label: 'Applied Migrations', value: migrations ? `${migrations.appliedCount}/${migrations.total}` : '--', icon: Database },
    { label: 'Pending', value: migrations ? pendingCount : '--', icon: Activity },
    { label: 'Last Run', value: formatDateTime(migrations?.lastAppliedAt), icon: History },
  ];

  return (
    <div className="admin-module admin-module--system">
      <AdminStatStrip stats={stats} />

      <section className="system-grid">
        <article className="system-card">
          <div className="admin-panel-heading">
            <div>
              <p className="eyebrow">Migration Status</p>
              <h2>{pendingCount ? `${pendingCount} pending` : 'Everything is up to date'}</h2>
            </div>
            <Database aria-hidden="true" />
          </div>
          <p>
            Schema migrations are tracked in Postgres and protected by a database lock while running.
          </p>
          <button type="button" disabled={!migrations || pendingCount === 0 || running} onClick={onRunMigrations}>
            <PlayCircle aria-hidden="true" />
            {running ? 'Running migrations' : pendingCount ? 'Run pending migrations' : 'Everything is up to date'}
          </button>
        </article>

        <article className="system-card system-card--history">
          <div className="admin-panel-heading">
            <div>
              <p className="eyebrow">Applied History</p>
              <h2>Migration Log</h2>
            </div>
            <History aria-hidden="true" />
          </div>
          <ol className="migration-history-list">
            {appliedHistory.map((migration) => (
              <li key={`${migration.version}-${migration.appliedAt}`}>
                <CheckCircle2 aria-hidden="true" />
                <span>{migration.version}</span>
                <time dateTime={migration.appliedAt || undefined}>{formatDateTime(migration.appliedAt)}</time>
              </li>
            ))}
          </ol>
          {!appliedHistory.length ? <p className="admin-empty-note">No migrations have been applied yet.</p> : null}
        </article>
      </section>
    </div>
  );
}

function formatDateTime(value) {
  if (!value) {
    return 'Not recorded';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Not recorded';
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}
