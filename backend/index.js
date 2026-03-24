const express = require('express');
const cors = require('cors');
const { query } = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// ─── Auction Constants ───────────────────────────────────────────────────────
const INCREMENT = 0.15;      // ₹0.15 Crore minimum bid increment
const MAX_TIME = 180;        // 3 minutes timer (180 seconds)
const MAX_BUDGET = 110.00;   // ₹110 Crore budget per team
const MAX_PLAYERS = 13;      // Maximum squad size
const MAX_FOREIGN = 4;       // Maximum foreign players per team

// Role limits per team
const ROLE_LIMITS = {
  'Batsman': 4,
  'Bowler': 4,
  'All-rounder': 3,
  'Wicketkeeper': 2,
};

// Indian countries (everyone not in FOREIGN_COUNTRIES is considered Indian)
const FOREIGN_COUNTRIES = ['England', 'Australia', 'SA', 'NZ', 'WI', 'AFG', 'SL', 'Pakistan', 'Bangladesh'];

// Helper: Is a player foreign?
function isForeign(country) {
  return FOREIGN_COUNTRIES.includes(country);
}

// Helper to log bid history into DB
async function logHistory(code, msg, amount, time) {
  try {
    await query(`INSERT INTO bids (code, msg, amount, time) VALUES ($1, $2, $3, $4)`, [code, msg, amount, time]);
  } catch (err) {
    console.error('Failed to log history', err);
  }
}

// Helper: Get squad composition for a team
async function getSquadComposition(team_code) {
  const { rows: squadRows } = await query(`SELECT * FROM squads WHERE team_code=$1`, [team_code]);
  const squad = squadRows.map(s => ({ ...s, price: parseFloat(s.price) }));

  const roleCounts = { 'Batsman': 0, 'Bowler': 0, 'All-rounder': 0, 'Wicketkeeper': 0 };
  let foreignCount = 0;
  let totalCount = squad.length;

  for (const p of squad) {
    if (roleCounts[p.role] !== undefined) roleCounts[p.role]++;
    if (isForeign(p.country || '')) foreignCount++;
  }

  return { squad, roleCounts, foreignCount, totalCount };
}

// ─── API: TEAMS ─────────────────────────────────────────────────────────────

