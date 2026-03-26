import { useNavigate } from 'react-router-dom';
import styles from './RulesPage.module.css';

const RULES = [
  {
    number: '01',
    icon: '🏟️',
    title: 'Total Teams',
    color: '#3b82f6',
    summary: '10 Franchises Competing',
    points: [
      '10 IPL teams participate in the auction',
      'All teams start with equal budget and no players',
      'Every team must submit a final squad of 11–15 players',
    ],
    extra: null,
  },
  {
    number: '02',
    icon: '👥',
    title: 'Player Pool',
    color: '#8b5cf6',
    summary: '130 Players Available',
    points: [
      '130 registered players are available for bidding',
      'Players are categorised into Elite, Tier-1, Mid and Budget tiers',
      'Each player has a fixed base price to start bidding',
    ],
    extra: null,
  },
  {
    number: '03',
    icon: '🎯',
    title: 'Squad Size',
    color: '#10b981',
    summary: '11 Min · 15 Max Players',
    points: [
      'The maximum squad must be of 15 players',
      'The minimum squad must be of 11 players',
      'Remaining slots (beyond 11) act as substitutes or backup',
    ],
    extra: {
      type: 'highlight',
      label: 'Playing XI',
      desc: 'Only 11 players can play in the final playing team.',
    },
  },
  {
    number: '04',
    icon: '🌐',
    title: 'Foreign Player Rule',
    color: '#f59e0b',
    summary: 'Exactly 4 Foreign Players',
    points: [
      'Each squad MUST have exactly 4 overseas (foreign) players in their final squad',
      'Remaining players must be Indian nationals',
      'A bid on a foreign player will be blocked if the team already has 4',
    ],
    extra: {
      type: 'example',
      label: 'Example Squad Breakdown',
      items: ['🇮🇳 11 Indian Players', '🌐 4 Foreign Players', '= 15 Total'],
    },
  },
  {
    number: '05',
    icon: '⚡',
    title: 'Role Minimums',
    color: '#ef4444',
    summary: 'Minimum Role Requirements',
    points: [
      'Each squad must have a minimum of 4 Bowlers and 1 Wicketkeeper.',
      'Flexible role maximums allow teams to build a squad up to 15 players.',
    ],
    extra: {
      type: 'roles',
      roles: [
        { icon: '🏏', label: 'Batsmen', desc: 'Max 6', color: '#3b82f6' },
        { icon: '🎯', label: 'Bowlers', desc: 'Min 4, Max 7', color: '#ef4444' },
        { icon: '⚡', label: 'All-rounders', desc: 'Max 4', color: '#10b981' },
        { icon: '🧤', label: 'Wicketkeepers', desc: 'Min 1, Max 3', color: '#f59e0b' },
      ],
    },
  },
  {
    number: '06',
    icon: '💰',
    title: 'Team Budget',
    color: '#06b6d4',
    summary: '₹110 Crore Per Team',
    points: [
      'Every team starts with a budget of ₹110 Crore',
      'Budget is automatically deducted when a player is sold',
      'A team cannot bid if their remaining purse is less than the next bid',
    ],
    extra: {
      type: 'highlight',
      label: 'Budget Rule',
      desc: 'Underspent purse does NOT carry over — spend wisely!',
    },
  },
  {
    number: '07',
    icon: '📈',
    title: 'Bidding Increment',
    color: '#84cc16',
    summary: '₹0.15 Crore Minimum Raise',
    points: [
      'Every new bid must be at least ₹0.15 Crore more than the current bid',
      'The system automatically calculates the next valid bid amount',
      'Manual custom amounts are not allowed — fixed increment only',
    ],
    extra: {
      type: 'example',
      label: 'Bid Progression Example',
      items: ['Base Price → ₹1.00 Cr', 'Next Bid → ₹1.15 Cr', 'Next Bid → ₹1.30 Cr', 'Next Bid → ₹1.45 Cr'],
    },
  },
  {
    number: '08',
    icon: '⏱️',
    title: 'Auction Timer',
    color: '#f97316',
    summary: '3 Minutes Per Player',
    points: [
      'Each player gets a 3-minute bidding window (180 seconds)',
      'Timer resets to 3 minutes every time a new bid is placed',
      'When timer reaches 0, bidding is automatically locked',
      'Admin must then confirm SOLD or UNSOLD',
    ],
    extra: {
      type: 'highlight',
      label: '⚠️ Lock Rule',
      desc: 'Once the timer ends, no more bids can be placed until admin takes action.',
    },
  },
  {
    number: '09',
    icon: '🔨',
    title: 'Sold Rule',
    color: '#22c55e',
    summary: 'Admin Confirms Each Sale',
    points: [
      'When admin clicks Mark as Sold, the bid amount is deducted from the team purse',
      'The player is added to that team\'s official squad',
      'The sale is validated against all rules before confirming',
      'A sold player cannot be re-auctioned',
    ],
    extra: null,
  },
  {
    number: '10',
    icon: '❌',
    title: 'Unsold Rule',
    color: '#ef4444',
    summary: 'No Bids = Unsold',
    points: [
      'If no team places a bid during the 3-minute window, the player is marked Unsold',
      'Unsold players are removed from the auction pool',
      'No purse is deducted for unsold players',
    ],
    extra: null,
  },
  {
    number: '11',
    icon: '🛡️',
    title: 'Budget Validation',
    color: '#a78bfa',
    summary: 'Automatic Balance Checks',
    points: [
      'A team cannot place a bid if they cannot afford the next increment',
      'The system validates purse in real-time before every bid',
      'Bid button is automatically disabled with a clear reason shown',
      'Budget check is also repeated at the point of sale confirmation',
    ],
    extra: {
      type: 'highlight',
      label: 'Smart Prevention',
      desc: 'Over-bidding, rule violations, and balance errors are blocked automatically — no human intervention needed.',
    },
  },
  {
    number: '12',
    icon: '📋',
    title: 'Bid History',
    color: '#38bdf8',
    summary: 'Full Transparent Audit Log',
    points: [
      'Every bid placed is permanently recorded in the bid history',
      'History shows team name, bid amount, and timestamp',
      'All players, admins and spectators can view the bid log in real time',
      'History is preserved for the entire auction session',
    ],
    extra: null,
  },
];

