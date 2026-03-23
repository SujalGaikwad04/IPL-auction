import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import styles from './HomePage.module.css';

export default function HomePage() {
  const nav = useNavigate();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState('MI');
  const [passwordInput, setPasswordInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const TEAM_OPTIONS = [
    { code: 'MI', name: 'Mumbai Indians' },
    { code: 'CSK', name: 'Chennai Super Kings' },
    { code: 'RCB', name: 'Royal Challengers Bengaluru' },
    { code: 'KKR', name: 'Kolkata Knight Riders' },
    { code: 'DC', name: 'Delhi Capitals' },
    { code: 'RR', name: 'Rajasthan Royals' },
    { code: 'PBKS', name: 'Punjab Kings' },
    { code: 'SRH', name: 'Sunrisers Hyderabad' },
    { code: 'GT', name: 'Gujarat Titans' },
    { code: 'LSG', name: 'Lucknow Super Giants' },
  ];

  const handleAdminClick = () => {
    setShowPasswordModal(true);
    setErrorMsg('');
    setPasswordInput('');
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (passwordInput === '0411') {
      localStorage.setItem('isAdmin', 'true');
      nav('/live');
    } else {
      setErrorMsg('Incorrect password');
    }
  };

  const handleTeamLogin = (e) => {
    e.preventDefault();
    localStorage.removeItem('isAdmin'); // Clear admin if logging in as team
    localStorage.setItem('userTeam', selectedTeam);
    nav('/team-view');
  };

  return (
    <div className={styles.app}>
      {/* Navbar */}
      <div className={styles.navbarWrap}>
        <nav className={styles.navbar}>
          <div className={styles.brand}>
            <div className={styles.logo}>🏏</div>
            <div>
              <h1>IPL Auction 2026</h1>
              <p>Premium Auction Management Dashboard</p>
            </div>
          </div>
          <div className={styles.navActions}>
            <div className={styles.badge}>Live System Status • Ready</div>
            <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={handleAdminClick}>Admin</button>
            <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setShowTeamModal(true)}>Team Login</button>
          </div>
        </nav>
      </div>

      <main>
        {/* Hero */}
        <section className={styles.hero}>
          <div className={styles.heroGrid}>
            <div className={`${styles.heroCard} fade-up`}>
              <div className={styles.eyebrow}>⚡ Real-time Sports-Tech Platform</div>
              <h2>Live IPL Auction Management System</h2>
              <p className={styles.lead}>
                Smart system to manage live bidding, player allocation, and team purse automatically
                without human errors. Designed for speed, accuracy, and a premium auction experience.
              </p>
              <div className={styles.heroActions}>
                <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleAdminClick}>Enter as Admin</button>
                <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setShowTeamModal(true)}>Enter as Team</button>
              </div>
              <div className={styles.heroMeta}>
                <span>✔ Real-time bids</span>
                <span>✔ Automatic purse updates</span>
                <span>✔ Clean and error-free flow</span>
              </div>
            </div>

            <div className={`${styles.heroVisual} fade-up`}>
              <div className={styles.stadiumLights}></div>
              <div className={`${styles.auctionStage} glass`}>
                <div className={styles.screenBar}>
                  <span className={styles.live}><span className={styles.dot}></span> Live Auction</span>
                  <span>Season 2026 • Main Arena</span>
                </div>
                <div className={styles.board}>
                  <div className={styles.playerCard}>
                    <div className={styles.playerSilhouette}></div>
                    <div className={styles.priceTag}>Current Bid • ₹9.35 Cr</div>
                    <h3>Premier All-Rounder</h3>
                    <p>Fast-paced live bidding with automatic price increments and clean player allocation.</p>
                  </div>
                  <div className={styles.sideColumn}>
                    <div className={styles.statusCard}>
                      <h4>Current Bids</h4>
                      <div className={styles.bids}>
                        <div className={styles.bidRow}><span>Mumbai</span><strong>₹8.90 Cr</strong></div>
                        <div className={styles.bidRow}><span>Chennai</span><strong>₹9.05 Cr</strong></div>
                        <div className={styles.bidRow}><span>Bangalore</span><strong>₹9.20 Cr</strong></div>
                        <div className={styles.bidRow}><span>Delhi</span><strong>₹9.35 Cr</strong></div>
                      </div>
                    </div>
                    <div className={styles.miniChart}>
                      <div className={styles.screenBar}><span>Purse Trend</span><span>Real-time</span></div>
                      <div className={styles.bars}>
                        {[58,82,68,92,72].map((h,i) => (
                          <div key={i} className={styles.bar} style={{height:`${h}%`}}></div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className={styles.teamStrip}>
                  {['MI','CSK','RCB','KKR','DC'].map(t => (
                    <div key={t} className={styles.teamPill}>{t}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className={styles.section}>
          <div className={styles.statsGrid}>
            {[
              {val:'10', label:'IPL Teams'},
              {val:'80+', label:'Players in Pool'},
              {val:'₹100 Cr', label:'Max Purse / Team'},
              {val:'Real-time', label:'Bid Updates'},
            ].map((s,i) => (
              <div key={i} className={styles.card} style={{animationDelay:`${i*0.08}s`}}>
                <div className={styles.statValue}>{s.val}</div>
                <div className={styles.statLabel}>{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <h3>Why This System?</h3>
              <p>Everything you need to run a professional IPL auction — live, fast, and error-free.</p>
            </div>
          </div>
          <div className={styles.featuresGrid}>
            {[
              {icon:'⚡', title:'Live Bidding Engine', desc:'Teams place bids in real time. The system validates purse balance and updates instantly for everyone.'},
              {icon:'⏱', title:'Countdown Timer', desc:'Built-in countdown ensures the auction moves at pace. Auto-locks bidding when timer expires.'},
              {icon:'🛡', title:'Error Prevention', desc:'Insufficient balance, duplicate bids, and post-lock submissions are all blocked automatically.'},
              {icon:'📋', title:'Bid History Log', desc:'Full transparent log of every bid placed with team name, price, and timestamp.'},
              {icon:'💰', title:'Purse Tracking', desc:'Each team\'s remaining balance is updated the moment a player is sold. No manual entries needed.'},
              {icon:'🏏', title:'Admin Controls', desc:'Pause, resume, mark sold/unsold, or move to next player — all from a clean admin panel.'},
            ].map((f,i) => (
              <div key={i} className={styles.card}>
                <div className={styles.icon}>{f.icon}</div>
                <h4>{f.title}</h4>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <h3>How It Works</h3>
              <p>Four simple steps to run a complete auction session.</p>
            </div>
          </div>
          <div className={styles.stepsGrid}>
            {[
              {n:'1', title:'Admin starts', desc:'Admin launches the auction and brings the first player on stage.'},
              {n:'2', title:'Teams bid', desc:'Each team clicks Place Bid. The system checks balance and updates prices in real time.'},
              {n:'3', title:'Timer counts', desc:'A visible timer keeps things moving. Bidding auto-locks when time is up.'},
              {n:'4', title:'Admin confirms', desc:'Admin marks the player Sold or Unsold. Purse is deducted and history is recorded.'},
            ].map((s,i) => (
              <div key={i} className={styles.card}>
                <div className={styles.stepNumber}>{s.n}</div>
                <h4>{s.title}</h4>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className={styles.section}>
          <div className={styles.ctaBand}>
            <div>
              <h4>Ready to start the auction?</h4>
              <p>Enter as admin to control the auction or as a team user to bid live.</p>
            </div>
            <div style={{display:'flex',gap:'12px',flexWrap:'wrap'}}>
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleAdminClick}>Enter Admin Dashboard</button>
              <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => nav('/teams')}>View Teams Overview</button>
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerCard}>
          <span>🏏 IPL Auction 2026 · Premium Management System</span>
          <span>Built with React + Vite</span>
        </div>
      </footer>

      {showPasswordModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', zIndex: 9999,
          justifyContent: 'center', alignItems: 'center'
        }}>
          <div style={{
            background: '#1a1a2e', padding: '30px', borderRadius: '12px',
            border: '1px solid #333', width: '90%', maxWidth: '350px',
            color: 'white', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
          }}>
            <h3 style={{ marginBottom: '10px' }}>Admin Access</h3>
            <p style={{ marginBottom: '20px', color: '#999', fontSize: '14px' }}>Enter password to launch live auction.</p>
            <form onSubmit={handleLogin}>
              <input 
                type="password" 
                autoFocus
                value={passwordInput}
                onChange={e => setPasswordInput(e.target.value)}
                placeholder="Enter password..."
                style={{
                  width: '100%', padding: '12px', marginBottom: '15px',
                  borderRadius: '6px', border: '1px solid #444',
                  background: '#111', color: 'white'
                }}
              />
              {errorMsg && <p style={{ color: '#ef4444', fontSize: '14px', margin: '-5px 0 15px 0' }}>{errorMsg}</p>}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  type="button" 
                  onClick={() => setShowPasswordModal(false)}
                  style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid #555', color: 'white', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  style={{ flex: 1, padding: '10px', background: '#3b82f6', border: 'none', color: 'white', fontWeight: 'bold', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Login
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTeamModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', zIndex: 9999,
          justifyContent: 'center', alignItems: 'center'
        }}>
          <div style={{
            background: '#1a1a2e', padding: '30px', borderRadius: '12px',
            border: '1px solid #333', width: '90%', maxWidth: '350px',
            color: 'white', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
          }}>
            <h3 style={{ marginBottom: '10px' }}>Team Login</h3>
            <p style={{ marginBottom: '20px', color: '#999', fontSize: '14px' }}>Select your franchise to access your dashboard and bid.</p>
            <form onSubmit={handleTeamLogin}>
              <select 
                value={selectedTeam}
                onChange={e => setSelectedTeam(e.target.value)}
                style={{
                  width: '100%', padding: '12px', marginBottom: '20px',
                  borderRadius: '6px', border: '1px solid #444',
                  background: '#111', color: 'white'
                }}
              >
                {TEAM_OPTIONS.map(t => (
                  <option key={t.code} value={t.code}>{t.name} ({t.code})</option>
                ))}
              </select>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  type="button" 
                  onClick={() => setShowTeamModal(false)}
                  style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid #555', color: 'white', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  style={{ flex: 1, padding: '10px', background: '#eab308', border: 'none', color: '#111', fontWeight: 'bold', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Join Auction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
