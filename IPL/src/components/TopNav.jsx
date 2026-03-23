import { Link, useLocation, useNavigate } from 'react-router-dom';

export default function TopNav() {
  const loc = useLocation();
  const nav = useNavigate();
  
  if (loc.pathname === '/') return null;

  const isAdmin = localStorage.getItem('isAdmin') === 'true';
  const userTeam = localStorage.getItem('userTeam');

  const handleLogout = () => {
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('userTeam');
    nav('/');
  };

  return (
    <nav style={{
      background: '#1a1a2e', padding: '15px 30px', borderBottom: '1px solid #3b82f6',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      position: 'sticky', top: 0, zIndex: 9999, color: 'white',
      boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
    }}>
      <div style={{ display: 'flex', gap: '25px', alignItems: 'center' }}>
        <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#eab308', marginRight: '20px' }}>🏏 IPL Auction</div>
        <Link to="/live" style={{ color: loc.pathname === '/live' ? '#fff' : '#888', textDecoration: loc.pathname === '/live' ? 'underline' : 'none', fontWeight: 'bold' }}>🔴 Live Floor</Link>
        <Link to="/players" style={{ color: loc.pathname === '/players' ? '#fff' : '#888', textDecoration: loc.pathname === '/players' ? 'underline' : 'none', fontWeight: 'bold' }}>📋 Player Database</Link>
        
        {isAdmin && <Link to="/teams" style={{ color: loc.pathname === '/teams' ? '#fff' : '#888', textDecoration: loc.pathname === '/teams' ? 'underline' : 'none', fontWeight: 'bold' }}>Admin Overview</Link>}
        {isAdmin && <Link to="/ai-eval" style={{ color: loc.pathname === '/ai-eval' ? '#fff' : '#888', textDecoration: loc.pathname === '/ai-eval' ? 'underline' : 'none', fontWeight: 'bold' }}>AI Evaluation</Link>}
        
        {userTeam && !isAdmin && <Link to="/team-view" style={{ color: loc.pathname === '/team-view' ? '#fff' : '#888', textDecoration: loc.pathname === '/team-view' ? 'underline' : 'none', fontWeight: 'bold' }}>My Team Dashboard</Link>}
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <span style={{ color: '#aaa', fontWeight: 'bold', border: '1px solid #444', padding: '5px 10px', borderRadius: '4px' }}>
          {isAdmin ? '🛡️ Admin Authorized' : userTeam ? `👤 Logged in as: ${userTeam}` : '👤 Spectator'}
        </span>
        <button onClick={handleLogout} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', transition: '0.2s' }}>
          Logout
        </button>
      </div>
    </nav>
  );
}
