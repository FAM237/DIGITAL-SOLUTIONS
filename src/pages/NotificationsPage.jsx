// NotificationsPage.jsx
import { useApp } from '../contexts/AppContext';
import { useT } from '../i18n/translations';
import { Link } from 'react-router-dom';

const NOTIF_ICONS = {
  task_assigned: 'TK',
  deadline:      'DL',
  project_update:'PR',
  comment:       'CM',
  task_done:     'OK',
  system:        'NT',
};

export default function NotificationsPage() {
  const { lang, user, mockNotifs, setMockNotifs, setNotifCount } = useApp();
  const t = useT(lang);

  const myNotifs = mockNotifs.filter(n => n.userId === user?.id).sort((a, b) => new Date(b.date) - new Date(a.date));
  const unread = myNotifs.filter(n => !n.lu).length;

  function markRead(id) { setMockNotifs(prev => prev.map(n => n._id === id ? { ...n, lu: true } : n)); setNotifCount(c => Math.max(0, c - 1)); }
  function markAll() { setMockNotifs(prev => prev.map(n => n.userId === user?.id ? { ...n, lu: true } : n)); setNotifCount(0); }
  function clearAll() { setMockNotifs(prev => prev.filter(n => n.userId !== user?.id)); setNotifCount(0); }

  function timeAgo(d) {
    const diff = Math.floor((Date.now() - new Date(d)) / 60000);
    if (diff < 1) return 'à l\'instant';
    if (diff < 60) return `il y a ${diff} min`;
    if (diff < 1440) return `il y a ${Math.floor(diff/60)}h`;
    return `il y a ${Math.floor(diff/1440)} j`;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('notifs.title')}</h1>
          <p className="page-subtitle">{unread > 0 ? `${unread} non lue(s)` : 'Tout est lu'}</p>
        </div>
        {myNotifs.length > 0 && (
          <div style={{ display: 'flex', gap: 8 }}>
            {unread > 0 && <button className="btn btn-secondary" onClick={markAll}>{t('notifs.markAll')}</button>}
            <button className="btn btn-ghost" onClick={clearAll} style={{ color: 'var(--danger)' }}>{t('notifs.clearAll')}</button>
          </div>
        )}
      </div>

      {myNotifs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon" style={{ fontSize: '2rem' }}>—</div>
          <div className="empty-title">{t('notifs.empty')}</div>
        </div>
      ) : (
        <div className="notifs-list">
          {myNotifs.map(n => (
            <div key={n._id} className={`notif-item${n.lu ? '' : ' notif-unread'}`} onClick={() => markRead(n._id)}>
              <div className="notif-icon">{NOTIF_ICONS[n.type] || '[N]'}</div>
              <div className="notif-body">
                <div className="notif-msg">{n.message}</div>
                <div className="notif-meta">
                  <span>{timeAgo(n.date)}</span>
                  {n.lien && <Link to={n.lien} className="notif-link" onClick={e => e.stopPropagation()}>Voir →</Link>}
                </div>
              </div>
              {!n.lu && <div className="notif-dot"/>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