const QUICK_REFS = [
  { label: 'Teams', value: '10', icon: '🏟️', color: '#3b82f6' },
  { label: 'Players', value: '130', icon: '👥', color: '#8b5cf6' },
  { label: 'Budget', value: '₹110 Cr', icon: '💰', color: '#06b6d4' },
  { label: 'Increment', value: '₹0.15 Cr', icon: '📈', color: '#84cc16' },
  { label: 'Squad Max', value: '15', icon: '🎯', color: '#10b981' },
  { label: 'Foreign Max', value: '4', icon: '🌐', color: '#f59e0b' },
  { label: 'Timer', value: '3 min', icon: '⏱️', color: '#f97316' },
  { label: 'Playing XI', value: '11', icon: '⚡', color: '#ef4444' },
];

export default function RulesPage() {
  const nav = useNavigate();

  return (
    <div className={styles.page}>
      {/* ── Hero Banner ─────────────────────────────────────────── */}
      <section className={styles.hero}>
        <div className={styles.heroGlow} />
        <div className={styles.heroBadge}>📋 Official Rulebook</div>
        <h1 className={styles.heroTitle}>IPL Auction 2026</h1>
        <p className={styles.heroSub}>
          Complete rules & regulations governing the live auction.<br />
          All rules are automatically enforced by the system.
        </p>
        <button className={styles.ctaBtn} onClick={() => nav('/live')}>
          🔴 Go to Live Auction
        </button>
      </section>

      {/* ── Quick Reference Bar ──────────────────────────────────── */}
      <section className={styles.quickRef}>
        <div className={styles.quickGrid}>
          {QUICK_REFS.map((q, i) => (
            <div key={i} className={styles.quickCard} style={{ '--accent': q.color }}>
              <div className={styles.quickIcon}>{q.icon}</div>
              <div className={styles.quickValue}>{q.value}</div>
              <div className={styles.quickLabel}>{q.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Rules Grid ──────────────────────────────────────────── */}
      <section className={styles.rulesSection}>
        <div className={styles.sectionHeader}>
          <h2>The 12 Auction Rules</h2>
          <p>Every rule below is enforced in real-time by the system — no manual checking needed.</p>
        </div>

        <div className={styles.rulesGrid}>
          {RULES.map((rule) => (
            <div
              key={rule.number}
              className={styles.ruleCard}
              style={{ '--rule-color': rule.color }}
            >
              {/* Card Header */}
              <div className={styles.ruleHeader}>
                <div className={styles.ruleNum} style={{ color: rule.color }}>{rule.number}</div>
                <div className={styles.ruleIcon}>{rule.icon}</div>
              </div>
              <h3 className={styles.ruleTitle}>{rule.title}</h3>
              <div className={styles.ruleSummary} style={{ borderLeftColor: rule.color }}>
                {rule.summary}
              </div>

              {/* Rule Points */}
              <ul className={styles.rulePoints}>
                {rule.points.map((pt, i) => (
                  <li key={i}>
                    <span className={styles.bullet} style={{ background: rule.color }} />
                    {pt}
                  </li>
                ))}
              </ul>

              {/* Extra content */}
              {rule.extra?.type === 'roles' && (
                <div className={styles.rolesGrid}>
                  {rule.extra.roles.map((r, i) => (
                    <div key={i} className={styles.roleBox} style={{ borderColor: r.color }}>
                      <span className={styles.roleIcon}>{r.icon}</span>
                      <span className={styles.roleLabel}>{r.label}</span>
                      <span className={styles.roleMax} style={{ color: r.color }}>{r.desc || `Max ${r.max}`}</span>
                    </div>
                  ))}
                </div>
              )}

              {rule.extra?.type === 'example' && (
                <div className={styles.exampleBox} style={{ borderColor: rule.color }}>
                  <div className={styles.exampleLabel}>{rule.extra.label}</div>
                  {rule.extra.items.map((item, i) => (
                    <div key={i} className={styles.exampleItem}>{item}</div>
                  ))}
                </div>
              )}

              {rule.extra?.type === 'highlight' && (
                <div className={styles.highlightBox} style={{ borderColor: rule.color, background: `${rule.color}15` }}>
                  <strong>{rule.extra.label}</strong>
                  <p>{rule.extra.desc}</p>
                </div>
              )}

              {/* Color bar accent */}
              <div className={styles.ruleAccent} style={{ background: `linear-gradient(90deg, ${rule.color}, transparent)` }} />
            </div>
          ))}
        </div>
      </section>

      {/* ── Role Composition Infographic ─────────────────────────── */}
      <section className={styles.infographic}>
        <div className={styles.infoCard}>
          <h2>🏏 Perfect Squad Composition</h2>
          <p className={styles.infoSub}>The ideal squad structure following all role limits</p>
          <div className={styles.squadViz}>
            <div className={styles.squadRow}>
              {[...Array(5)].map((_, i) => (
                <div key={i} className={styles.squadDot} style={{ background: '#3b82f6' }} title="Batsman">🏏</div>
              ))}
              <span className={styles.squadRoleLabel} style={{ color: '#3b82f6' }}>5 Batsmen</span>
            </div>
            <div className={styles.squadRow}>
              {[...Array(5)].map((_, i) => (
                <div key={i} className={styles.squadDot} style={{ background: '#ef4444' }} title="Bowler">🎯</div>
              ))}
              <span className={styles.squadRoleLabel} style={{ color: '#ef4444' }}>5 Bowlers</span>
            </div>
            <div className={styles.squadRow}>
              {[...Array(3)].map((_, i) => (
                <div key={i} className={styles.squadDot} style={{ background: '#10b981' }} title="All-rounder">⚡</div>
              ))}
              <span className={styles.squadRoleLabel} style={{ color: '#10b981' }}>3 All-rounders</span>
            </div>
            <div className={styles.squadRow}>
              {[...Array(2)].map((_, i) => (
                <div key={i} className={styles.squadDot} style={{ background: '#f59e0b' }} title="Wicketkeeper">🧤</div>
              ))}
              <span className={styles.squadRoleLabel} style={{ color: '#f59e0b' }}>2 Wicketkeepers</span>
            </div>
            <div className={styles.squadTotal}>
              <strong>Total = 15 Players</strong>
              <span>(11 Indian + 4 Overseas)</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer CTA ───────────────────────────────────────────── */}
      <section className={styles.footerCta}>
        <h2>Ready to Bid?</h2>
        <p>All rules are enforced automatically. Just focus on building the best team.</p>
        <div className={styles.ctaBtns}>
          <button className={styles.ctaBtn} onClick={() => nav('/live')}>🔴 Live Auction Floor</button>
          <button className={styles.ctaBtnOutline} onClick={() => nav('/players')}>📋 Player Database</button>
        </div>
      </section>
    </div>
  );
}
