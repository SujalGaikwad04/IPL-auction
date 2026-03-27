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
const MAX_PLAYERS = 15;      // Maximum squad size
const MAX_FOREIGN = 4;       // Maximum foreign players per team

// Role limits per team
const ROLE_LIMITS = {
  'Batsman': 6,
  'Bowler': 7,
  'All-rounder': 4,
  'Wicketkeeper': 3,
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

// ─── API: PLAYER QUEUE ──────────────────────────────────────────────────────

// GET full queue with player details
app.get('/api/queue', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT pq.id as queue_id, pq.position, p.*
       FROM player_queue pq
       JOIN players p ON p.id = pq.player_id
       ORDER BY pq.position ASC`
    );
    const queue = rows.map(r => ({
      ...r,
      base_price: parseFloat(r.base_price),
      stat3: parseFloat(r.stat3)
    }));
    res.json({ queue });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST add a player to the queue
app.post('/api/queue/add', async (req, res) => {
  const { player_id } = req.body;
  if (!player_id) return res.status(400).json({ error: 'player_id required' });
  try {
    // Check player exists and is pending
    const { rows: pRows } = await query(`SELECT * FROM players WHERE id=?`, [player_id]);
    const player = pRows[0];
    if (!player) return res.status(404).json({ error: 'Player not found' });
    if (player.status !== 'pending') return res.status(400).json({ error: `Player is already ${player.status}` });

    // Check not already in queue
    const { rows: existing } = await query(`SELECT id FROM player_queue WHERE player_id=?`, [player_id]);
    if (existing.length > 0) return res.status(400).json({ error: 'Player already in queue' });

    // Get next position
    const { rows: posRows } = await query(`SELECT COALESCE(MAX(position), 0) + 1 as next_pos FROM player_queue`);
    const nextPos = posRows[0].next_pos;

    await query(`INSERT INTO player_queue (player_id, position) VALUES (?, ?)`, [player_id, nextPos]);
    res.json({ success: true, message: `${player.name} added to queue at position ${nextPos}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE remove a player from the queue
app.delete('/api/queue/:queueId', async (req, res) => {
  const { queueId } = req.params;
  try {
    await query(`DELETE FROM player_queue WHERE id=?`, [queueId]);
    // Re-number positions
    const { rows: remaining } = await query(`SELECT id FROM player_queue ORDER BY position ASC`);
    for (let i = 0; i < remaining.length; i++) {
      await query(`UPDATE player_queue SET position=? WHERE id=?`, [i + 1, remaining[i].id]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST promote first queue player to live auction (or a specific one)
app.post('/api/queue/promote', async (req, res) => {
  const { queue_id } = req.body;
  try {
    let queueEntry;
    if (queue_id) {
      const { rows } = await query(`SELECT * FROM player_queue WHERE id=?`, [queue_id]);
      queueEntry = rows[0];
    } else {
      const { rows } = await query(`SELECT * FROM player_queue ORDER BY position ASC LIMIT 1`);
      queueEntry = rows[0];
    }
    if (!queueEntry) return res.status(404).json({ error: 'No player in queue' });

    const { rows: pRows } = await query(`SELECT * FROM players WHERE id=?`, [queueEntry.player_id]);
    const player = pRows[0];
    if (!player) return res.status(404).json({ error: 'Player not found' });

    // Start auction for this player
    await query(`
      UPDATE auction_state SET
        status = 'active',
        current_player_id = ?,
        current_bid = ?,
        leading_team_code = '—',
        leading_team_name = '',
        bid_count = 0,
        timer_seconds = ?
      WHERE id = 1
    `, [player.id, player.base_price, MAX_TIME]);

    // Remove from queue
    await query(`DELETE FROM player_queue WHERE id=?`, [queueEntry.id]);
    // Re-number
    const { rows: remaining } = await query(`SELECT id FROM player_queue ORDER BY position ASC`);
    for (let i = 0; i < remaining.length; i++) {
      await query(`UPDATE player_queue SET position=? WHERE id=?`, [i + 1, remaining[i].id]);
    }

    await logHistory('SYS', `Started auction for ${player.name} (from queue)`, player.base_price, 'just now');
    res.json({ success: true, player });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST move queue item up or down
app.post('/api/queue/reorder', async (req, res) => {
  const { queue_id, direction } = req.body; // direction: 'up' | 'down'
  try {
    const { rows: all } = await query(`SELECT * FROM player_queue ORDER BY position ASC`);
    const idx = all.findIndex(q => q.id == queue_id);
    if (idx === -1) return res.status(404).json({ error: 'Queue entry not found' });

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= all.length) return res.json({ success: true, message: 'Already at edge' });

    // Swap positions
    const posA = all[idx].position;
    const posB = all[swapIdx].position;
    await query(`UPDATE player_queue SET position=? WHERE id=?`, [posB, all[idx].id]);
    await query(`UPDATE player_queue SET position=? WHERE id=?`, [posA, all[swapIdx].id]);

    res.json({ success: true });
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

    // Remove from queue if present
    await query(`DELETE FROM player_queue WHERE player_id=?`, [player.id]);

    await logHistory(team.code, `Sold to ${team.name}`, auction.current_bid, 'just now');

    res.json({ success: true, team, player });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Admin: Manual Override Sell ─────────────────────────────────────────────
app.post('/api/auction/manual-sell', async (req, res) => {
  const { team_code, sold_price } = req.body;
  if (!team_code || !sold_price || sold_price <= 0) {
    return res.status(400).json({ error: 'Valid team code and price required' });
  }

  try {
    const { rows: aRows } = await query(`SELECT * FROM auction_state WHERE id=1`);
    const auction = aRows[0];

    const { rows: tRows } = await query(`SELECT * FROM teams WHERE code=$1`, [team_code]);
    const team = tRows[0];
    if (!team) return res.status(404).json({ error: 'Team not found' });

    const { rows: pRows } = await query(`SELECT * FROM players WHERE id=$1`, [auction.current_player_id]);
    const player = pRows[0];
    if (!player) return res.status(404).json({ error: 'No active player to sell' });

    // Final safety checks
    const { roleCounts, foreignCount, totalCount } = await getSquadComposition(team_code);

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

    if (parseFloat(team.purse) < sold_price) {
      return res.status(400).json({ error: `Cannot sell: ${team.name} has insufficient purse` });
    }

    // Calculate new purse
    const newPurse = +(parseFloat(team.purse) - sold_price).toFixed(2);
    const newSpent = +(parseFloat(team.total_spent) + sold_price).toFixed(2);

    // Perform DB updates
    await query(`UPDATE teams SET purse=$1, total_spent=$2, players_bought=players_bought+1 WHERE code=$3`, [newPurse, newSpent, team.code]);
    await query(`UPDATE players SET status='sold', sold_to=$1, sold_price=$2 WHERE id=$3`, [team.code, sold_price, player.id]);
    await query(`INSERT INTO squads (team_code, player_id, name, role, country, price) VALUES ($1, $2, $3, $4, $5, $6)`,
      [team.code, player.id, player.name, player.role, player.country, sold_price]);
    
    // Update auction state
    await query(`UPDATE auction_state SET status='sold', current_bid=$1, leading_team_code=$2, leading_team_name=$3 WHERE id=1`, 
      [sold_price, team.code, team.name]);

    // Remove from queue if present
    await query(`DELETE FROM player_queue WHERE player_id=?`, [player.id]);

    await logHistory(team.code, `Manually Sold to ${team.name}`, sold_price, 'just now');

    player.sold_price = sold_price;
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
      // Remove from queue if present
      await query(`DELETE FROM player_queue WHERE player_id=?`, [auction.current_player_id]);
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

// ─── Admin: Cancel Sold Player ──────────────────────────────────────────────
app.post('/api/auction/cancel-sold', async (req, res) => {
  const { player_id, team_code } = req.body;
  try {
    const { rows: tRows } = await query(`SELECT * FROM teams WHERE code=$1`, [team_code]);
    const team = tRows[0];
    if (!team) return res.status(404).json({ error: 'Team not found' });

    const { rows: pRows } = await query(`SELECT * FROM players WHERE id=$1`, [player_id]);
    const player = pRows[0];
    if (!player) return res.status(404).json({ error: 'Player not found' });

    if (player.status !== 'sold' || player.sold_to !== team_code) {
      return res.status(400).json({ error: 'Player is not sold to this team' });
    }

    const refundAmount = parseFloat(player.sold_price);

    // Update Team purse and spent
    const newPurse = +(parseFloat(team.purse) + refundAmount).toFixed(2);
    const newSpent = +(parseFloat(team.total_spent) - refundAmount).toFixed(2);
    const newBought = Math.max(0, parseInt(team.players_bought) - 1);

    await query(`UPDATE teams SET purse=$1, total_spent=$2, players_bought=$3 WHERE code=$4`, [newPurse, newSpent, newBought, team.code]);
    
    // Delete from squads
    await query(`DELETE FROM squads WHERE player_id=$1 AND team_code=$2`, [player.id, team.code]);
    
    // Reset player
    await query(`UPDATE players SET status='pending', sold_to=NULL, sold_price=NULL WHERE id=$1`, [player.id]);

    await logHistory(team.code, `Cancelled sale of ${player.name}`, refundAmount, 'just now');

    res.json({ success: true, message: `Sale cancelled. Refunded ${refundAmount} Cr.` });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Admin: Edit Sold Price ─────────────────────────────────────────────────
app.post('/api/auction/edit-price', async (req, res) => {
  const { player_id, team_code, new_price } = req.body;
  const price = parseFloat(new_price);
  if (isNaN(price) || price <= 0) return res.status(400).json({ error: 'Invalid price' });

  try {
    const { rows: tRows } = await query(`SELECT * FROM teams WHERE code=$1`, [team_code]);
    const team = tRows[0];
    if (!team) return res.status(404).json({ error: 'Team not found' });

    const { rows: pRows } = await query(`SELECT * FROM players WHERE id=$1`, [player_id]);
    const player = pRows[0];
    if (!player) return res.status(404).json({ error: 'Player not found' });

    if (player.status !== 'sold' || player.sold_to !== team_code) {
      return res.status(400).json({ error: 'Player is not sold to this team' });
    }

    const oldPrice = parseFloat(player.sold_price);
    const diff = +(price - oldPrice).toFixed(2);

    if (parseFloat(team.purse) < diff) {
      return res.status(400).json({ error: `Not enough purse to cover the price increase of ₹${diff} Cr` });
    }

    const newPurse = +(parseFloat(team.purse) - diff).toFixed(2);
    const newSpent = +(parseFloat(team.total_spent) + diff).toFixed(2);

    await query(`UPDATE teams SET purse=$1, total_spent=$2 WHERE code=$3`, [newPurse, newSpent, team.code]);
    await query(`UPDATE squads SET price=$1 WHERE player_id=$2 AND team_code=$3`, [price, player.id, team.code]);
    await query(`UPDATE players SET sold_price=$1 WHERE id=$2`, [price, player.id]);

    await logHistory(team.code, `Price changed for ${player.name} to ${price} Cr`, price, 'just now');

    res.json({ success: true, message: `Price updated to ${price} Cr.` });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Admin: Full Reset (for testing) ────────────────────────────────────────
app.post('/api/auction/reset', async (req, res) => {
  try {
    // 1. Reset all players back to pending
    await query(`UPDATE players SET status='pending', sold_to=NULL, sold_price=NULL`);

    // 2. Clear all squads
    await query(`DELETE FROM squads`);

    // 3. Clear bid history
    await query(`DELETE FROM bids`);

    // 4. Clear player queue
    await query(`DELETE FROM player_queue`);

    // 5. Reset team purses, spent and bought counts
    await query(`UPDATE teams SET purse=110.00, total_spent=0.00, players_bought=0`);

    // 6. Reset auction state
    await query(`
      UPDATE auction_state SET
        status='waiting',
        current_player_id=NULL,
        current_bid=0,
        leading_team_code='—',
        leading_team_name='',
        bid_count=0,
        timer_seconds=180
      WHERE id=1
    `);

    console.log('🔄 Auction fully reset by Admin');
    res.json({ success: true, message: 'Auction has been fully reset.' });
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

    // 4) Create player_queue table if it doesn't exist
    await query(`
      CREATE TABLE IF NOT EXISTS player_queue (
        id INT AUTO_INCREMENT PRIMARY KEY,
        player_id INT NOT NULL,
        position INT NOT NULL DEFAULT 0,
        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_player (player_id)
      )
    `);
    console.log('✅ Migration: player_queue table ready');

  } catch (err) {
    console.error('Migration error:', err.message);
  }
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, async () => {
  console.log(`🚀 IPL Auction API running on http://localhost:${PORT}`);
  await runMigrations();
});

