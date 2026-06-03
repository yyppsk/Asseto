import { CheckCircle2, FileText, ListFilter, MapPinned, Navigation, Save, Settings, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AdminStatStrip } from './AdminStatStrip.jsx';

const contentFilters = [
  { value: 'all', label: 'All' },
  { value: 'published', label: 'Published' },
  { value: 'drafts', label: 'Drafts' },
  { value: 'nav', label: 'Navigation' },
];

export function ContentModule({ dirtySectionIds, onSave, onSectionChange, onSelectSection, sections, selectedSectionId }) {
  const [filter, setFilter] = useState('all');
  const selectedSection = sections.find((section) => section.id === selectedSectionId) || sections[0] || null;
  const visibleSections = useMemo(
    () =>
      sections.filter((section) => {
        if (filter === 'published') return section.isPublished;
        if (filter === 'drafts') return !section.isPublished;
        if (filter === 'nav') return section.isNavItem;
        return true;
      }),
    [filter, sections],
  );
  const stats = [
    { label: 'Sections', value: sections.length, icon: FileText },
    { label: 'Published', value: sections.filter((section) => section.isPublished).length, icon: CheckCircle2 },
    { label: 'Navigation', value: sections.filter((section) => section.isNavItem).length, icon: Navigation },
    { label: 'Drafts', value: sections.filter((section) => !section.isPublished).length, icon: ListFilter },
  ];

  return (
    <div className="admin-module admin-module--content">
      <AdminStatStrip stats={stats} />

      <div className="admin-segmented" aria-label="Content filter">
        {contentFilters.map((item) => (
          <button
            aria-pressed={filter === item.value}
            className={filter === item.value ? 'is-active' : ''}
            key={item.value}
            type="button"
            onClick={() => setFilter(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <section className="content-cockpit">
        <div className="section-list-panel">
          <div className="admin-panel-heading">
            <div>
              <p className="eyebrow">Sections</p>
              <h2>Landing Content</h2>
            </div>
            <MapPinned aria-hidden="true" />
          </div>
          <div className="section-list" role="listbox" aria-label="Content sections">
            {visibleSections.map((section) => (
              <SectionListRow
                dirty={dirtySectionIds.has(section.id)}
                key={section.id}
                onSelect={() => onSelectSection(section.id)}
                section={section}
                selected={selectedSection?.id === section.id}
              />
            ))}
          </div>
        </div>

        <ContentSectionEditor
          dirty={selectedSection ? dirtySectionIds.has(selectedSection.id) : false}
          key={selectedSection?.id || 'empty'}
          onChange={(patch) => selectedSection && onSectionChange(selectedSection.id, patch)}
          onSave={() => selectedSection && onSave(selectedSection)}
          section={selectedSection}
        />
      </section>
    </div>
  );
}

function SectionListRow({ dirty, onSelect, section, selected }) {
  return (
    <button
      aria-selected={selected}
      className={selected ? 'section-list-row is-selected' : 'section-list-row'}
      role="option"
      type="button"
      onClick={onSelect}
    >
      <span>
        <strong>{section.navLabel || section.title || 'Untitled Section'}</strong>
        <small>{section.slug}</small>
      </span>
      <span className="section-list-row__meta">
        <Badge tone={section.isPublished ? 'green' : 'yellow'}>{section.isPublished ? 'Published' : 'Draft'}</Badge>
        {section.isNavItem ? <Badge>Navigation</Badge> : null}
        {dirty ? <Badge tone="red">Unsaved</Badge> : null}
        <small>Order {section.sortOrder}</small>
      </span>
    </button>
  );
}

function ContentSectionEditor({ dirty, onChange, onSave, section }) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const links = normalizeLinks(section?.settings?.links);
  const [linksJsonDraft, setLinksJsonDraft] = useState(() => JSON.stringify(links, null, 2));
  const [linksJsonError, setLinksJsonError] = useState('');
  const valid = Boolean(String(section?.navLabel || '').trim()) && Boolean(String(section?.title || '').trim());

  useEffect(() => {
    setLinksJsonDraft(JSON.stringify(links, null, 2));
    setLinksJsonError('');
  }, [section?.id, section?.settings?.links]);

  if (!section) {
    return (
      <div className="section-editor section-editor--empty">
        <h2>No section selected</h2>
        <p>Create a section or select one from the list to begin editing.</p>
      </div>
    );
  }

  function updateSettings(patch) {
    onChange({ settings: { ...(section.settings || {}), ...patch } });
  }

  function updateLink(index, patch) {
    updateSettings({ links: links.map((link, linkIndex) => (linkIndex === index ? { ...link, ...patch } : link)) });
  }

  function removeLink(index) {
    updateSettings({ links: links.filter((_, linkIndex) => linkIndex !== index) });
  }

  function addLink() {
    updateSettings({ links: [...links, { label: 'New link', url: '/', type: 'secondary' }] });
  }

  function updateRawLinks(value) {
    setLinksJsonDraft(value);

    try {
      const next = JSON.parse(value || '[]');
      if (Array.isArray(next)) {
        setLinksJsonError('');
        updateSettings({ links: next });
      } else {
        setLinksJsonError('Links JSON must be an array.');
      }
    } catch {
      setLinksJsonError('Links JSON is not valid yet.');
    }
  }

  return (
    <article className="section-editor">
      <div className="section-editor__header">
        <div>
          <p className="eyebrow">Focused Section</p>
          <h2>{section.title || section.navLabel || 'Untitled Section'}</h2>
          <span>{section.slug}</span>
        </div>
        <div className="section-editor__actions">
          {dirty ? <Badge tone="red">Unsaved</Badge> : <Badge tone="green">Saved</Badge>}
          <button type="button" disabled={!dirty || !valid} onClick={onSave}>
            <Save aria-hidden="true" />
            Save Section
          </button>
        </div>
      </div>

      <div className="section-editor__groups">
        <fieldset>
          <legend>Identity</legend>
          <label>
            <span>Navigation label</span>
            <input value={section.navLabel || ''} onChange={(event) => onChange({ navLabel: event.target.value })} />
          </label>
          <label>
            <span>Detail</span>
            <input value={section.navDetail || ''} onChange={(event) => onChange({ navDetail: event.target.value })} />
          </label>
          <label>
            <span>Eyebrow</span>
            <input value={section.eyebrow || ''} onChange={(event) => onChange({ eyebrow: event.target.value })} />
          </label>
          <label>
            <span>Title</span>
            <input value={section.title || ''} onChange={(event) => onChange({ title: event.target.value })} />
          </label>
        </fieldset>

        <fieldset>
          <legend>Story Copy</legend>
          <label className="is-wide">
            <span>Body</span>
            <textarea rows={5} value={section.body || ''} onChange={(event) => onChange({ body: event.target.value })} />
          </label>
        </fieldset>

        <fieldset className="section-editor__compact">
          <legend>Placement and Visibility</legend>
          <label>
            <span>Scroll progress</span>
            <input
              max="1"
              min="0"
              step="0.01"
              type="number"
              value={section.progress}
              onChange={(event) => onChange({ progress: Number(event.target.value) })}
            />
          </label>
          <label>
            <span>Sort order</span>
            <input
              min="0"
              step="1"
              type="number"
              value={section.sortOrder}
              onChange={(event) => onChange({ sortOrder: Number(event.target.value) })}
            />
          </label>
          <SwitchLabel checked={section.isPublished} label="Published" onChange={(checked) => onChange({ isPublished: checked })} />
          <SwitchLabel checked={section.isNavItem} label="Visible in navigation" onChange={(checked) => onChange({ isNavItem: checked })} />
        </fieldset>

        <fieldset>
          <legend>Links</legend>
          <div className="link-repeater">
            {links.map((link, index) => (
              <div className="link-row" key={`${index}-${link.label || link.url || link.href}`}>
                <label>
                  <span>Label</span>
                  <input value={link.label || ''} onChange={(event) => updateLink(index, { label: event.target.value })} />
                </label>
                <label>
                  <span>URL</span>
                  <input value={link.url || link.href || ''} onChange={(event) => updateLink(index, { url: event.target.value })} />
                </label>
                <label>
                  <span>Type</span>
                  <select value={link.type || 'secondary'} onChange={(event) => updateLink(index, { type: event.target.value })}>
                    <option value="primary">Primary</option>
                    <option value="secondary">Secondary</option>
                    <option value="social">Social</option>
                  </select>
                </label>
                <button aria-label={`Remove ${link.label || 'link'}`} type="button" onClick={() => removeLink(index)}>
                  <Trash2 aria-hidden="true" />
                </button>
              </div>
            ))}
            <button className="admin-secondary-action" type="button" onClick={addLink}>
              Add Link
            </button>
          </div>
        </fieldset>

        <details className="admin-disclosure" open={advancedOpen} onToggle={(event) => setAdvancedOpen(event.currentTarget.open)}>
          <summary>
            <Settings aria-hidden="true" />
          <strong>Advanced JSON</strong>
        </summary>
        <label className="is-wide">
          <span>Links JSON</span>
          <textarea rows={5} value={linksJsonDraft} onChange={(event) => updateRawLinks(event.target.value)} />
          {linksJsonError ? <small>{linksJsonError}</small> : null}
        </label>
      </details>
      </div>
    </article>
  );
}

function SwitchLabel({ checked, label, onChange }) {
  return (
    <label className="admin-switch">
      <input checked={checked} type="checkbox" onChange={(event) => onChange(event.target.checked)} />
      <span aria-hidden="true"></span>
      {label}
    </label>
  );
}

function Badge({ children, tone = 'neutral' }) {
  return <span className={`admin-badge admin-badge--${tone}`}>{children}</span>;
}

function normalizeLinks(links) {
  return Array.isArray(links) ? links : [];
}
