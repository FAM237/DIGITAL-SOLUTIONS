// CalendarPage.jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { useT } from '../i18n/translations';

const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const DAYS_FR = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];

function getDeadlines(projects, tasks, year, month) {
  const events = [];
  projects.forEach(p => { if (p.dateEcheance) { const d = new Date(p.dateEcheance); if (d.getFullYear() === year && d.getMonth() === month) events.push({ day: d.getDate(), type: 'project', label: p.titre, color: p.couleur || 'var(--primary)', id: p._id, path: `/projects/${p._id}` }); } });
  tasks.forEach(t => { if (t.dateEcheance) { const d = new Date(t.dateEcheance); if (d.getFullYear() === year && d.getMonth() === month) events.push({ day: d.getDate(), type: 'task', label: t.titre, color: '#3B82F6', id: t._id, path: `/projects/${t.projetId}` }); } });
  return events;
}

export default function CalendarPage() {
  const { lang, isAdmin, user, mockProjects, mockTasks, mockTeams } = useApp();
  const t = useT(lang);
  const today = new Date();
  const [current, setCurrent] = useState({ year: today.getFullYear(), month: today.getMonth() });

  const myProjects = isAdmin ? mockProjects : mockProjects.filter(p => {
    const myTeamIds = mockTeams.filter(tm => tm.membres?.includes(user?.id)).map(tm => tm._id);
    return p.equipeId && myTeamIds.includes(p.equipeId);
  });
  const myTasks = isAdmin ? mockTasks : mockTasks.filter(tk => tk.assigneA === user?.id);

  const events = getDeadlines(myProjects, myTasks, current.year, current.month);
  const eventsByDay = {};
  events.forEach(e => { if (!eventsByDay[e.day]) eventsByDay[e.day] = []; eventsByDay[e.day].push(e); });

  const firstDay = new Date(current.year, current.month, 1).getDay();
  const daysInMonth = new Date(current.year, current.month + 1, 0).getDate();

  const prev = () => setCurrent(c => c.month === 0 ? { year: c.year - 1, month: 11 } : { ...c, month: c.month - 1 });
  const next = () => setCurrent(c => c.month === 11 ? { year: c.year + 1, month: 0 } : { ...c, month: c.month + 1 });

  const upcomingDeadlines = events.filter(e => new Date(current.year, current.month, e.day) >= today).sort((a, b) => a.day - b.day).slice(0, 8);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{t('calendar.title')}</h1>
        <p className="page-subtitle">{lang === 'fr' ? 'Vue des échéances de vos projets et tâches' : 'View deadlines for your projects and tasks'}</p>
      </div>
      <div className="calendar-layout">
        <div className="card calendar-card">
          <div className="calendar-nav">
            <button className="btn btn-ghost btn-sm" onClick={prev}>‹</button>
            <h2 className="calendar-month-title">{MONTHS_FR[current.month]} {current.year}</h2>
            <button className="btn btn-ghost btn-sm" onClick={next}>›</button>
          </div>
          <div className="calendar-grid">
            {DAYS_FR.map(d => <div key={d} className="cal-day-header">{d}</div>)}
            {Array(firstDay).fill(null).map((_, i) => <div key={`e${i}`} className="cal-cell cal-cell-empty"/>)}
            {Array(daysInMonth).fill(null).map((_, i) => {
              const day = i + 1;
              const isToday = today.getFullYear() === current.year && today.getMonth() === current.month && today.getDate() === day;
              const dayEvents = eventsByDay[day] || [];
              return (
                <div key={day} className={`cal-cell${isToday ? ' cal-today' : ''}${dayEvents.length > 0 ? ' cal-has-events' : ''}`}>
                  <span className="cal-day-num">{day}</span>
                  <div className="cal-events">
                    {dayEvents.slice(0, 2).map((ev, j) => (
                      <Link key={j} to={ev.path} className="cal-event" style={{ background: ev.color + '22', borderLeft: `2px solid ${ev.color}` }} title={ev.label}>
                        <span style={{ color: ev.color }}>{ev.type === 'project' ? 'P' : 'T'}</span> {ev.label.slice(0, 8)}{ev.label.length > 8 ? '…' : ''}
                      </Link>
                    ))}
                    {dayEvents.length > 2 && <div className="cal-more">+{dayEvents.length - 2}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="calendar-sidebar">
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: 14 }}>{lang === 'fr' ? 'Prochaines échéances' : 'Upcoming deadlines'}</h3>
            {upcomingDeadlines.length === 0 ? <p style={{ fontSize: '0.83rem', color: 'var(--text3)' }}>{t('calendar.noEvents')}</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {upcomingDeadlines.map((ev, i) => {
                  const dateStr = new Date(current.year, current.month, ev.day).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
                  const isPast  = new Date(current.year, current.month, ev.day) < today;
                  return (
                    <Link key={i} to={ev.path} className="deadline-item" style={{ borderLeft: `3px solid ${ev.color}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div><div style={{ fontSize: '0.82rem', fontWeight: 500 }}>{ev.label}</div><div style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>{ev.type === 'project' ? 'Projet' : 'Tâche'}</div></div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: isPast ? 'var(--danger)' : ev.color }}>{dateStr}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
          <div className="card" style={{ marginTop: 12 }}>
            <h3 className="card-title" style={{ marginBottom: 10 }}>Ce mois</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="sys-stat-row"><span>Projets</span><strong style={{ color: 'var(--primary)' }}>{events.filter(e => e.type === 'project').length}</strong></div>
              <div className="sys-stat-row"><span>Tâches</span><strong style={{ color: '#3B82F6' }}>{events.filter(e => e.type === 'task').length}</strong></div>
              <div className="sys-stat-row"><span>En retard</span><strong style={{ color: 'var(--danger)' }}>{events.filter(e => new Date(current.year, current.month, e.day) < today).length}</strong></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
