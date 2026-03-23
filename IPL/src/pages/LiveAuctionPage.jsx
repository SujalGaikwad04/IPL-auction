import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './LiveAuctionPage.module.css';

const API_BASE = 'http://localhost:3001/api';

const MAX_TIME = 160;

function formatCr(v) { return '₹' + Number(v).toFixed(2) + ' Cr'; }
function formatTime(s) {
  const m = Math.floor(s/60).toString().padStart(2,'0');
  const sec = Math.floor(s%60).toString().padStart(2,'0');
  return `${m}:${sec}`;
}

export default function LiveAuctionPage() {
  const nav = useNavigate();
  const timerRef = useRef(null);

  const [auction, setAuction] = useState(null);
  const [player, setPlayer] = useState(null);
  const [teams, setTeams] = useState([]);
  const [history, setHistory] = useState([]);
  const [toast, setToast] = useState('');
  const [soldBanner, setSoldBanner] = useState(null);
  const [modal, setModal] = useState(null);
  const [screenLocked, setScreenLocked] = useState(false);
  const [screenLockMsg, setScreenLockMsg] = useState({ title:'Timer Ended · Bidding Locked', body:'The auction screen is locked to prevent last-second mistakes. Admin can now confirm SOLD or UNSOLD safely.' });

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2600);
  };

  const fetchState = async () => {
    try {
      const [auctionRes, teamsRes] = await Promise.all([
        fetch(`${API_BASE}/auction`).then(r => r.json()),
        fetch(`${API_BASE}/teams`).then(r => r.json())
      ]);
      setAuction(auctionRes.auction);
      setPlayer(auctionRes.current_player);
      setHistory(auctionRes.bids);
      setTeams(teamsRes.teams);
      
      if (auctionRes.auction.status === 'locked' && !screenLocked) {
        setScreenLocked(true);
      } else if (auctionRes.auction.status !== 'locked') {
        setScreenLocked(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 1000); // Polling every sec
    return () => clearInterval(interval);
  }, []);

  const placeBid = async (code) => {
    if (auction?.status !== 'active') return showToast('Bidding is closed.');
    try {
      const res = await fetch(`${API_BASE}/auction/bid`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_code: code })
      });
      const data = await res.json();
      if (data.error) showToast(data.error);
      else fetchState();
    } catch (e) { console.error(e); }
  };

  const markSold = async () => {
    try {
      const res = await fetch(`${API_BASE}/auction/sold`, { method: 'POST' });
      const data = await res.json();
      if (data.error) return showToast(data.error);
      setSoldBanner({ text:`Sold to ${data.team.name} for ${formatCr(data.player.sold_price)}`, bg:'rgba(34,197,94,.10)', border:'rgba(34,197,94,.25)', color:'#dfffe8' });
      fetchState();
    } catch (e) { console.error(e); }
  };

  const markUnsold = async () => {
    try {
      await fetch(`${API_BASE}/auction/unsold`, { method: 'POST' });
      setSoldBanner({ text:`Unsold · ${player?.name} received no final confirmation`, bg:'rgba(239,68,68,.10)', border:'rgba(239,68,68,.25)', color:'#ffe7ea' });
      fetchState();
    } catch (e) { console.error(e); }
  };

  const nextPlayer = async () => {
    setSoldBanner(null);
    try {
      const nextId = player ? player.id + 1 : 1;
      await fetch(`${API_BASE}/auction/start`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: nextId })
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

  const startTimer = () => {  /* backend driven */ fetch(`${API_BASE}/auction`).then(fetchState); };
  const pauseTimer = () => { /* Add logic if needed */ showToast('Not implemented in simple backend'); };

  const openModal = (title, msg, cb) => setModal({ title, msg, cb });
  const confirmModal = () => { if (modal?.cb) modal.cb(); setModal(null); };
  const cancelModal = () => setModal(null);

  if (!auction || !teams) return <div style={{padding: '50px', color: 'white'}}>Loading Live Auction State...</div>;

  const isLocked = auction.status === 'locked' || auction.status === 'ended' || auction.status === 'waiting' || auction.status === 'sold' || auction.status === 'unsold';
  const saleClosed = auction.status === 'sold' || auction.status === 'unsold' || auction.status === 'ended';
  const percent = Math.max(0, (auction.timer_seconds / MAX_TIME) * 100);
  const status = saleClosed ? (soldBanner?.text || 'Closed') : isLocked ? 'Locked - Timer Ended' : 'Active';

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
            <strong>Admin Panel</strong><br />
            <small className={styles.mini}>Real-time control dashboard</small>
          </div>
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
              <div className={styles.playerImage}>🧍</div>
              <div>
                <h3 className={styles.playerName}>{player.name}</h3>
                <div className={styles.playerMeta}>
                  <span className={styles.tag}>🌍 {player.country}</span>
                  <span className={styles.tag}>{player.role}</span>
                  <span className={styles.tag}>Base: {formatCr(player.base_price)}</span>
                  <span className={styles.tag}>Prev: {player.prev_team}</span>
                </div>
                <div className={styles.playerStats}>
                  <div className={styles.stat}><span className={styles.mini}>Age</span><strong>{player.age}</strong></div>
                  <div className={styles.stat}><span className={styles.mini}>{player.stat1_label}</span><strong>{player.stat1}</strong></div>
                  <div className={styles.stat}><span className={styles.mini}>{player.stat2_label}</span><strong>{player.stat2}</strong></div>
                  <div className={styles.stat}><span className={styles.mini}>{player.stat3_label}</span><strong>{player.stat3}</strong></div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{color: 'white'}}>No active player. Start auction to view player details.</div>
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
            <div className={styles.leadTeam}>🏆 Leading Team: {auction.leading_team_code}</div>
            {soldBanner && (
              <div className={styles.soldBanner} style={{background:soldBanner.bg, borderColor:soldBanner.border, color:soldBanner.color}}>
                {soldBanner.text}
              </div>
            )}
            <div className={styles.timer}>
              <div className={styles.mini}>Time Left</div>
              <p className={styles.timerTime}>{formatTime(auction.timer_seconds)}</p>
              <div className={styles.progress}><span style={{width:`${percent}%`}}></span></div>
              {auction.status === 'locked' && <div className={styles.lockNote}>Bidding is locked because timer ended.</div>}
            </div>
            <div className={styles.summaryBox}>
              <strong>Current Auction Summary</strong>
              <ul>
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
            const isAdmin = localStorage.getItem('isAdmin') === 'true';
            const ut = localStorage.getItem('userTeam');
            if (isAdmin) return true;
            if (ut) return t.code === ut;
            return true;
          })
          .map(team => {
          const nextBid = +(auction.current_bid + 0.15).toFixed(2);
          const noBalance = team.purse < nextBid;
          const disabled = noBalance || isLocked || saleClosed;
          const isLeading = team.code === auction.leading_team_code;
          return (
            <div key={team.code} className={`${styles.teamCard} ${isLeading ? styles.leading : ''}`}>
              <div className={styles.teamHead}>
                <div>
                  <h3>{team.name}</h3>
                  <p>Purse: ₹{team.purse.toFixed(2)} Cr</p>
                </div>
                <div className={styles.teamLogo}>{team.code}</div>
              </div>
              <button
                className={styles.bidBtn}
                disabled={disabled}
                onClick={() => placeBid(team.code)}
              >
                {noBalance ? 'Insufficient Balance' : saleClosed ? 'Bidding Closed' : isLocked ? 'Locked' : 'Place Bid'}
              </button>
            </div>
          );
        })}
      </section>

      {/* Admin Controls */}
      {localStorage.getItem('isAdmin') === 'true' && (
      <section className={styles.lowerGrid}>
        <article className={styles.card}>
          <div className={styles.sectionTitle}><h2>Admin Controls</h2><span className={styles.chip}>Visible only for admin</span></div>
          <div className={styles.adminControls}>
            <button className={`${styles.action} ${styles.blue}`} onClick={() => openModal('Start Timer', 'Start countdown for the current player?', startTimer)}>Start Timer (N/A)</button>
            <button className={`${styles.action} ${styles.orange}`} onClick={pauseTimer}>Pause Timer</button>
            <button className={`${styles.action} ${styles.green}`} onClick={() => openModal('Are you sure?', 'Confirm SOLD for the current player?', markSold)}>Mark as Sold</button>
            <button className={`${styles.action} ${styles.red}`} onClick={() => openModal('Are you sure?', 'Confirm UNSOLD for the current player?', markUnsold)}>Mark as Unsold</button>
            <button className={`${styles.action} ${styles.blue}`} onClick={() => openModal('Load next player?', 'This will reset bid state and move to the next player.', nextPlayer)}>Next Player</button>
            <button className={`${styles.action} ${styles.red}`} onClick={() => openModal('End Auction?', 'This will stop the auction screen permanently.', endAuction)}>End Auction</button>
          </div>
          <div className={styles.footerNote}>Backend-driven state.</div>
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
            <h3>{screenLockMsg.title}</h3>
            <p>{screenLockMsg.body}</p>
          </div>
        </div>
      )}
    </div>
  );
}

