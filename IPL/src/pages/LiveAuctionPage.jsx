import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './LiveAuctionPage.module.css';
import PlayerPhoto from '../components/PlayerPhoto';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const MAX_TIME = 180; // 3 minutes

// ─── Auction Rule Constants (mirrored from backend) ──────────────────────────
const MAX_PLAYERS = 13;
const MAX_FOREIGN = 4;
const ROLE_LIMITS = { 'Batsman': 4, 'Bowler': 4, 'All-rounder': 3, 'Wicketkeeper': 2 };

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

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 1500);
    return () => clearInterval(interval);
  }, [fetchState]);

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

  const nextPlayer = async () => {
    setSoldBanner(null);
    try {
      const res = await fetch(`${API_BASE}/players`);
      const allPlayers = await res.json();
      const pending = allPlayers.filter(p => p.status === 'pending');
      if (pending.length === 0) return showToast('No more pending players!');

      const currentIdx = pending.findIndex(p => p.id === player?.id);
      const nextP = currentIdx >= 0 && currentIdx + 1 < pending.length
        ? pending[currentIdx + 1]
        : pending[0];

      await fetch(`${API_BASE}/auction/start`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: nextP.id })
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

  const openModal = (title, msg, cb) => setModal({ title, msg, cb });
  const confirmModal = () => { if (modal?.cb) modal.cb(); setModal(null); };
  const cancelModal = () => setModal(null);

  if (!auction || !teams) return <div style={{padding: '50px', color: 'white'}}>Loading Live Auction State...</div>;

  const isLocked = ['locked', 'ended', 'waiting', 'sold', 'unsold'].includes(auction.status);
  const saleClosed = ['sold', 'unsold', 'ended'].includes(auction.status);
  const percent = Math.max(0, (auction.timer_seconds / MAX_TIME) * 100);

  const isAdmin = localStorage.getItem('isAdmin') === 'true';
  const userTeam = localStorage.getItem('userTeam');

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
              <div>No active player. Admin — click Next Player to start.</div>
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
                <li>Squad: <span>Max 13 players</span></li>
                <li>Foreign: <span>Max 4 / team</span></li>
                <li>Roles: <span>4 BAT · 4 BWL · 3 AR · 2 WK</span></li>
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
                  <span>👤 Squad: <strong style={{color: totalCount >= 13 ? '#f87171' : '#86efac'}}>{totalCount}/{MAX_PLAYERS}</strong></span>
                  <span>🌐 Foreign: <strong style={{color: foreignCount >= 4 ? '#f87171' : '#fbbf24'}}>{foreignCount}/{MAX_FOREIGN}</strong></span>
                  <span>🏏 Bat: <strong style={{color: roleCounts['Batsman'] >= 4 ? '#f87171' : '#cbd5e1'}}>{roleCounts['Batsman']}/4</strong></span>
                  <span>🎯 Bowl: <strong style={{color: roleCounts['Bowler'] >= 4 ? '#f87171' : '#cbd5e1'}}>{roleCounts['Bowler']}/4</strong></span>
                  <span>⚡ AR: <strong style={{color: roleCounts['All-rounder'] >= 3 ? '#f87171' : '#cbd5e1'}}>{roleCounts['All-rounder']}/3</strong></span>
                  <span>🧤 WK: <strong style={{color: roleCounts['Wicketkeeper'] >= 2 ? '#f87171' : '#cbd5e1'}}>{roleCounts['Wicketkeeper']}/2</strong></span>
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

      {/* Admin Controls */}
      {isAdmin && (
        <section className={styles.lowerGrid}>
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
              <button className={`${styles.action} ${styles.blue}`}
                onClick={() => openModal('Load next player?', 'Move to the next pending player?', nextPlayer)}>
                ⏭ Next Player
              </button>
              <button className={`${styles.action} ${styles.red}`}
                onClick={() => openModal('End Auction?', 'This will stop the auction permanently.', endAuction)}>
                🛑 End Auction
              </button>
            </div>
            <div className={styles.footerNote}>
              Rules enforced: ₹110 Cr budget · ₹0.15 Cr increment · 3-min timer · 13 players · 4 overseas · role caps
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
