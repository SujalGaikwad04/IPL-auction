// ─── IPL Auction — In-memory data store ───────────────────────────────────────

const players = [
  { id: 1, name: 'Jasprit Bumrah',    role: 'Bowler',       country: 'India',       base_price: 2.00,  age: 32, stat1: 165, stat1_label: 'Wickets', stat2: 133, stat2_label: 'Matches', stat3: 7.30, stat3_label: 'Economy', prev_team: 'MI',   status: 'pending' },
  { id: 2, name: 'Virat Kohli',       role: 'Batsman',      country: 'India',       base_price: 3.00,  age: 36, stat1: 973, stat1_label: 'Runs',    stat2: 237, stat2_label: 'Matches', stat3: 36.2, stat3_label: 'Avg',     prev_team: 'RCB',  status: 'pending' },
  { id: 3, name: 'MS Dhoni',          role: 'Wicketkeeper', country: 'India',       base_price: 2.00,  age: 42, stat1: 4978,stat1_label: 'Runs',    stat2: 229, stat2_label: 'Matches', stat3: 38.1, stat3_label: 'SR/10',   prev_team: 'CSK',  status: 'pending' },
  { id: 4, name: 'Rohit Sharma',      role: 'Batsman',      country: 'India',       base_price: 2.50,  age: 37, stat1: 5879,stat1_label: 'Runs',    stat2: 243, stat2_label: 'Matches', stat3: 30.3, stat3_label: 'Avg',     prev_team: 'MI',   status: 'pending' },
  { id: 5, name: 'KL Rahul',          role: 'Wicketkeeper', country: 'India',       base_price: 2.00,  age: 32, stat1: 4683,stat1_label: 'Runs',    stat2: 115, stat2_label: 'Matches', stat3: 47.9, stat3_label: 'Avg',     prev_team: 'LSG',  status: 'pending' },
  { id: 6, name: 'Rashid Khan',       role: 'Bowler',       country: 'Afghanistan', base_price: 2.00,  age: 25, stat1: 142, stat1_label: 'Wickets', stat2: 107, stat2_label: 'Matches', stat3: 6.54, stat3_label: 'Economy', prev_team: 'GT',   status: 'pending' },
  { id: 7, name: 'Andre Russell',     role: 'All-rounder',  country: 'West Indies', base_price: 2.00,  age: 36, stat1: 2020,stat1_label: 'Runs',    stat2: 117, stat2_label: 'Matches', stat3: 32.0, stat3_label: 'SR/10',   prev_team: 'KKR',  status: 'pending' },
  { id: 8, name: 'Pat Cummins',       role: 'Bowler',       country: 'Australia',   base_price: 2.00,  age: 31, stat1: 89,  stat1_label: 'Wickets', stat2: 62,  stat2_label: 'Matches', stat3: 8.12, stat3_label: 'Economy', prev_team: 'SRH',  status: 'pending' },
  { id: 9, name: 'Suryakumar Yadav',  role: 'Batsman',      country: 'India',       base_price: 2.00,  age: 33, stat1: 2385,stat1_label: 'Runs',    stat2: 90,  stat2_label: 'Matches', stat3: 52.5, stat3_label: 'Avg',     prev_team: 'MI',   status: 'pending' },
  { id:10, name: 'Hardik Pandya',     role: 'All-rounder',  country: 'India',       base_price: 2.00,  age: 30, stat1: 1476,stat1_label: 'Runs',    stat2: 112, stat2_label: 'Matches', stat3: 29.8, stat3_label: 'SR/10',   prev_team: 'MI',   status: 'pending' },
  { id:11, name: 'Shubman Gill',      role: 'Batsman',      country: 'India',       base_price: 2.00,  age: 25, stat1: 2567,stat1_label: 'Runs',    stat2: 87,  stat2_label: 'Matches', stat3: 38.4, stat3_label: 'Avg',     prev_team: 'GT',   status: 'pending' },
  { id:12, name: 'Sanju Samson',      role: 'Wicketkeeper', country: 'India',       base_price: 2.00,  age: 29, stat1: 3047,stat1_label: 'Runs',    stat2: 104, stat2_label: 'Matches', stat3: 41.0, stat3_label: 'Avg',     prev_team: 'RR',   status: 'pending' },
];

const teams = [
  { id: 1, code: 'MI',   name: 'Mumbai Indians',            purse: 100.00, players_bought: 0, total_spent: 0 },
  { id: 2, code: 'CSK',  name: 'Chennai Super Kings',       purse: 100.00, players_bought: 0, total_spent: 0 },
  { id: 3, code: 'RCB',  name: 'Royal Challengers Bengaluru', purse: 100.00, players_bought: 0, total_spent: 0 },
  { id: 4, code: 'KKR',  name: 'Kolkata Knight Riders',     purse: 100.00, players_bought: 0, total_spent: 0 },
  { id: 5, code: 'DC',   name: 'Delhi Capitals',            purse: 100.00, players_bought: 0, total_spent: 0 },
  { id: 6, code: 'RR',   name: 'Rajasthan Royals',          purse: 100.00, players_bought: 0, total_spent: 0 },
  { id: 7, code: 'PBKS', name: 'Punjab Kings',              purse: 100.00, players_bought: 0, total_spent: 0 },
  { id: 8, code: 'SRH',  name: 'Sunrisers Hyderabad',       purse: 100.00, players_bought: 0, total_spent: 0 },
  { id: 9, code: 'GT',   name: 'Gujarat Titans',            purse: 100.00, players_bought: 0, total_spent: 0 },
  { id:10, code: 'LSG',  name: 'Lucknow Super Giants',      purse: 100.00, players_bought: 0, total_spent: 0 },
];

// Auction state — one active auction round at a time
const auction = {
  status: 'waiting',       // waiting | active | locked | ended
  current_player_id: null,
  current_bid: 0,
  leading_team_code: null,
  leading_team_name: null,
  bid_count: 0,
  timer_seconds: 160,
};

// Bids log
const bids = [];

// Squads — players assigned to teams
const squads = {};   // { teamCode: [ { player_id, player_name, role, price } ] }

module.exports = { players, teams, auction, bids, squads };
