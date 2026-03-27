import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './LiveAuctionPage.module.css';
import PlayerPhoto from '../components/PlayerPhoto';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const MAX_TIME = 180; // 3 minutes

// ─── Auction Rule Constants (mirrored from backend) ──────────────────────────
const MAX_PLAYERS = 15;
const MAX_FOREIGN = 4;
const ROLE_LIMITS = { 'Batsman': 6, 'Bowler': 7, 'All-rounder': 4, 'Wicketkeeper': 3 };

function formatCr(v) { return '₹' + Number(v).toFixed(2) + ' Cr'; }
function formatTime(s) {
  const m = Math.floor(s/60).toString().padStart(2,'0');
  const sec = Math.floor(s%60).toString().padStart(2,'0');
  return `${m}:${sec}`;
}

// Derive squad composition from squad array for frontend
function getComposition(squad) {
  const FOREIGN_COUNTRIES = ['England', 'Australia', 'SA', 'NZ', 'WI', 'AFG', 'SL', 'Pakistan', 'Bangladesh'];
  const roleCounts = { 'Batsman': 0, 'Bowler': 0, 'All-rounder': 0, 'Wicketkeeper': 0 };
  let foreignCount = 0;
  for (const p of squad) {
    if (roleCounts[p.role] !== undefined) roleCounts[p.role]++;
    if (FOREIGN_COUNTRIES.includes(p.country || '')) foreignCount++;
  }
  return { roleCounts, foreignCount, totalCount: squad.length };
}

// Check if a team can bid on the current player
function canTeamBid(team, squad, player, currentBid) {
  if (!player) return { allowed: false, reason: 'No player on auction' };

  const { roleCounts, foreignCount, totalCount } = getComposition(squad);
  const next_bid = +(currentBid + 0.15).toFixed(2);
  const FOREIGN_COUNTRIES = ['England', 'Australia', 'SA', 'NZ', 'WI', 'AFG', 'SL', 'Pakistan', 'Bangladesh'];

  if (team.purse < next_bid)
    return { allowed: false, reason: `Insufficient purse (need ₹${next_bid} Cr)` };

  if (totalCount >= MAX_PLAYERS)
    return { allowed: false, reason: `Squad full (max ${MAX_PLAYERS})` };

  if (FOREIGN_COUNTRIES.includes(player.country) && foreignCount >= MAX_FOREIGN)
    return { allowed: false, reason: `Foreign limit reached (max ${MAX_FOREIGN})` };

  const roleLimit = ROLE_LIMITS[player.role];
  if (roleLimit !== undefined && (roleCounts[player.role] || 0) >= roleLimit)
    return { allowed: false, reason: `${player.role} limit reached (max ${roleLimit})` };

  return { allowed: true, reason: null };
}

const ROLE_COLORS = {
  'Batsman': '#43b4ff',
  'Bowler': '#f87171',
  'All-rounder': '#34d399',
  'Wicketkeeper': '#fbbf24',
};

