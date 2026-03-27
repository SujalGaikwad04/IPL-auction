import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './TeamsOverviewPage.module.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function formatCr(v) { return '₹' + Number(v).toFixed(2) + ' Cr'; }

export default function TeamsOverviewPage() {
  const nav = useNavigate();
  const [modal, setModal] = useState(null);
  const [teams, setTeams] = useState([]);
  const [squads, setSquads] = useState({});
  const [loading, setLoading] = useState(true);
  const isAdmin = localStorage.getItem('isAdmin') === 'true';
  const [editPlayerId, setEditPlayerId] = useState(null);
  const [editPriceInput, setEditPriceInput] = useState('');
  
  // New Team Management States
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [newTeam, setNewTeam] = useState({ code: '', name: '', purse: 110.00 });
  const [editingTeamCode, setEditingTeamCode] = useState(null);
  const [editingTeamName, setEditingTeamName] = useState('');

  const fetchTeamsForce = async (currModalCode) => {
    try {
      const res = await fetch(`${API_BASE}/teams`);
      const data = await res.json();
      setTeams(data.teams || []);
      setSquads(data.squads || {});
      
      // Update modal data securely using code passed or state
      if (currModalCode) {
        const updatedTeam = (data.teams || []).find(t => t.code === currModalCode);
        const updatedSquad = (data.squads || {})[currModalCode] || [];
        if (updatedTeam) setModal({ ...updatedTeam, fullSquad: updatedSquad });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamsForce(modal?.code);
    const int = setInterval(() => fetchTeamsForce(modal?.code), 3000);
    return () => clearInterval(int);
  }, [modal?.code]);

  const handleCancelSold = async (player_id, team_code) => {
    if (!window.confirm('Are you sure you want to cancel this player sale and return them to the unsold/pending list?')) return;
    try {
      const res = await fetch(`${API_BASE}/auction/cancel-sold`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ player_id, team_code })
      });
      const data = await res.json();
      if (data.error) alert(data.error);
      else fetchTeamsForce(modal?.code);
    } catch(err) { console.error(err); }
  };

  const handleEditPrice = async (player_id, team_code) => {
    if (!editPriceInput) return;
    try {
      const res = await fetch(`${API_BASE}/auction/edit-price`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ player_id, team_code, new_price: editPriceInput })
      });
      const data = await res.json();
      if (data.error) alert(data.error);
      else {
        setEditPlayerId(null);
        fetchTeamsForce(modal?.code);
      }
    } catch(err) { console.error(err); }
  };

  const handleAddTeam = async () => {
    try {
      if (!newTeam.code || !newTeam.name) return window.alert('Name and Code are required!');
      const res = await fetch(`${API_BASE}/teams`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(newTeam)
      });
      const data = await res.json();
      if (data.error) window.alert(data.error);
      else {
        setShowAddTeam(false);
        setNewTeam({ code: '', name: '', purse: 110.00 });
        fetchTeamsForce(modal?.code);
      }
    } catch(err) { console.error(err); }
  };

  const handleRenameTeam = async (code) => {
    if (!editingTeamName) return;
    try {
      const res = await fetch(`${API_BASE}/teams/${code}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ name: editingTeamName })
      });
      const data = await res.json();
      if (data.error) window.alert(data.error);
      else {
        setEditingTeamCode(null);
        fetchTeamsForce(modal?.code);
      }
    } catch (err) { console.error(err); }
  };

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
        <div className={styles.sectionHead} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2>All Teams</h2>
            <span className={styles.sectionChip}>Live Purses & Squads</span>
          </div>
          {isAdmin && (
            <button 
              onClick={() => setShowAddTeam(!showAddTeam)} 
              style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              + Add New Team
            </button>
          )}
        </div>

        {/* Add Team Inline Form */}
        {isAdmin && showAddTeam && (
          <div style={{ marginBottom: '20px', padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1, minWidth: '150px' }}>
              <label style={{ fontSize: '0.8rem', color: '#ccc' }}>Team Code (e.g. MI, CSK)</label>
              <input value={newTeam.code} onChange={e => setNewTeam({...newTeam, code: e.target.value})} placeholder="Code" style={{ padding: '8px', borderRadius: '6px', border: '1px solid #444', background: '#111', color: 'white' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 2, minWidth: '200px' }}>
              <label style={{ fontSize: '0.8rem', color: '#ccc' }}>Full Team Name</label>
              <input value={newTeam.name} onChange={e => setNewTeam({...newTeam, name: e.target.value})} placeholder="e.g. Mumbai Indians" style={{ padding: '8px', borderRadius: '6px', border: '1px solid #444', background: '#111', color: 'white' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1, minWidth: '100px' }}>
              <label style={{ fontSize: '0.8rem', color: '#ccc' }}>Starting Purse (Cr)</label>
              <input type="number" step="1" value={newTeam.purse} onChange={e => setNewTeam({...newTeam, purse: parseFloat(e.target.value)})} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #444', background: '#111', color: 'white' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', paddingTop: '20px' }}>
              <button onClick={handleAddTeam} style={{ background: '#22c55e', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Save Team</button>
            </div>
          </div>
        )}

        <div className={styles.teamsGrid}>
          {loading ? <div style={{color:'white'}}>Loading live data...</div> : teams.map((team, i) => {
            const teamSquad = squads[team.code] || [];
            
            return (
            <div key={team.code} className={`${styles.teamCard} fade-up`} style={{animationDelay:`${0.05*(i+1)}s`}}>
              <div className={styles.teamTop}>
                <div>
                  {editingTeamCode === team.code && isAdmin ? (
                    <div style={{ display: 'flex', gap: '5px', alignItems: 'center', marginBottom: '4px' }}>
                      <input 
                        value={editingTeamName} 
                        onChange={e => setEditingTeamName(e.target.value)} 
                        autoFocus
                        style={{ padding: '4px 6px', width: '140px', background: '#111', color: '#fff', border: '1px solid #444', borderRadius: '4px' }}
                      />
                      <button onClick={() => handleRenameTeam(team.code)} style={{ padding: '4px 8px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>Save</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h3 style={{ margin: 0 }}>{team.name}</h3>
                      {isAdmin && (
                        <button 
                          title="Rename team"
                          onClick={() => { setEditingTeamCode(team.code); setEditingTeamName(team.name); }} 
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#999', fontSize: '1rem', padding: 0 }}
                        >✏️</button>
                      )}
                    </div>
                  )}
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
                <div key={p.name} className={styles.squadItem} style={{ flexWrap: 'wrap' }}>
                  <div style={{minWidth: '100px'}}><strong>{p.name}</strong></div>
                  <div><span className={styles.rolePill}>{p.role}</span></div>
                  
                  {editPlayerId === p.player_id && isAdmin ? (
                    <div style={{ display: 'flex', gap: '5px', alignItems: 'center', marginLeft: 'auto' }}>
                      <input 
                        type="number" step="0.01" min="0"
                        value={editPriceInput} 
                        onChange={e => setEditPriceInput(e.target.value)} 
                        style={{ width: '70px', padding: '4px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: '4px' }}
                      />
                      <button onClick={() => handleEditPrice(p.player_id, modal.code)} style={{ padding: '4px 8px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Save</button>
                      <button onClick={() => setEditPlayerId(null)} style={{ padding: '4px 8px', background: 'transparent', color: '#999', border: 'none', cursor: 'pointer' }}>✕</button>
                    </div>
                  ) : (
                    <div className={styles.price} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: 'auto' }}>
                      {formatCr(p.price)}
                      {isAdmin && (
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button 
                            onClick={() => { setEditPlayerId(p.player_id); setEditPriceInput(parseFloat(p.price)); }} 
                            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                            title="Edit Price"
                          >✏️</button>
                          <button 
                            onClick={() => handleCancelSold(p.player_id, modal.code)} 
                            style={{ background: 'rgba(239,68,68,0.2)', border: 'none', color: '#f87171', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                            title="Cancel Sale"
                          >✕</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
