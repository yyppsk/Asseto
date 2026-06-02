const socialLinks = [
  { label: 'Discord', href: 'https://discord.gg/asseto', text: 'discord.gg/asseto' },
  { label: 'Instagram', href: 'https://instagram.com/asseto.racing', text: '@asseto.racing' },
  { label: 'YouTube', href: 'https://youtube.com/@asseto', text: '@asseto' },
];

const contactDetails = [
  { label: 'Email', href: 'mailto:hello@asseto.racing', text: 'hello@asseto.racing' },
  { label: 'Phone', href: 'tel:+15550149117', text: '+1 555 014 9117' },
  { label: 'Location', text: 'Francorchamps inspired, globally online' },
];

export function StoryPanels() {
  return (
    <main className="scroll-story" aria-label="Asseto racing story">
      <section className="story-section story-section--intro" data-panel="intro">
        <div className="copy-block">
          <p className="eyebrow">Asseto Racing</p>
          <h1>Spa Track</h1>
          <p>Race through the Ardennes, from La Source to the final chicane.</p>
        </div>
      </section>

      <section className="story-section" data-panel="pace">
        <div className="copy-block copy-block--quiet">
          <p className="eyebrow">Sector Run</p>
          <h2>Eau Rouge. Raidillon. Kemmel.</h2>
          <p>The Ferrari locks onto the racing line as the lap opens up.</p>
        </div>
      </section>

      <section className="story-section" data-panel="social">
        <div className="copy-block copy-block--social">
          <p className="eyebrow">First Chicane</p>
          <h2>Join The Grid</h2>
          <DetailList items={socialLinks} external />
        </div>
      </section>

      <section className="story-section story-section--finish" data-panel="contact">
        <div className="copy-block copy-block--contact">
          <p className="eyebrow">Chicane Exit</p>
          <h2>Contact / About Us</h2>
          <p>Asseto is a motorsport-first community experience for drivers, builders, and race fans.</p>
          <DetailList items={contactDetails} />
        </div>
      </section>
    </main>
  );
}

function DetailList({ items, external = false }) {
  return (
    <ul className="detail-list">
      {items.map((item) => (
        <li key={item.label}>
          <span>{item.label}</span>
          {item.href ? (
            <a href={item.href} target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined}>
              {item.text}
            </a>
          ) : (
            <strong>{item.text}</strong>
          )}
        </li>
      ))}
    </ul>
  );
}
