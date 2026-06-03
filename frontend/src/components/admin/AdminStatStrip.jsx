export function AdminStatStrip({ stats }) {
  return (
    <div className="admin-stat-strip">
      {stats.map((stat) => {
        const Icon = stat.icon;

        return (
          <div className="admin-stat" key={stat.label}>
            <Icon aria-hidden="true" />
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </div>
        );
      })}
    </div>
  );
}
