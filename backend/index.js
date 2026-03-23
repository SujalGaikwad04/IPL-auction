const express = require('express');
const cors = require('cors');
const { query } = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const INCREMENT = 0.15;
const MAX_TIME = 160;

// Helper to log bid history into DB
async function logHistory(code, msg, amount, time) {
  try {
    await query(`INSERT INTO bids (code, msg, amount, time) VALUES ($1, $2, $3, $4)`, [code, msg, amount, time]);
  } catch (err) {
    console.error('Failed to log history', err);
  }
}

// ─── API: TEAMS ─────────────────────────────────────────────────────────────

app.get('/api/teams', async (req, res) => {
  try {
    const { rows: teamRows } = await query(`SELECT * FROM teams ORDER BY code`);
    const { rows: squadRows } = await query(`SELECT * FROM squads ORDER BY id`);
    
    // Parse decimals to numbers for frontend compatibility
    const teams = teamRows.map(t => ({
      ...t,
      purse: parseFloat(t.purse),
      total_spent: parseFloat(t.total_spent)
    }));

    // Convert flat squads rows into an object mapping team_code -> Array of players
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

    // Ensure status isn't already sold unless we want to allow re-auction
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

// Admin: Timer Tick (Optional, can be frontend driven but good to have)
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
    
    // Fetch newly updated
    const { rows: updatedRows } = await query(`SELECT * FROM auction_state WHERE id=1`);
    res.json(updatedRows[0]);
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Team: Place Bid
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

    // Use float calculation, be careful with decimals in DB
    const next_bid = +(parseFloat(auction.current_bid) + INCREMENT).toFixed(2);
    
    if (parseFloat(team.purse) < next_bid) {
      return res.status(400).json({ error: 'Insufficient purse balance' });
    }

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

// Admin: Mark Sold
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

    // Calculate new purse
    const newPurse = +(parseFloat(team.purse) - parseFloat(auction.current_bid)).toFixed(2);
    const newSpent = +(parseFloat(team.total_spent) + parseFloat(auction.current_bid)).toFixed(2);

    // Perform DB updates
    await query(`UPDATE teams SET purse=$1, total_spent=$2, players_bought=players_bought+1 WHERE code=$3`, [newPurse, newSpent, team.code]);
    await query(`UPDATE players SET status='sold', sold_to=$1, sold_price=$2 WHERE id=$3`, [team.code, auction.current_bid, player.id]);
    await query(`INSERT INTO squads (team_code, player_id, name, role, price) VALUES ($1, $2, $3, $4, $5)`, [team.code, player.id, player.name, player.role, auction.current_bid]);
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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🚀 IPL Auction MySQL API running on http://localhost:${PORT}`));
