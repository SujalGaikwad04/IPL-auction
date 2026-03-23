import { useNavigate } from 'react-router-dom';
import styles from './AIEvalPage.module.css';

const RANKINGS = [
  { no:'#1', cls:'gold', name:'Mumbai Indians', sub:'Best squad balance and role coverage', tag:'Balanced', score:'92/100' },
  { no:'#2', cls:'silver', name:'Chennai Super Kings', sub:'Experienced core with good control options', tag:'Stable', score:'89/100' },
  { no:'#3', cls:'bronze', name:'Royal Challengers Bengaluru', sub:'Explosive batting but slight bowling concerns', tag:'Aggressive', score:'88/100' },
  { no:'#4', cls:'', name:'Delhi Capitals', sub:'Strong top order and decent all-round mix', tag:'Competitive', score:'85/100' },
  { no:'#5', cls:'', name:'Kolkata Knight Riders', sub:'Good impact players with some depth risk', tag:'Dynamic', score:'84/100' },
  { no:'#6', cls:'', name:'Rajasthan Royals', sub:'Quality core but middle stability is average', tag:'Sharp Core', score:'82/100' },
  { no:'#7', cls:'', name:'Gujarat Titans', sub:'Useful bowling base, slightly conservative squad', tag:'Disciplined', score:'80/100' },
  { no:'#8', cls:'', name:'Lucknow Super Giants', sub:'Good names present but role overlap exists', tag:'Mixed', score:'78/100' },
  { no:'#9', cls:'', name:'Punjab Kings', sub:'Some strong all-rounders, weaker finishing shape', tag:'Unsettled', score:'75/100' },
  { no:'#10', cls:'', name:'Sunrisers Hyderabad', sub:'Good stars but less squad balance overall', tag:'Weak Depth', score:'73/100' },
];

const ANALYSIS = [
  { name:'Mumbai Indians', sub:'Overall squad leader', score:'92/100', strength:'Strong batting lineup and reliable finishers with proven pace leaders.', weakness:'Lower-order backup options are slightly dependent on a few core players.' },
  { name:'Chennai Super Kings', sub:'Experienced and controlled', score:'89/100', strength:'Balanced experience, smart bowling options, and calm decision-making core.', weakness:'Explosive batting depth is slightly lower than the top-ranked side.' },
  { name:'Royal Challengers Bengaluru', sub:'High-impact batting', score:'88/100', strength:'Very strong top-order batting and multiple aggressive match-winners.', weakness:'Bowling depth looks a little thinner compared with the top two teams.' },
  { name:'Delhi Capitals', sub:'Well-rounded group', score:'85/100', strength:'Good balance of top-order batting, spin quality, and all-round flexibility.', weakness:'Finishing power is solid but not clearly dominant under pressure.' },
  { name:'Kolkata Knight Riders', sub:'Dynamic match-winners', score:'84/100', strength:'Multiple game-changing all-rounders and strong impact players.', weakness:'Squad stability may depend heavily on a few senior performers.' },
  { name:'Rajasthan Royals', sub:'Strong core quality', score:'82/100', strength:'Good wicketkeeping, opening strength, and quality bowling names.', weakness:'Middle-order consistency could be better in pressure scenarios.' },
  { name:'Gujarat Titans', sub:'Disciplined structure', score:'80/100', strength:'Reliable bowling spine and steady top-order foundation.', weakness:'Lower middle-order explosiveness looks slightly limited.' },
  { name:'Lucknow Super Giants', sub:'Mixed squad profile', score:'78/100', strength:'Good names across batting and all-round options with useful variety.', weakness:'Some role overlap reduces overall squad clarity and efficiency.' },
  { name:'Punjab Kings', sub:'Unsettled finishing unit', score:'75/100', strength:'Strong all-round talents and useful bowling support.', weakness:'Batting shape after the top names is less convincing.' },
  { name:'Sunrisers Hyderabad', sub:'Star-heavy but uneven', score:'73/100', strength:'Contains quality match-winners and strong headline players.', weakness:'Overall squad balance and backup depth remain weaker than rivals.' },
];

