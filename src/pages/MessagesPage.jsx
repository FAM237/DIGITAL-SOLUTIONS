import { useState, useEffect, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import { useT } from '../i18n/translations';

export default function MessagesPage() {
  const { lang, user, isAdmin, mockTeams, mockUsers, mockMessages, setMockMessages, uid, now, logActivity } = useApp();
  const t = useT(lang);

  const myTeams = isAdmin ? mockTeams : mockTeams.filter(tm => tm.membres?.includes(user?.id));
  const [selectedTeam, setSelectedTeam] = useState(myTeams[0]?._id || null);
  const [text, setText] = useState('');
  const messagesEndRef = useRef(null);

  const teamMessages = mockMessages.filter(m => m.equipeId === selectedTeam).sort((a, b) => new Date(a.date) - new Date(b.date));

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [teamMessages.length, selectedTeam]);

  function sendMessage(e) {
    e.preventDefault();
    if (!text.trim() || !selectedTeam) return;
    const msg = { _id: uid(), equipeId: selectedTeam, auteurId: user?.id, texte: text.trim(), date: now(), type: 'text' };
    setMockMessages(prev => [...prev, msg]);
    logActivity('a envoyé un message dans', mockTeams.find(t => t._id === selectedTeam)?.nom || '', 'comment');
    setText('');
  }

  function fmtTime(d) { return new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); }
  function fmtDate(d) {
    const date = new Date(d);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) return lang === 'fr' ? "Aujourd'hui" : "Today";
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return lang === 'fr' ? 'Hier' : 'Yesterday';
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  }

  // Group messages by date
  const grouped = [];
  let lastDate = null;
  teamMessages.forEach(m => {
    const d = new Date(m.date).toDateString();
    if (d !== lastDate) { grouped.push({ type: 'date', label: fmtDate(m.date) }); lastDate = d; }
    grouped.push({ type: 'msg', msg: m });
  });

  const team = mockTeams.find(t => t._id === selectedTeam);
  const teamMemberCount = team?.membres?.length || 0;

  return (
    <div className="messages-layout">
      {/* Sidebar */}
      <div className="messages-sidebar">
        <div className="messages-sidebar-header"><h3>{t('messages.title')}</h3></div>
        <div className="messages-team-list">
          {myTeams.length === 0 && <div style={{ padding: 16, fontSize: '0.82rem', color: 'var(--text3)' }}>{lang === 'fr' ? 'Aucune équipe' : 'No teams'}</div>}
          {myTeams.map(tm => {
            const lastMsg = mockMessages.filter(m => m.equipeId === tm._id).sort((a, b) => new Date(b.date) - new Date(a.date))[0];
            const unread  = 0;
            return (
              <button key={tm._id} className={`team-list-item${selectedTeam === tm._id ? ' active' : ''}`} onClick={() => setSelectedTeam(tm._id)}>
                <div className="tli-avatar">{tm.nom.charAt(0)}</div>
                <div className="tli-body">
                  <div className="tli-name">{tm.nom}</div>
                  <div className="tli-preview">{lastMsg ? lastMsg.texte.slice(0, 30) + (lastMsg.texte.length > 30 ? '…' : '') : lang === 'fr' ? 'Aucun message' : 'No messages'}</div>
                </div>
                <div className="tli-meta">
                  {lastMsg && <div style={{ fontSize: '0.7rem', color: 'var(--text3)' }}>{fmtTime(lastMsg.date)}</div>}
                  {unread > 0 && <div className="unread-badge">{unread}</div>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chat Area */}
      <div className="messages-main">
        {!selectedTeam ? (
          <div className="messages-empty"><div className="empty-title">{t('messages.selectTeam')}</div></div>
        ) : (
          <>
            <div className="messages-chat-header">
              <div className="tli-avatar">{team?.nom?.charAt(0)}</div>
              <div>
                <div style={{ fontWeight: 600 }}>{team?.nom}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>{teamMemberCount} {lang === 'fr' ? 'membre(s)' : 'member(s)'}</div>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                {(team?.membresInfo || mockUsers.filter(u => team?.membres?.includes(u.id))).slice(0, 5).map(m => (
                  <div key={m.id} className="avatar avatar-sm" title={m.nom} style={{ background: m.role === 'admin' ? '#F59E0B' : 'var(--primary)' }}>{m.nom.charAt(0)}</div>
                ))}
              </div>
            </div>

            <div className="messages-body">
              {grouped.length === 0 && (
                <div className="messages-empty-inner"><p>{t('messages.noMessages')}</p></div>
              )}
              {grouped.map((item, i) => {
                if (item.type === 'date') return <div key={i} className="msg-date-divider"><span>{item.label}</span></div>;
                const m = item.msg;
                const author = mockUsers.find(u => u.id === m.auteurId);
                const isMe = m.auteurId === user?.id;
                return (
                  <div key={m._id} className={`msg-row${isMe ? ' msg-mine' : ''}`}>
                    {!isMe && <div className="avatar msg-avatar" title={author?.nom}>{author?.nom?.charAt(0) || '?'}</div>}
                    <div className={`msg-bubble${isMe ? ' mine' : ''}`}>
                      {!isMe && <div className="msg-author">{author?.nom || 'Inconnu'}</div>}
                      <div className="msg-text">{m.texte}</div>
                      <div className="msg-time">{fmtTime(m.date)}</div>
                    </div>
                    {isMe && <div className="avatar msg-avatar" style={{ background: 'var(--primary)' }}>{user?.nom?.charAt(0)}</div>}
                  </div>
                );
              })}
              <div ref={messagesEndRef}/>
            </div>

            <form className="messages-input-bar" onSubmit={sendMessage}>
              <input className="form-input msg-input" placeholder={t('messages.typemessage')} value={text} onChange={e => setText(e.target.value)} autoComplete="off"/>
              <button type="submit" className="btn btn-primary" disabled={!text.trim()}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/></svg>
                {t('messages.send')}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
