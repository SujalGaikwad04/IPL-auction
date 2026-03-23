import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './TeamsOverviewPage.module.css';

const API_BASE = 'http://localhost:3001/api';

function formatCr(v) { return '₹' + Number(v).toFixed(2) + ' Cr'; }

export default function TeamsOverviewPage() {
  const nav = useNavigate();
  const [modal, setModal] = useState(null);
  const [teams, setTeams] = useState([]);
  const [squads, setSquads] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const res = await fetch(`${API_BASE}/teams`);
        const data = await res.json();
        setTeams(data.teams || []);
        setSquads(data.squads || {});
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTeams();
    const int = setInterval(fetchTeams, 3000);
    return () => clearInterval(int);
  }, []);

  const totalPlayersSold = Object.values(squads).flat().length;
  // Calculate most expensive dynamically
  let mostExpensive = { name: '-', price: 0 };
  Object.values(squads).flat().forEach(p => {
    if (parseFloat(p.price) > mostExpensive.price) {
      mostExpensive = { name: p.name, price: parseFloat(p.price) };
    }
  });
  
  // Calculate highest spending dynamically
  let highestSpending = { code: '-', spent: 0 };
  teams.forEach(t => {
    if (t.total_spent > highestSpending.spent) {
      highestSpending = { code: t.code, spent: t.total_spent };
    }
  });

  return (
    <div className={styles.app} style={{ padding: '0 30px' }}>
      <header className={`${styles.header} fade-up`}>
        <div className={styles.brand}>
          <div className={styles.logo} onClick={() => nav('/')} style={{cursor:'pointer'}}>🏏</div>
          <div>
            <h1>IPL Auction 2026</h1>
            <p>Professional Live Auction Management System</p>
          </div>
        </div>
        <div className={styles.headerCenter}>
          <h2 className={styles.pageTitle}>Admin Teams Overview</h2>
          <div className={styles.muted}>Live master tracking of all franchises</div>
        </div>
        <div className={styles.status}>
          <div className={styles.badge}><span className="pulse-dot"></span>Live Sync</div>
          <div>
            <strong>Admin Authority</strong><br />
            <span className={styles.muted}>Deep database tracking</span>
          </div>
        </div>
      </header>

      {/* Summary Cards */}
      <section className={`${styles.section} fade-up`} style={{animationDelay:'.06s'}}>
        <div className={styles.summaryGrid}>
          {[
            {icon:'👥', val: teams.length, label:'Total Teams'},
            {icon:'✅', val: totalPlayersSold, label:'Total Players Sold'},
            {icon:'💎', val: mostExpensive.name, label:`Most Exp. · ${formatCr(mostExpensive.price)}`},
            {icon:'📈', val: highestSpending.code, label:`Highest Spender · ${formatCr(highestSpending.spent)}`},
          ].map((s,i) => (
            <div key={i} className={styles.summaryCard}>
              <div className={styles.summaryIcon}>{s.icon}</div>
              <div>
                <h3>{s.val}</h3>
                <p>{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Teams Grid */}
      <section className={`${styles.section} fade-up`} style={{animationDelay:'.12s'}}>
        <div className={styles.sectionHead}>
          <h2>All Teams</h2>
          <span className={styles.sectionChip}>Live Purses & Squads</span>
        </div>
        <div className={styles.teamsGrid}>
          {loading ? <div style={{color:'white'}}>Loading live data...</div> : teams.map((team, i) => {
            const teamSquad = squads[team.code] || [];
            
            return (
            <div key={team.code} className={`${styles.teamCard} fade-up`} style={{animationDelay:`${0.05*(i+1)}s`}}>
              <div className={styles.teamTop}>
                <div>
                  <h3>{team.name}</h3>
                  <div className={styles.muted}>{team.code}</div>
                </div>
                <div className={styles.teamLogo}>{team.code}</div>
              </div>
              <div className={styles.stats}>
                <div className={styles.statRow}><span>Spent</span><strong>{formatCr(team.total_spent)}</strong></div>
                <div className={styles.statRow}><span>Purse</span><strong style={{color: '#4ade80'}}>{formatCr(team.purse)}</strong></div>
                <div className={styles.statRow}><span>Players</span><strong>{team.players_bought}</strong></div>
              </div>
              <div className={styles.playersPreview} style={{marginBottom:'14px'}}>
                <span className={styles.label}>Top Players Spotlight</span>
                <div className={styles.playerChips}>
                  {teamSquad.slice(0, 4).map(p => <span key={p.name} className={styles.playerChip}>{p.name}</span>)}
                  {teamSquad.length > 4 && <span className={styles.playerChip}>+ more</span>}
                  {teamSquad.length === 0 && <span className={styles.playerChip}>No players bought</span>}
                </div>
              </div>
              <button className={styles.viewBtn} onClick={() => setModal({ ...team, fullSquad: teamSquad })}>Inspect Complete Squad</button>
            </div>
            );
          })}
        </div>
      </section>

      {/* Modal */}
      {modal && (
        <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className={styles.modal}>
            <div className={styles.modalTop}>
              <div className={styles.modalTitleWrap}>
                <div className={styles.teamLogo}>{modal.code}</div>
                <div>
                  <h3>{modal.name}</h3>
                  <div className={styles.muted}>Official verified purchase log</div>
                </div>
              </div>
              <button className={styles.closeBtn} onClick={() => setModal(null)}>✕</button>
            </div>
            <div className={styles.modalSummary}>
              <div className={styles.modalStat}><span>Total Players</span><strong>{modal.players_bought}</strong></div>
              <div className={styles.modalStat}><span>Total Spent</span><strong>{formatCr(modal.total_spent)}</strong></div>
              <div className={styles.modalStat}><span>Remaining Purse</span><strong style={{color:'#4ade80'}}>{formatCr(modal.purse)}</strong></div>
            </div>
            <div className={styles.squadList}>
              {modal.fullSquad.length === 0 ? (
                <div style={{color:'#666', textAlign:'center', padding:'20px'}}>No players recruited yet.</div>
              ) : modal.fullSquad.map((p) => (
                <div key={p.name} className={styles.squadItem}>
                  <div><strong>{p.name}</strong></div>
                  <div><span className={styles.rolePill}>{p.role}</span></div>
                  <div className={styles.price}>{formatCr(p.price)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