app.get('/api/teams', async (req, res) => {
  try {
    const { rows: teamRows } = await query(`SELECT * FROM teams ORDER BY code`);
    const { rows: squadRows } = await query(`SELECT * FROM squads ORDER BY id`);

    const teams = teamRows.map(t => ({
      ...t,
      purse: parseFloat(t.purse),
      total_spent: parseFloat(t.total_spent)
    }));

    const squads = {};
    for (const s of squadRows) {
      if (!squads[s.team_code]) squads[s.team_code] = [];
      squads[s.team_code].push({ ...s, price: parseFloat(s.price) });
    }

    res.json({ teams, squads });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── API: Squad Eligibility Check ────────────────────────────────────────────
// Returns squad composition + whether this team can bid on the current player
app.get('/api/teams/:code/can-bid', async (req, res) => {
  const { code } = req.params;
  try {
    const { rows: aRows } = await query(`SELECT * FROM auction_state WHERE id=1`);
    const auction = aRows[0];
    if (!auction || auction.status !== 'active') {
      return res.json({ canBid: false, reason: 'Auction not active', composition: null });
    }

    const { rows: pRows } = await query(`SELECT * FROM players WHERE id=$1`, [auction.current_player_id]);
    const player = pRows[0];
    if (!player) return res.json({ canBid: false, reason: 'No active player', composition: null });

    const { rows: tRows } = await query(`SELECT * FROM teams WHERE code=$1`, [code]);
    const team = tRows[0];
    if (!team) return res.json({ canBid: false, reason: 'Team not found', composition: null });

    const { roleCounts, foreignCount, totalCount } = await getSquadComposition(code);

    const next_bid = +(parseFloat(auction.current_bid) + INCREMENT).toFixed(2);

    // Check each rule
    if (parseFloat(team.purse) < next_bid) {
      return res.json({ canBid: false, reason: 'Insufficient purse balance', roleCounts, foreignCount, totalCount });
    }

    if (totalCount >= MAX_PLAYERS) {
      return res.json({ canBid: false, reason: `Squad full (max ${MAX_PLAYERS} players)`, roleCounts, foreignCount, totalCount });
    }

    if (isForeign(player.country) && foreignCount >= MAX_FOREIGN) {
      return res.json({ canBid: false, reason: `Foreign player limit reached (max ${MAX_FOREIGN})`, roleCounts, foreignCount, totalCount });
    }

    const roleLimit = ROLE_LIMITS[player.role] || 99;
    if ((roleCounts[player.role] || 0) >= roleLimit) {
      return res.json({ canBid: false, reason: `${player.role} limit reached (max ${roleLimit})`, roleCounts, foreignCount, totalCount });
    }

    res.json({ canBid: true, reason: null, roleCounts, foreignCount, totalCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── API: PLAYERS ───────────────────────────────────────────────────────────

app.get('/api/players', async (req, res) => {
  try {
    const { rows: pRows } = await query(`SELECT * FROM players ORDER BY id`);
    const players = pRows.map(p => ({
      ...p,
      base_price: parseFloat(p.base_price),
      stat3: parseFloat(p.stat3)
    }));
    res.json(players);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── API: AUCTION STATE ─────────────────────────────────────────────────────

app.get('/api/auction', async (req, res) => {
  try {
    const { rows: stateRows } = await query(`SELECT * FROM auction_state WHERE id = 1`);
    const auction = stateRows[0];
    if (auction) {
      auction.current_bid = parseFloat(auction.current_bid);
    }

    let current_player = null;
    if (auction && auction.current_player_id) {
      const { rows: pRows } = await query(`SELECT * FROM players WHERE id = $1`, [auction.current_player_id]);
      if (pRows[0]) {
        current_player = {
          ...pRows[0],
          base_price: parseFloat(pRows[0].base_price),
          stat3: parseFloat(pRows[0].stat3)
        };
      }
    }

    const { rows: bidRows } = await query(`SELECT id, code, msg, amount, time, created_at FROM bids ORDER BY created_at DESC LIMIT 50`);
    const bids = bidRows.map(b => ({ ...b, amount: parseFloat(b.amount) }));

    res.json({ auction, current_player, bids });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Start Auction for a player
app.post('/api/auction/start', async (req, res) => {
  const { player_id } = req.body;
  try {
    const { rows: pRows } = await query(`SELECT * FROM players WHERE id=$1`, [player_id]);
    const player = pRows[0];
    if (!player) return res.status(404).json({ error: 'Player not found' });

    await query(`
      UPDATE auction_state SET
        status = 'active',
        current_player_id = $1,
        current_bid = $2,
        leading_team_code = '—',
        leading_team_name = '',
        bid_count = 0,
        timer_seconds = $3
      WHERE id = 1
    `, [player.id, player.base_price, MAX_TIME]);

    await logHistory('SYS', `Started auction for ${player.name}`, player.base_price, 'just now');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Timer Tick
app.post('/api/auction/tick', async (req, res) => {
  try {
    const { rows } = await query(`SELECT * FROM auction_state WHERE id=1`);
    const auction = rows[0];
    if (!auction) return res.status(500).json({ error: "No auction state found" });
    if (auction.status !== 'active') return res.json(auction);

    const newTime = auction.timer_seconds - 1;
    if (newTime <= 0) {
      await query(`UPDATE auction_state SET status='locked', timer_seconds=0 WHERE id=1`);
      await logHistory('SYS', 'Timer ended. Bidding locked.', 0, 'just now');
    } else {
      await query(`UPDATE auction_state SET timer_seconds=$1 WHERE id=1`, [newTime]);
    }

    const { rows: updatedRows } = await query(`SELECT * FROM auction_state WHERE id=1`);
    res.json(updatedRows[0]);
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Team: Place Bid (with full rule validation) ─────────────────────────────
app.post('/api/auction/bid', async (req, res) => {
  const { team_code } = req.body;

  try {
    const { rows: aRows } = await query(`SELECT * FROM auction_state WHERE id=1`);
    const auction = aRows[0];

    if (auction.status !== 'active') {
      return res.status(400).json({ error: 'Auction is not active' });
    }

    const { rows: tRows } = await query(`SELECT * FROM teams WHERE code=$1`, [team_code]);
    const team = tRows[0];
    if (!team) return res.status(404).json({ error: 'Team not found' });

    const { rows: pRows } = await query(`SELECT * FROM players WHERE id=$1`, [auction.current_player_id]);
    const player = pRows[0];
    if (!player) return res.status(404).json({ error: 'Active player not found' });

    // ── Rule 8: Bid Increment ──
    const next_bid = +(parseFloat(auction.current_bid) + INCREMENT).toFixed(2);

    // ── Rule 7 & 12: Budget Validation ──
    if (parseFloat(team.purse) < next_bid) {
      return res.status(400).json({ error: `Insufficient purse. You need ₹${next_bid} Cr but only have ₹${parseFloat(team.purse).toFixed(2)} Cr` });
    }

    // ── Squad Composition Checks ──
    const { roleCounts, foreignCount, totalCount } = await getSquadComposition(team_code);

    // ── Rule 3: Max 13 players per squad ──
    if (totalCount >= MAX_PLAYERS) {
      return res.status(400).json({ error: `Squad full! Max ${MAX_PLAYERS} players allowed per team` });
    }

    // ── Rule 5: Max 4 foreign players ──
    if (isForeign(player.country) && foreignCount >= MAX_FOREIGN) {
      return res.status(400).json({ error: `Foreign player limit reached! Max ${MAX_FOREIGN} foreign players per team` });
    }

    // ── Rule 6: Role Limits ──
    const roleLimit = ROLE_LIMITS[player.role];
    if (roleLimit !== undefined && (roleCounts[player.role] || 0) >= roleLimit) {
      return res.status(400).json({ error: `${player.role} limit reached! Max ${roleLimit} ${player.role}s per squad` });
    }

    // All validations passed — place the bid
    await query(`
      UPDATE auction_state SET
        current_bid = $1,
        leading_team_code = $2,
        leading_team_name = $3,
        bid_count = bid_count + 1,
        timer_seconds = $4
      WHERE id = 1
    `, [next_bid, team.code, team.name, MAX_TIME]);

    await logHistory(team.code, `${team.name} raised bid`, next_bid, 'just now');

    res.json({ success: true });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Admin: Mark Sold (also validates squad rules at point of sale) ───────────
app.post('/api/auction/sold', async (req, res) => {
  try {
    const { rows: aRows } = await query(`SELECT * FROM auction_state WHERE id=1`);
    const auction = aRows[0];

    if (auction.leading_team_code === '—' || !auction.leading_team_code) {
      return res.status(400).json({ error: 'No bids placed' });
    }

    const { rows: tRows } = await query(`SELECT * FROM teams WHERE code=$1`, [auction.leading_team_code]);
    const team = tRows[0];
    if (!team) return res.status(404).json({ error: 'Winning team not found' });

    const { rows: pRows } = await query(`SELECT * FROM players WHERE id=$1`, [auction.current_player_id]);
    const player = pRows[0];
    if (!player) return res.status(404).json({ error: 'Player not found' });

    // Final safety checks at point of sale
    const { roleCounts, foreignCount, totalCount } = await getSquadComposition(auction.leading_team_code);

    if (totalCount >= MAX_PLAYERS) {
      return res.status(400).json({ error: `Cannot sell: ${team.name} squad is already full (${MAX_PLAYERS} players)` });
    }

    if (isForeign(player.country) && foreignCount >= MAX_FOREIGN) {
      return res.status(400).json({ error: `Cannot sell: ${team.name} has reached max foreign players (${MAX_FOREIGN})` });
    }

    const roleLimit = ROLE_LIMITS[player.role];
    if (roleLimit !== undefined && (roleCounts[player.role] || 0) >= roleLimit) {
      return res.status(400).json({ error: `Cannot sell: ${team.name} has reached max ${player.role}s (${roleLimit})` });
    }

    const bidAmount = parseFloat(auction.current_bid);
    if (parseFloat(team.purse) < bidAmount) {
      return res.status(400).json({ error: `Cannot sell: ${team.name} has insufficient purse` });
    }

    // Calculate new purse
    const newPurse = +(parseFloat(team.purse) - bidAmount).toFixed(2);
    const newSpent = +(parseFloat(team.total_spent) + bidAmount).toFixed(2);

    // Perform DB updates
    await query(`UPDATE teams SET purse=$1, total_spent=$2, players_bought=players_bought+1 WHERE code=$3`, [newPurse, newSpent, team.code]);
    await query(`UPDATE players SET status='sold', sold_to=$1, sold_price=$2 WHERE id=$3`, [team.code, auction.current_bid, player.id]);
    await query(`INSERT INTO squads (team_code, player_id, name, role, country, price) VALUES ($1, $2, $3, $4, $5, $6)`,
      [team.code, player.id, player.name, player.role, player.country, auction.current_bid]);
    await query(`UPDATE auction_state SET status='sold' WHERE id=1`);

    await logHistory(team.code, `Sold to ${team.name}`, auction.current_bid, 'just now');

    res.json({ success: true, team, player });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Mark Unsold
app.post('/api/auction/unsold', async (req, res) => {
  try {
    const { rows: aRows } = await query(`SELECT * FROM auction_state WHERE id=1`);
    const auction = aRows[0];

    if (auction.current_player_id) {
      await query(`UPDATE players SET status='unsold' WHERE id=$1`, [auction.current_player_id]);
    }

    await query(`UPDATE auction_state SET status='unsold' WHERE id=1`);
    await logHistory('—', 'Player marked unsold', 0, 'just now');

    res.json({ success: true });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auction/end', async (req, res) => {
  try {
    await query(`UPDATE auction_state SET status='ended' WHERE id=1`);
    await logHistory('SYS', 'Auction closed completely by Admin', 0, 'just now');
    res.json({ success: true });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Startup Migrations ───────────────────────────────────────────────────────
async function runMigrations() {
  try {
    // 1) Add country column to squads if missing
    try {
      await query(`ALTER TABLE squads ADD COLUMN country VARCHAR(50) DEFAULT 'India'`);
      console.log('✅ Migration: Added country column to squads');
    } catch (e) {
      // Column already exists — that's fine
      if (!e.message.includes('Duplicate column')) console.log('ℹ️  squads.country already exists');
    }

    // 2) Update team purses from ₹100 Cr to ₹110 Cr if not already updated
    await query(`UPDATE teams SET purse = purse + 10.00 WHERE purse <= 100.00 AND players_bought = 0`);
    console.log('✅ Migration: Team purses updated to ₹110 Cr (if applicable)');

    // 3) Update timer_seconds in auction_state from 160 to 180 if it's at old value
    await query(`UPDATE auction_state SET timer_seconds = 180 WHERE timer_seconds = 160 AND status = 'waiting'`);
    console.log('✅ Migration: Timer updated to 180 seconds (if applicable)');

  } catch (err) {
    console.error('Migration error:', err.message);
  }
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, async () => {
  console.log(`🚀 IPL Auction API running on http://localhost:${PORT}`);
  await runMigrations();
});

