import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './TeamUserPage.module.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function formatCr(v) { return '₹' + Number(v).toFixed(2) + ' Cr'; }

export default function TeamUserPage() {
  const nav = useNavigate();
  const [team, setTeam] = useState(null);
  const [squad, setSquad] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userTeamCode = localStorage.getItem('userTeam');
    if (!userTeamCode) {
      // If no team logged in, default to MI or redirect home
      // nav('/'); 
    }

    const fetchTeam = async () => {
      try {
        const res = await fetch(`${API_BASE}/teams`);
        const data = await res.json();
        
        const targetCode = userTeamCode || 'MI';
        const foundTeam = data.teams.find(t => t.code === targetCode) || data.teams[0];
        
        setTeam(foundTeam);
        setSquad(data.squads[foundTeam.code] || []);
        
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTeam();
    const int = setInterval(fetchTeam, 3000);
    return () => clearInterval(int);
  }, []);

  if (loading || !team) return <div style={{padding:'50px',color:'white'}}>Loading Team Profile...</div>;

  return (
    <div className={styles.app}>
      <header className={`${styles.header} fade-up`}>
        <div className={styles.brand}>
          <div className={styles.logo} onClick={() => nav('/')} style={{cursor:'pointer'}}>🏏</div>
          <div>
            <h1>IPL Auction 2026</h1>
            <div className={styles.muted}>Professional Live Auction Management System</div>
          </div>
        </div>
        <div className={styles.headerCenter}>
          <h2 className={styles.pageTitle}>Secure Team Dashboard</h2>
          <div className={styles.muted}>Private view for {team.name}</div>
        </div>
        <div className={styles.status}>
          <div className={styles.badge}><span className="pulse-dot"></span>Team View</div>
          <div>
            <strong>{team.name} ({team.code})</strong><br />
            <span className={styles.muted}>Logged-in active session</span>
          </div>
        </div>
      </header>

      {/* Main Stats Area */}
      <section className={`${styles.section} fade-up`} style={{ marginTop: '30px' }}>
        <div className={styles.myTeamCard}>
          <div className={styles.myTeamTop}>
            <div className={styles.myTeamTitle}>
              <div className={styles.myLogo}>{team.code}</div>
              <div>
                <h3>{team.name}</h3>
                <div className={styles.muted}>Your private budget overview is completely hidden from other teams.</div>
              </div>
            </div>
            <div className={styles.myTeamHighlight}>
              <span>Remaining Purse</span>
              <div className={styles.bigPurse}>{formatCr(team.purse)}</div>
            </div>
          </div>
          
          <div className={styles.myTeamStats} style={{ marginTop: '20px', display: 'flex', gap: '20px', background: 'rgba(0,0,0,0.3)', padding: '15px', borderRadius: '8px' }}>
            <div className={styles.miniStat}>
              <span>Total Spent</span>
              <strong>{formatCr(team.total_spent)}</strong>
            </div>
            <div className={styles.miniStat}>
              <span>Total Players Bought</span>
              <strong>{team.players_bought} Players</strong>
            </div>
          </div>
        </div>
      </section>

      {/* Squad List Area */}
      <section className={`${styles.section} fade-up`} style={{ animationDelay: '.1s' }}>
        <div className={styles.sectionHead}>
          <h2>Your Current Squad</h2>
          <span className={styles.sectionChip}>{team.players_bought} / 15 Maximum</span>
        </div>
        
        {squad.length === 0 ? (
          <div style={{ padding: '30px', background: '#111', borderRadius: '12px', textAlign: 'center', color: '#666' }}>
            You have not bought any players yet.
          </div>
        ) : (
          <div className={styles.squadList} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
            {squad.map((p, idx) => (
              <div key={idx} style={{ background: '#111', padding: '15px', borderRadius: '8px', border: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '18px', display: 'block', marginBottom: '4px' }}>{p.name}</strong>
                  <span style={{ fontSize: '12px', background: '#333', padding: '2px 8px', borderRadius: '4px' }}>{p.role}</span>
                </div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#eab308' }}>
                  {formatCr(p.price)}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      
      {/* Bid Flow Navigator */}
      <section className={`${styles.section} fade-up`} style={{ animationDelay: '.2s', display: 'flex', justifyContent: 'center', marginTop: '40px' }}>
         <button 
           onClick={() => nav('/live')}
           style={{ padding: '15px 40px', fontSize: '18px', borderRadius: '8px', background: '#ff3b3b', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 0 20px rgba(255, 59, 59, 0.4)' }}>
           Go to Live Auction Floor to Bid
         </button>
      </section>
    </div>
  );
}
