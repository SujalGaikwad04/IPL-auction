import { Link, useLocation, useNavigate } from 'react-router-dom';
import styles from './TopNav.module.css';

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
    <nav className={styles.nav}>
      <div className={styles.leftContainer}>
        <div className={styles.brand}>🏏 IPL Auction</div>
        <Link to="/live" className={`${styles.navLink} ${loc.pathname === '/live' ? styles.navLinkActive : ''}`}>🔴 Live Floor</Link>
        <Link to="/players" className={`${styles.navLink} ${loc.pathname === '/players' ? styles.navLinkActive : ''}`}>📋 Player Database</Link>
        <Link to="/rules" className={`${styles.navLink} ${loc.pathname === '/rules' ? styles.navLinkActive : ''}`}>📖 Rules</Link>
        
        {isAdmin && <Link to="/teams" className={`${styles.navLink} ${loc.pathname === '/teams' ? styles.navLinkActive : ''}`}>Admin Overview</Link>}
        {isAdmin && <Link to="/ai-eval" className={`${styles.navLink} ${loc.pathname === '/ai-eval' ? styles.navLinkActive : ''}`}>AI Evaluation</Link>}
        
        {userTeam && !isAdmin && <Link to="/team-view" className={`${styles.navLink} ${loc.pathname === '/team-view' ? styles.navLinkActive : ''}`}>My Team Dashboard</Link>}
      </div>
      
      <div className={styles.rightContainer}>
        <span className={styles.statusBadge}>
          {isAdmin ? '🛡️ Admin Authorized' : userTeam ? `👤 Logged in as: ${userTeam}` : '👤 Spectator'}
        </span>
        <button onClick={handleLogout} className={styles.logoutBtn}>
          Logout
        </button>
      </div>
    </nav>
  );
}
