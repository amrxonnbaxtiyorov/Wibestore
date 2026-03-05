/**
 * WibeStore — faqat to'liq akkaunt sotuviga mos o'yinlar.
 * Sotuvchi xaridorga login/akkauntni to'liq beradigan o'yinlar va platformalar.
 */

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'];

function slug(name) {
  return name
    .toLowerCase()
    .replace(/\s*[|,].*$/, '')
    .replace(/'/g, '')
    .replace(/:/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50) || 'game';
}

/** Original/official o'yin rasmlari */
const OVERRIDES = {
  'pubg-mobile': { icon: '⚔️', image: '/img/Pubg/pubg_logo.webp', accountCount: 547, color: '#F7B32B' },
  'pubg': { icon: '⚔️', image: '/img/icons/Pubg-icon.webp', accountCount: 547, color: '#F7B32B' },
  'steam': {
    icon: '🎮',
    image: '/img/Steam/steam_logo.webp',
    accountCount: 1203,
    color: '#1B2838',
  },
  'free-fire': { icon: '🔫', image: '/img/FireFree/game_logo.jpg', accountCount: 389, color: '#FF5722' },
  'standoff-2': { icon: '🔫', image: '/img/icons/st.webp', accountCount: 256, color: '#E91E63' },
  'standoff2': { icon: '🔫', image: '/img/Stendoff/stend_logo.jpeg', accountCount: 256, color: '#E91E63' },
  'mobile-legends': { icon: '⚔️', image: '/img/Mobile/mobile-legends.jpg', accountCount: 478, color: '#00BCD4' },
  'clash-of-clans': { icon: '🏰', image: '/img/Clash/clash_logo.jpg', accountCount: 312, color: '#8BC34A' },
  'call-of-duty-mobile': { icon: '🔫', image: '/img/icons/cal.webp', accountCount: 289, color: '#4CAF50' },
  'codm': { icon: '🔫', image: '/img/Callof/call_logo.jpg', accountCount: 289, color: '#4CAF50' },
  'roblox': { icon: '🤖', image: '/img/Roblox/roblox_logo.jpg', accountCount: 634, color: '#E2231A' },
};

const PREFERRED_IDS = { 'Call of Duty Mobile': 'codm', 'Standoff 2': 'standoff2' };

/**
 * Faqat to'liq akkaunt sotiladigan o'yinlar va platformalar.
 * (Saytga to'g'ri kelmaydigan, faqat ichki valyuta/boost xizmatlari bo'lgan o'yinlar kiritilmagan.)
 */
const GAME_NAMES = [
  // Mobil — akkaunt sotiladigan
  'PUBG Mobile',
  'Free Fire',
  'Standoff 2',
  'Mobile Legends',
  'Clash of Clans',
  'Call of Duty Mobile',
  'Roblox',
  'Genshin Impact',
  'Clash Royale',
  'Brawl Stars',
  'League of Legends: Wild Rift',
  'PUBG: New State',
  'Minecraft',
  'Honkai: Star Rail',
  'Honkai Impact 3rd',
  'Rise of Kingdoms',
  'Lords Mobile',
  'Diablo Immortal',
  'Tower of Fantasy',
  'Arena Breakout',
  'Raid: Shadow Legends',
  'AFK Arena',
  'Epic Seven',
  'State of Survival',
  'Cookie Run: Kingdom',
  'Among Us',
  'Brawlhalla',
  'Zenless Zone Zero',
  'Wuthering Waves',
  // PC / platforma — akkaunt sotiladigan
  'Steam',
  'Counter-Strike 2',
  'Dota 2',
  'Valorant',
  'League of Legends',
  'Fortnite',
  'Apex Legends',
  'Overwatch 2',
  'Call of Duty: Warzone',
  'Rust',
  'GTA 5 Online',
  'Escape from Tarkov',
  'Tom Clancy\'s Rainbow Six',
  'Rocket League',
  'Lost Ark',
  'New World',
  'Diablo 4',
  'Path of Exile',
  'Destiny 2',
  'Warframe',
  'Final Fantasy XIV',
  'Black Desert',
  'Guild Wars 2',
  'Elder Scrolls Online (ESO)',
  'World of Warcraft',
  'Minecraft Java',
  'Epic Games',
  'Battle.net',
  'Xbox',
];

/** O'yinlarni WibeStore formatida (id, name, icon, image, accountCount, color) */
export function getGamesList() {
  const seen = new Set();
  return GAME_NAMES.map((name, index) => {
    let id = PREFERRED_IDS[name] || slug(name);
    if (seen.has(id)) id = slug(name) + '-' + index;
    seen.add(id);
    const base = {
      id,
      name,
      icon: '🎮',
      image: '/img/icons/placeholder.png',
      accountCount: 0,
      color: COLORS[index % COLORS.length],
    };
    const ov = OVERRIDES[id];
    return ov ? { ...base, ...ov } : base;
  });
}

export default getGamesList;