export default function LiveAuctionPage() {
  const nav = useNavigate();

  const [auction, setAuction] = useState(null);
  const [player, setPlayer] = useState(null);
  const [teams, setTeams] = useState([]);
  const [squads, setSquads] = useState({});
  const [history, setHistory] = useState([]);
  const [toast, setToast] = useState('');
  const [soldBanner, setSoldBanner] = useState(null);
  const [modal, setModal] = useState(null);
  const [screenLocked, setScreenLocked] = useState(false);

  // Queue state
  const [queue, setQueue] = useState([]);
  const [allPlayers, setAllPlayers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchRole, setSearchRole] = useState('');
  const [queueLoading, setQueueLoading] = useState(false);

  // Manual Sell State
  const [manualTeam, setManualTeam] = useState('');
  const [manualPrice, setManualPrice] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2600);
  };

  const fetchState = useCallback(async () => {
    try {
      const [auctionRes, teamsRes] = await Promise.all([
        fetch(`${API_BASE}/auction`).then(r => r.json()),
        fetch(`${API_BASE}/teams`).then(r => r.json())
      ]);
      setAuction(auctionRes.auction);
      setPlayer(auctionRes.current_player);
      setHistory(auctionRes.bids);
      setTeams(teamsRes.teams || []);
      setSquads(teamsRes.squads || {});

      if (auctionRes.auction.status === 'locked' && !screenLocked) {
        setScreenLocked(true);
      } else if (auctionRes.auction.status !== 'locked') {
        setScreenLocked(false);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchQueue = useCallback(async () => {
    try {
      const [qRes, pRes] = await Promise.all([
        fetch(`${API_BASE}/queue`).then(r => r.json()),
        fetch(`${API_BASE}/players`).then(r => r.json()),
      ]);
      setQueue(qRes.queue || []);
      setAllPlayers(Array.isArray(pRes) ? pRes : []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    fetchState();
    fetchQueue();
    const interval = setInterval(() => {
      fetchState();
      fetchQueue();
    }, 1500);
    return () => clearInterval(interval);
  }, [fetchState, fetchQueue]);

  const placeBid = async (code) => {
    if (auction?.status !== 'active') return showToast('Bidding is closed.');
    try {
      const res = await fetch(`${API_BASE}/auction/bid`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_code: code })
      });
      const data = await res.json();
      if (data.error) showToast('❌ ' + data.error);
      else fetchState();
    } catch (e) { console.error(e); }
  };

  const markSold = async () => {
    try {
      const res = await fetch(`${API_BASE}/auction/sold`, { method: 'POST' });
      const data = await res.json();
      if (data.error) return showToast('❌ ' + data.error);
      setSoldBanner({
        text: `✅ Sold to ${data.team.name} for ${formatCr(data.player.sold_price)}`,
        bg: 'rgba(34,197,94,.10)', border: 'rgba(34,197,94,.25)', color: '#dfffe8'
      });
      fetchState();
    } catch (e) { console.error(e); }
  };

  const markManualSold = async () => {
    if (!manualTeam || !manualPrice) return showToast('❌ Select team and enter price');
    const priceNum = parseFloat(manualPrice);
    if (isNaN(priceNum) || priceNum <= 0) return showToast('❌ Enter a valid positive price');
    
    try {
      const res = await fetch(`${API_BASE}/auction/manual-sell`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_code: manualTeam, sold_price: priceNum })
      });
      const data = await res.json();
      if (data.error) return showToast('❌ ' + data.error);
      
      setSoldBanner({
        text: `✅ Manually Sold to ${data.team.name} for ${formatCr(data.player.sold_price)}`,
        bg: 'rgba(34,197,94,.10)', border: 'rgba(34,197,94,.25)', color: '#dfffe8'
      });
      setManualTeam('');
      setManualPrice('');
      fetchState();
    } catch (e) {
      console.error(e);
      showToast('❌ Failed to process manual sale');
    }
  };

  const markUnsold = async () => {
    try {
      await fetch(`${API_BASE}/auction/unsold`, { method: 'POST' });
      setSoldBanner({
        text: `❌ Unsold · ${player?.name} received no final bid`,
        bg: 'rgba(239,68,68,.10)', border: 'rgba(239,68,68,.25)', color: '#ffe7ea'
      });
      fetchState();
    } catch (e) { console.error(e); }
  };


  const endAuction = async () => {
    try {
      await fetch(`${API_BASE}/auction/end`, { method: 'POST' });
      fetchState();
    } catch(e) { console.error(e); }
  };

  const resetAuction = async () => {
    try {
      const res = await fetch(`${API_BASE}/auction/reset`, { method: 'POST' });
      const data = await res.json();
      if (data.error) showToast('❌ ' + data.error);
      else { showToast('🔄 Auction fully reset!'); setSoldBanner(null); fetchState(); fetchQueue(); }
    } catch(e) { console.error(e); }
  };

  // ── Queue Actions ──────────────────────────────────────────────────────────
  const addToQueue = async (playerId) => {
    setQueueLoading(true);
    try {
      const res = await fetch(`${API_BASE}/queue/add`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: playerId })
      });
      const data = await res.json();
      if (data.error) showToast('❌ ' + data.error);
      else { showToast('✅ ' + data.message); fetchQueue(); }
    } catch (e) { console.error(e); }
    setQueueLoading(false);
  };

  const removeFromQueue = async (queueId) => {
    try {
      await fetch(`${API_BASE}/queue/${queueId}`, { method: 'DELETE' });
      fetchQueue();
    } catch (e) { console.error(e); }
  };

  const reorderQueue = async (queueId, direction) => {
    try {
      await fetch(`${API_BASE}/queue/reorder`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queue_id: queueId, direction })
      });
      fetchQueue();
    } catch (e) { console.error(e); }
  };

  const promoteFromQueue = async (queueId) => {
    setSoldBanner(null);
    try {
      const res = await fetch(`${API_BASE}/queue/promote`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queue_id: queueId })
      });
      const data = await res.json();
      if (data.error) showToast('❌ ' + data.error);
      else { showToast(`🚀 ${data.player.name} is now on the auction block!`); fetchState(); fetchQueue(); }
    } catch (e) { console.error(e); }
  };

  const openModal = (title, msg, cb) => setModal({ title, msg, cb });
  const confirmModal = () => { if (modal?.cb) modal.cb(); setModal(null); };
  const cancelModal = () => setModal(null);

  if (!auction || !teams) return <div style={{padding: '50px', color: 'white'}}>Loading Live Auction State...</div>;

  const isLocked = ['locked', 'ended', 'waiting', 'sold', 'unsold'].includes(auction.status);
  const saleClosed = ['sold', 'unsold', 'ended'].includes(auction.status);
  const percent = Math.max(0, (auction.timer_seconds / MAX_TIME) * 100);

  const isAdmin = localStorage.getItem('isAdmin') === 'true';
  const userTeam = localStorage.getItem('userTeam');

  // ── Search Filtering ──────────────────────────────────────────────────────
  const queuePlayerIds = new Set(queue.map(q => q.id));
  const currentPlayerId = player?.id;

  const filteredPlayers = allPlayers.filter(p => {
    if (p.status !== 'pending') return false;
    if (p.id === currentPlayerId) return false;
    if (queuePlayerIds.has(p.id)) return false;
    const q = searchQuery.toLowerCase();
    const matchName = p.name.toLowerCase().includes(q);
    const matchRole = !searchRole || p.role === searchRole;
    return matchName && matchRole;
  });

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <div className={styles.logo} onClick={() => nav('/')} style={{cursor:'pointer'}}>🏏</div>
          <div>
            <h1>IPL Auction 2026</h1>
            <p>Professional Live Auction Management System</p>
          </div>
        </div>
        <div className={styles.headerCenter}>
          <div className={styles.badge}><span className="pulse-dot"></span>Live Auction</div>
        </div>
        <div className={styles.status}>
          <div>
            <strong>{isAdmin ? 'Admin Panel' : teams.find(t => t.code === userTeam)?.name || 'Viewer'}</strong><br />
            <small className={styles.mini}>Real-time auction dashboard</small>
          </div>
          {!isAdmin && userTeam && (
            <button className={styles.iconBtn} title="My Squad" onClick={() => nav('/team-view')}>📋</button>
          )}
          <button className={styles.iconBtn} onClick={() => nav('/teams')}>👥</button>
          <button className={styles.iconBtn} onClick={() => nav('/ai-eval')}>🤖</button>
        </div>
      </header>

      <section className={styles.gridMain}>
        {/* Player Card */}
        <article className={styles.card}>
          <div className={styles.sectionTitle}>
            <h2>Current Player</h2>
            <span className={styles.chip}>Now on stage</span>
          </div>
          {player ? (
            <div className={styles.playerTop}>
              {/* Smart photo: local → ESPN CDN → initials avatar */}
              <PlayerPhoto player={player} size="lg" animate={true} />
              <div style={{ flex: 1 }}>
                <h3 className={styles.playerName}>{player.name}</h3>
                <div className={styles.playerMeta}>
                  <span className={styles.tag}>🌍 {player.country}</span>
                  <span className={styles.tag}>Base: {formatCr(player.base_price)}</span>
                  <span className={styles.tag}>Prev: {player.prev_team}</span>
                  <span className={styles.tag}>Age: {player.age}</span>
                </div>
                <div className={styles.playerStats}>
                  <div className={styles.stat}><span className={styles.mini}>{player.stat1_label}</span><strong>{player.stat1}</strong></div>
                  <div className={styles.stat}><span className={styles.mini}>{player.stat2_label}</span><strong>{player.stat2}</strong></div>
                  <div className={styles.stat}><span className={styles.mini}>{player.stat3_label}</span><strong>{player.stat3}</strong></div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{color: '#666', padding: '40px', textAlign: 'center'}}>
              <div style={{fontSize:'3rem', marginBottom:'12px'}}>🏏</div>
              <div>No active player. Admin — click Next Player or promote from queue.</div>
            </div>
          )}
        </article>

        {/* Live Bid Panel */}
        <article className={styles.card}>
          <div className={styles.sectionTitle}>
            <h2>Live Bid Panel</h2>
            <span className={styles.chip}>Core bidding area</span>
          </div>
          <div className={styles.bidHero}>
            <div className={styles.mini}>Current Bid Amount</div>
            <div className={styles.bigPrice}>{formatCr(auction.current_bid)}</div>
            <div className={styles.leadTeam}>🏆 Leading: {auction.leading_team_code || '—'} &nbsp;|&nbsp; Next Bid: {formatCr(+(auction.current_bid + 0.15).toFixed(2))}</div>
            {soldBanner && (
              <div className={styles.soldBanner} style={{background:soldBanner.bg, borderColor:soldBanner.border, color:soldBanner.color}}>
                {soldBanner.text}
              </div>
            )}
            <div className={styles.timer}>
              <div className={styles.mini}>Time Left</div>
              <p className={styles.timerTime}>{formatTime(auction.timer_seconds)}</p>
              <div className={styles.progress}><span style={{width:`${percent}%`}}></span></div>
              {auction.status === 'locked' && <div className={styles.lockNote}>Bidding is locked. Timer ended.</div>}
            </div>

            {/* Auction Rules Quick Reference */}
            <div className={styles.summaryBox}>
              <strong>📋 Auction Rules</strong>
              <ul>
                <li>Budget: <span>₹110 Cr / team</span></li>
                <li>Increment: <span>₹0.15 Cr</span></li>
                <li>Squad: <span>Max 15 players</span></li>
                <li>Foreign: <span>Max 4 / team</span></li>
                <li>Roles: <span>6 BAT · 7 BWL · 4 AR · 3 WK</span></li>
                <li>Player: <span>{player ? player.name : '—'}</span></li>
                <li>Status: <span>{auction.status}</span></li>
              </ul>
            </div>
          </div>
        </article>

        {/* Bid History */}
        <aside className={styles.card}>
          <div className={styles.sectionTitle}>
            <h2>Bid History</h2>
            <span className={styles.chip}>Live verification log</span>
          </div>
          <div className={styles.historyList}>
            {history.length === 0 && <div className={styles.mini} style={{padding:'10px'}}>No bids yet.</div>}
            {history.map(h => (
              <div key={h.id} className={styles.historyItem}>
                <div className={styles.teamDot}>{h.code}</div>
                <div><strong>{h.msg}</strong><time>{h.time}</time></div>
                <div className={styles.pricePill}>{h.amount > 0 ? formatCr(h.amount) : '—'}</div>
              </div>
            ))}
          </div>
        </aside>
      </section>

      {/* Team Cards */}
      <section className={styles.teamsGrid}>
        {teams
          .filter(t => {
            if (isAdmin) return true;
            if (userTeam) return t.code === userTeam;
            return true;
          })
          .map(team => {
            const teamSquad = squads[team.code] || [];
            const { roleCounts, foreignCount, totalCount } = getComposition(teamSquad);
            const bidCheck = canTeamBid(team, teamSquad, player, auction.current_bid);
            const isLeading = team.code === auction.leading_team_code;

            const disabled = !bidCheck.allowed || isLocked || saleClosed;

            let btnLabel = 'Place Bid';
            if (saleClosed) btnLabel = 'Bidding Closed';
            else if (isLocked) btnLabel = '🔒 Locked';
            else if (!bidCheck.allowed) btnLabel = bidCheck.reason || 'Cannot Bid';

            return (
              <div key={team.code} className={`${styles.teamCard} ${isLeading ? styles.leading : ''}`}>
                <div className={styles.teamHead}>
                  <div>
                    <h3>{team.name}</h3>
                    <p>Purse: {formatCr(team.purse)}</p>
                  </div>
                  <div className={styles.teamLogo}>{team.code}</div>
                </div>

                {/* Squad composition mini-display */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 10px',
                  fontSize: '11px', color: '#aaa', padding: '6px 0', marginBottom: '6px',
                  borderTop: '1px solid rgba(255,255,255,0.07)', borderBottom: '1px solid rgba(255,255,255,0.07)'
                }}>
                  <span>👤 Squad: <strong style={{color: totalCount >= 15 ? '#f87171' : '#86efac'}}>{totalCount}/{MAX_PLAYERS}</strong></span>
                  <span>🌐 Foreign: <strong style={{color: foreignCount >= 4 ? '#f87171' : '#fbbf24'}}>{foreignCount}/{MAX_FOREIGN}</strong></span>
                  <span>🏏 Bat: <strong style={{color: roleCounts['Batsman'] >= 6 ? '#f87171' : '#cbd5e1'}}>{roleCounts['Batsman']}/6</strong></span>
                  <span>🎯 Bowl: <strong style={{color: roleCounts['Bowler'] >= 7 ? '#f87171' : '#cbd5e1'}}>{roleCounts['Bowler']}/7</strong></span>
                  <span>⚡ AR: <strong style={{color: roleCounts['All-rounder'] >= 4 ? '#f87171' : '#cbd5e1'}}>{roleCounts['All-rounder']}/4</strong></span>
                  <span>🧤 WK: <strong style={{color: roleCounts['Wicketkeeper'] >= 3 ? '#f87171' : '#cbd5e1'}}>{roleCounts['Wicketkeeper']}/3</strong></span>
                </div>

                <button
                  className={styles.bidBtn}
                  disabled={disabled}
                  onClick={() => placeBid(team.code)}
                  title={bidCheck.reason || ''}
                >
                  {btnLabel}
                </button>
              </div>
            );
          })}
      </section>

      {/* Admin Controls + Player Queue */}
      {isAdmin && (
        <section className={styles.lowerGrid}>
          {/* Admin Controls */}
          <article className={styles.card}>
            <div className={styles.sectionTitle}><h2>Admin Controls</h2><span className={styles.chip}>Visible only for admin</span></div>
            <div className={styles.adminControls}>
              <button className={`${styles.action} ${styles.green}`}
                onClick={() => openModal('Mark as Sold?', 'Confirm SOLD for the current player?', markSold)}>
                ✅ Mark as Sold
              </button>
              <button className={`${styles.action} ${styles.red}`}
                onClick={() => openModal('Mark as Unsold?', 'Confirm UNSOLD for the current player?', markUnsold)}>
                ❌ Mark as Unsold
              </button>
              <button className={`${styles.action} ${styles.red}`}
                onClick={() => openModal('End Auction?', 'This will stop the auction permanently.', endAuction)}>
                🛑 End Auction
              </button>
              <button className={`${styles.action} ${styles.orange}`}
                onClick={() => openModal('Reset Auction?', '⚠️ This will reset ALL players, squads, bids, queue and purses back to start. Use only for testing!', resetAuction)}>
                🔄 Reset Auction
              </button>
            </div>

            {/* Manual Sell Section */}
            <div style={{ marginTop: '20px', padding: '15px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <h3 style={{ fontSize: '0.95rem', marginBottom: '10px', color: '#fff' }}>⚡ Direct Manual Sell</h3>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                <select 
                  className={styles.searchInput} 
                  style={{ flex: 1, minWidth: '150px', padding: '10px' }}
                  value={manualTeam}
                  onChange={e => setManualTeam(e.target.value)}
                >
                  <option value="">-- Select Team --</option>
                  {teams.map(t => <option key={t.code} value={t.code}>{t.name} ({t.code})</option>)}
                </select>
                <input 
                  type="number"
                  step="0.01"
                  min="0"
                  className={styles.searchInput}
                  style={{ width: '120px', padding: '10px' }}
                  placeholder="Price (Cr)"
                  value={manualPrice}
                  onChange={e => setManualPrice(e.target.value)}
                />
                <button 
                  className={`${styles.action} ${styles.green}`} 
                  style={{ width: 'auto', padding: '10px 16px', fontSize: '0.9rem' }}
                  onClick={() => openModal('Confirm Direct Sell?', `Are you sure you want to instantly sell to ${manualTeam} for ₹${manualPrice} Cr?`, markManualSold)}
                >
                  Confirm Quick Sell
                </button>
              </div>
            </div>

            <div className={styles.footerNote}>
              Rules enforced: ₹110 Cr budget · ₹0.15 Cr increment · 3-min timer · 15 players · 4 overseas · role caps
            </div>
          </article>

          {/* Player Queue Panel */}
          <article className={styles.card} style={{gridColumn: 'span 1'}}>
            <div className={styles.sectionTitle}>
              <h2>🎯 Player Queue</h2>
              <span className={styles.chip}>{queue.length} in queue</span>
            </div>

            {/* Queue List */}
            <div className={styles.queueList}>
              {queue.length === 0 && (
                <div className={styles.queueEmpty}>
                  <div style={{fontSize:'2rem', marginBottom:'8px'}}>📋</div>
                  <div>Queue is empty. Search and add players below.</div>
                </div>
              )}
              {queue.map((qp, idx) => (
                <div key={qp.queue_id} className={styles.queueItem}>
                  <div className={styles.queuePos}>#{idx + 1}</div>
                  <div className={styles.queueInfo}>
                    <div className={styles.queueName}>{qp.name}</div>
                    <div style={{display:'flex', gap:'6px', flexWrap:'wrap', marginTop:'3px'}}>
                      <span className={styles.queueTag} style={{color: ROLE_COLORS[qp.role] || '#ccc'}}>{qp.role}</span>
                      <span className={styles.queueTag}>🌍 {qp.country}</span>
                      <span className={styles.queueTag}>{formatCr(qp.base_price)}</span>
                    </div>
                  </div>
                  <div className={styles.queueActions}>
                    <button
                      className={`${styles.qBtn} ${styles.qGreen}`}
                      onClick={() => openModal(`Start "${qp.name}"?`, 'This will immediately start bidding for this player.', () => promoteFromQueue(qp.queue_id))}
                      title="Start Bidding Now"
                    >🚀</button>
                    <button
                      className={`${styles.qBtn} ${styles.qGray}`}
                      onClick={() => reorderQueue(qp.queue_id, 'up')}
                      disabled={idx === 0}
                      title="Move Up"
                    >▲</button>
                    <button
                      className={`${styles.qBtn} ${styles.qGray}`}
                      onClick={() => reorderQueue(qp.queue_id, 'down')}
                      disabled={idx === queue.length - 1}
                      title="Move Down"
                    >▼</button>
                    <button
                      className={`${styles.qBtn} ${styles.qRed}`}
                      onClick={() => removeFromQueue(qp.queue_id)}
                      title="Remove from Queue"
                    >✕</button>
                  </div>
                </div>
              ))}
            </div>

            {/* Search Section */}
            <div className={styles.queueSearchSection}>
              <div className={styles.sectionTitle} style={{marginBottom:'10px'}}>
                <h2 style={{fontSize:'0.92rem'}}>🔍 Add Players to Queue</h2>
              </div>
              <div className={styles.searchBar}>
                <input
                  className={styles.searchInput}
                  placeholder="Search by player name..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                <select
                  className={styles.roleFilter}
                  value={searchRole}
                  onChange={e => setSearchRole(e.target.value)}
                >
                  <option value="">All Roles</option>
                  <option value="Batsman">Batsman</option>
                  <option value="Bowler">Bowler</option>
                  <option value="All-rounder">All-rounder</option>
                  <option value="Wicketkeeper">Wicketkeeper</option>
                </select>
              </div>

              <div className={styles.searchResults}>
                {searchQuery.length === 0 && searchRole === '' && (
                  <div className={styles.searchHint}>Type a name or select a role to find players</div>
                )}
                {(searchQuery.length > 0 || searchRole !== '') && filteredPlayers.length === 0 && (
                  <div className={styles.searchHint}>No pending players match your search</div>
                )}
                {(searchQuery.length > 0 || searchRole !== '') && filteredPlayers.slice(0, 8).map(p => (
                  <div key={p.id} className={styles.searchItem}>
                    <div className={styles.searchInfo}>
                      <div className={styles.searchName}>{p.name}</div>
                      <div style={{display:'flex', gap:'5px', flexWrap:'wrap', marginTop:'3px'}}>
                        <span className={styles.queueTag} style={{color: ROLE_COLORS[p.role] || '#ccc'}}>{p.role}</span>
                        <span className={styles.queueTag}>🌍 {p.country}</span>
                        <span className={styles.queueTag}>{formatCr(p.base_price)}</span>
                      </div>
                    </div>
                    <button
                      className={`${styles.addBtn}`}
                      disabled={queueLoading}
                      onClick={() => addToQueue(p.id)}
                    >+ Queue</button>
                  </div>
                ))}
                {(searchQuery.length > 0 || searchRole !== '') && filteredPlayers.length > 8 && (
                  <div className={styles.searchHint}>Showing 8 of {filteredPlayers.length} results. Refine your search.</div>
                )}
              </div>
            </div>
          </article>
        </section>
      )}

      {toast && <div className={styles.toast}>{toast}</div>}

      {modal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>{modal.title}</h3>
            <p>{modal.msg}</p>
            <div className={styles.modalActions}>
              <button className={styles.btnCancel} onClick={cancelModal}>Cancel</button>
              <button className={styles.btnConfirm} onClick={confirmModal}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {screenLocked && (
        <div className={styles.screenLock}>
          <div className={styles.lockCard}>
            <h3>🔒 Timer Ended · Bidding Locked</h3>
            <p>The auction screen is locked. Admin can now safely confirm SOLD or UNSOLD.</p>
          </div>
        </div>
      )}
    </div>
  );
}