const INSIGHTS = [
  { icon:'⚖️', team:'Mumbai Indians', label:'Most Balanced Team' },
  { icon:'🏏', team:'RCB', label:'Best Batting Team' },
  { icon:'🎯', team:'CSK', label:'Best Bowling Control' },
  { icon:'💰', team:'Virat Kohli · RCB', label:'Most Expensive Pick' },
];

export default function AIEvalPage() {
  const nav = useNavigate();
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
          <h2 className={styles.pageTitle}>Team Analysis &amp; Evaluation</h2>
          <div className={styles.muted}>Smart analysis of team performance based on auction results</div>
        </div>
        <div className={styles.status}>
          <div className={styles.badge}><span className="pulse-dot"></span>AI Mode Active</div>
          <div className={styles.badge}>Final Results</div>
        </div>
      </header>

      {/* Best Team */}
      <section className={`${styles.section} fade-up`} style={{animationDelay:'.05s'}}>
        <div className={`${styles.card} ${styles.bestTeam}`}>
          <div className={styles.bestTeamGrid}>
            <div>
              <div className={styles.bestTop}>
                <div className={styles.bestLogo}>MI</div>
                <div>
                  <h2>Mumbai Indians</h2>
                  <div className={styles.trophyTag}>Best Team 🏆</div>
                </div>
              </div>
              <p className={styles.bestDesc}>Most balanced squad with strong batting, reliable finishers, proven pace attack, and enough match-winners across departments. The team shows the best mix of star power, role coverage, and auction value efficiency.</p>
            </div>
            <div className={styles.scoreBox}>
              <span>Overall Score</span>
              <div className={styles.scoreValue}>92/100</div>
              <div className={styles.scoreSub}>Elite squad balance</div>
            </div>
          </div>
        </div>
      </section>

      {/* Key Insights */}
      <section className={`${styles.section} fade-up`} style={{animationDelay:'.10s'}}>
        <div className={styles.sectionHead}>
          <h3>Key Insights</h3>
          <span className={styles.sectionChip}>Quick AI highlights</span>
        </div>
        <div className={styles.insightsGrid}>
          {INSIGHTS.map((ins, i) => (
            <div key={i} className={`${styles.card} ${styles.insightCard}`}>
              <div className={styles.insightIcon}>{ins.icon}</div>
              <div>
                <h4>{ins.team}</h4>
                <p>{ins.label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Rankings */}
      <section className={`${styles.section} fade-up`} style={{animationDelay:'.15s'}}>
        <div className={styles.sectionHead}>
          <h3>Team Rankings</h3>
          <span className={styles.sectionChip}>Best to worst</span>
        </div>
        <div className={styles.rankings}>
          {RANKINGS.map((r, i) => (
            <div key={i} className={`${styles.card} ${styles.rankRow}`}>
              <div className={`${styles.rankNo} ${r.cls ? styles[r.cls] : ''}`}>{r.no}</div>
              <div className={styles.rankTeam}>
                <strong>{r.name}</strong>
                <span>{r.sub}</span>
              </div>
              <div className={styles.tag}>{r.tag}</div>
              <div className={styles.rankScore}>{r.score}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Detailed Analysis */}
      <section className={`${styles.section} fade-up`} style={{animationDelay:'.20s'}}>
        <div className={styles.sectionHead}>
          <h3>Detailed Team Analysis</h3>
          <span className={styles.sectionChip}>Strengths and weaknesses</span>
        </div>
        <div className={styles.analysisGrid}>
          {ANALYSIS.map((a, i) => (
            <div key={i} className={`${styles.card} ${styles.analysisCard}`}>
              <div className={styles.analysisTop}>
                <div>
                  <h4>{a.name}</h4>
                  <div className={styles.muted}>{a.sub}</div>
                </div>
                <div className={styles.miniScore}>{a.score}</div>
              </div>
              <div className={styles.analysisBlock}>
                <div className={`${styles.label} ${styles.strength}`}>▲ Strength</div>
                <p>{a.strength}</p>
              </div>
              <div className={styles.analysisBlock}>
                <div className={`${styles.label} ${styles.weakness}`}>▼ Weakness</div>
                <p>{a.weakness}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
