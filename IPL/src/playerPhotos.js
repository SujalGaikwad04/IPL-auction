// ─── Player Photo System ──────────────────────────────────────────────────────
// Uses the official IPL scores server which serves real player headshots by name.
// URL format: https://scores.iplt20.com/ipl/playerimages/${encodeURIComponent(name)}.png

const IPL_CDN = 'https://scores.iplt20.com/ipl/playerimages';

/**
 * Some players have slightly different name spellings on the IPL CDN.
 * This map overrides the default name → CDN name for those cases.
 */
const NAME_OVERRIDES = {
  // id → exact name used on scores.iplt20.com
  3:  'MS Dhoni',
  6:  'AB de Villiers',
  7:  'Chris Gayle',
  8:  'Jos Buttler',
  9:  'Ben Stokes',
  10: 'Rashid Khan',
  11: 'KL Rahul',
  14: 'David Warner',
  15: 'Glenn Maxwell',
  16: 'Andre Russell',
  17: 'Kane Williamson',
  18: 'Faf du Plessis',
  19: 'Quinton de Kock',
  20: 'Trent Boult',
  22: 'Bhuvneshwar Kumar',
  23: 'Yuzvendra Chahal',
  25: 'Ravindra Jadeja',
  27: 'Ruturaj Gaikwad',
  28: 'Ishan Kishan',
  29: 'Sanju Samson',
  30: 'Nicholas Pooran',
  31: 'Marcus Stoinis',
  32: 'Cameron Green',
  33: 'Devon Conway',
  34: 'Aiden Markram',
  35: 'Heinrich Klaasen',
  36: 'Tim David',
  37: 'Mitchell Starc',
  38: 'Pat Cummins',
  39: 'Kagiso Rabada',
  40: 'Anrich Nortje',
  41: 'Shikhar Dhawan',
  42: 'Yashasvi Jaiswal',
  43: 'Rinku Singh',
  45: 'Rahul Tripathi',
  48: 'Shivam Dube',
  49: 'Arshdeep Singh',
  50: 'T Natarajan',
  51: 'Varun Chakravarthy',
  52: 'Harshal Patel',
  53: 'Deepak Chahar',
  54: 'Umran Malik',
  55: 'Mohammed Siraj',
  56: 'Nitish Rana',
  57: 'Mayank Agarwal',
  58: 'Prithvi Shaw',
  60: 'Shahrukh Khan',
  61: 'Dinesh Karthik',
  64: 'Krunal Pandya',
  65: 'Avesh Khan',
  69: 'Rahul Chahar',
  76: 'Riyan Parag',
  84: 'Piyush Chawla',
  85: 'Amit Mishra',
  86: 'Jayant Yadav',
  87: 'KS Bharat',
  88: 'Manish Pandey',
  89: 'Washington Sundar',
  90: 'Shardul Thakur',
  93: 'Ravi Bishnoi',
  98: 'Rahul Tewatia',
  99: 'Abhishek Sharma',
  105: 'Harpreet Brar',
  108: 'Venkatesh Iyer',
  111: 'David Miller',
  112: 'Steve Smith',
  113: 'Harry Brook',
  114: 'Wanindu Hasaranga',
  115: 'Lockie Ferguson',
  116: 'Daryl Mitchell',
  117: 'Shimron Hetmyer',
  118: 'Alex Hales',
  119: 'Finn Allen',
  120: 'Josh Inglis',
  121: 'Jason Roy',
  122: 'Dawid Malan',
  123: 'Rovman Powell',
  124: 'Kusal Perera',
  125: 'Pathum Nissanka',
  126: 'Dasun Shanaka',
  127: 'James Neesham',
  128: 'Shai Hope',
  129: 'Brandon King',
  130: 'Matthew Wade',
};

/**
 * Get the IPL CDN photo URL for a player.
 * Uses name override if available, otherwise uses player.name directly.
 */
export function getIPLPhotoUrl(player) {
  const name = NAME_OVERRIDES[player.id] || player.name;
  return `${IPL_CDN}/${encodeURIComponent(name)}.png`;
}

/**
 * Returns an ordered array of image sources to try (first to last).
 * The system tries each in sequence and uses the first one that loads.
 */
export function getPlayerPhotoSources(player) {
  return [
    `/players/${player.id}.jpeg`,        // 1. Local uploaded photo (admin-provided)
    `/players/${player.id}.jpg`,         // 2. Local jpg variant
    `/players/${player.id}.png`,         // 3. Local png variant
    getIPLPhotoUrl(player),              // 4. Official IPL CDN (real headshot)
  ];
}

/**
 * Generate a unique gradient for a player's initials avatar.
 * Used as the absolute last fallback.
 */
export function getAvatarStyle(name) {
  const GRADIENTS = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
    'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
    'linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%)',
    'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)',
    'linear-gradient(135deg, #fd7d27 0%, #ffc837 100%)',
  ];
  const hash = (name || '').split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return GRADIENTS[hash % GRADIENTS.length];
}

export function getInitials(name) {
  return (name || '??').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}
