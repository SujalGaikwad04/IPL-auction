import { useState, useEffect } from 'react';
import { getPlayerPhotoSources, getAvatarStyle, getInitials } from '../playerPhotos';
import styles from './PlayerPhoto.module.css';

/**
 * PlayerPhoto — Smart player image component.
 *
 * Tries URLs in sequence:
 *   1. Local /players/{id}.jpeg
 *   2. Local /players/{id}.jpg
 *   3. Local /players/{id}.png
 *   4. ESPN Cricinfo CDN
 *   5. Styled initials avatar (always works)
 *
 * Props:
 *   player   — { id, name, role, country }
 *   size     — 'sm' | 'md' | 'lg' (default 'lg')
 *   animate  — boolean, whether to animate in on mount (default true)
 */
export default function PlayerPhoto({ player, size = 'lg', animate = true }) {
  const [srcIndex, setSrcIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  const sources = player ? getPlayerPhotoSources(player) : [];

  // Reset when player changes
  useEffect(() => {
    setSrcIndex(0);
    setLoaded(false);
    setFailed(false);
  }, [player?.id]);

  if (!player) return null;

  const handleError = () => {
    if (srcIndex < sources.length - 1) {
      setSrcIndex(i => i + 1);
    } else {
      setFailed(true);
      setLoaded(true);
    }
  };

  const roleColors = {
    'Batsman':     { bg: 'rgba(59,130,246,0.25)', border: '#3b82f6', icon: '🏏' },
    'Bowler':      { bg: 'rgba(239,68,68,0.25)',  border: '#ef4444', icon: '🎯' },
    'All-rounder': { bg: 'rgba(16,185,129,0.25)', border: '#10b981', icon: '⚡' },
    'Wicketkeeper':{ bg: 'rgba(245,158,11,0.25)', border: '#f59e0b', icon: '🧤' },
  };
  const roleStyle = roleColors[player.role] || roleColors['Batsman'];

  return (
    <div className={`${styles.wrapper} ${styles[size]} ${animate ? styles.animate : ''}`}>
      {/* Role accent border */}
      <div className={styles.roleBorder} style={{ borderColor: roleStyle.border }} />

      {/* Photo or Avatar */}
      {!failed ? (
        <>
          <img
            key={`${player.id}-${srcIndex}`}
            src={sources[srcIndex]}
            alt={player.name}
            className={`${styles.photo} ${loaded ? styles.visible : styles.hidden}`}
            onLoad={() => setLoaded(true)}
            onError={handleError}
          />
          {/* Loading shimmer */}
          {!loaded && <div className={styles.shimmer} />}
        </>
      ) : (
        /* Initials avatar fallback */
        <div
          className={styles.avatar}
          style={{ background: getAvatarStyle(player.name) }}
        >
          <span className={styles.initials}>{getInitials(player.name)}</span>
          <span className={styles.roleIcon}>{roleStyle.icon}</span>
        </div>
      )}

      {/* Role badge */}
      <div className={styles.roleBadge} style={{ background: roleStyle.bg, borderColor: roleStyle.border }}>
        {roleStyle.icon} {player.role}
      </div>

      {/* Overseas flag */}
      {['England', 'Australia', 'SA', 'NZ', 'WI', 'AFG', 'SL', 'Pakistan', 'Bangladesh'].includes(player.country) && (
        <div className={styles.overseasBadge}>🌐 Overseas</div>
      )}
    </div>
  );
}
