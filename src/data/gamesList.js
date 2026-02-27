/**
 * WibeStore — barcha o'yinlar ro'yxati (faqat o'yinlar, servislar/ilovalar kiritilmagan).
 * Slug: name dan yasalgan, unique.
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

/** Original/official o'yin rasmlari — faqat public/img/icons/ da yuklangan asl brend rasmlari */
const OVERRIDES = {
  'pubg-mobile': { icon: '⚔️', image: '/img/icons/Pubg-icon.webp', accountCount: 547, color: '#F7B32B' },
  'pubg': { icon: '⚔️', image: '/img/icons/Pubg-icon.webp', accountCount: 547, color: '#F7B32B' },
  'steam': { icon: '🎮', image: '/img/icons/steam.png', accountCount: 1203, color: '#1B2838' },
  'free-fire': { icon: '🔫', image: '/img/icons/free.webp', accountCount: 389, color: '#FF5722' },
  'standoff-2': { icon: '🔫', image: '/img/icons/st.webp', accountCount: 256, color: '#E91E63' },
  'standoff2': { icon: '🔫', image: '/img/icons/st.webp', accountCount: 256, color: '#E91E63' },
  'mobile-legends': { icon: '⚔️', image: '/img/icons/ml.webp', accountCount: 478, color: '#00BCD4' },
  'clash-of-clans': { icon: '🏰', image: '/img/icons/cc.webp', accountCount: 312, color: '#8BC34A' },
  'call-of-duty-mobile': { icon: '🔫', image: '/img/icons/cal.webp', accountCount: 289, color: '#4CAF50' },
  'codm': { icon: '🔫', image: '/img/icons/cal.webp', accountCount: 289, color: '#4CAF50' },
  'roblox': { icon: '🤖', image: '/img/icons/roblox.webp', accountCount: 634, color: '#E2231A' },
};

/** Nom -> id (eski mockData gameId bilan moslik) */
const PREFERRED_IDS = { 'Call of Duty Mobile': 'codm', 'Standoff 2': 'standoff2' };

const EXCLUDE = new Set([
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '0', '2', '7', '8',
  'All Games in Alphabetic Order', 'Legacy of Phrecia',
  'EU, NA Free', 'CH EU RU US', 'EU US', 'Free RU, EU, US',
  'Adobe', 'After Effects', 'Acrobat', 'Canva', 'CapCut', 'ChatGPT', 'Claude', 'Cursor AI', 'Discord', 'ElevenLabs', 'Gemini', 'Grok', 'Midjourney', 'Perplexity', 'Photoshop', 'Runway', 'SoundCloud', 'Spotify', 'Suno', 'Crunchyroll', 'App Store & iTunes', 'GeForce NOW', 'ExitLag', 'NoPing', 'GearUP Booster', 'Catizen', 'Blum', 'Bombie', 'City Holder', 'Threads', 'Twitter (X)', 'Kick', 'MiSide', 'MO.CO', 'PixelTap', 'RCD', 'Reanimal', 'Trovo', 'Veo 3', 'WTFast', 'Hailuo AI', 'Kling AI', 'Leonardo AI', 'FP Club', 'Mobile Games', 'Other Games', 'VR Games', 'Conscript', 'Edens Zero', 'Crimson Desert', 'Hunter x Hunter Nen x Impact', 'Inazuma Eleven: Victory Road', 'Fantasy Life i: The Girl Who Steals Time', 'Forza Horizon 6',
]);

/** O'yin nomlari (faqat o'yinlar) */
const GAME_NAMES = [
  'Abyss of Dungeons', 'Acrobat', 'Active Matter', 'AFK Arena', 'AFK Journey', 'Age of Empires Mobile', 'Age of Mythology: Retold', 'Age of Wonders 4', 'Age of Wushu', 'AI Limit', 'Aion', 'Aion 2', 'Aion Classic', 'Alan Wake 2', 'Albion Online', 'Aliens: Dark Descent', 'Allods Online', 'Amazing RP', 'Amerzone: The Explorer\'s Legacy', 'Amikin Survival', 'Among Us', 'Anchor Panic', 'Aniimo', 'Anno', 'Anomaly Zone', 'Anthem', 'Anvil Empires', 'APB: Reloaded', 'Apex Legends', 'ARC Raiders', 'ArcheAge', 'Archeage War', 'Arena Breakout', 'Arizona RP', 'ARK: Survival Ascended', 'ARK: Survival Evolved', 'Arknights', 'Arknights: Endfield', 'Arma 3', 'Arma Reforger', 'Armored Core VI: Fires of Rubicon', 'Armored Warfare', 'Ashes of Creation', 'Asphalt', 'Assassin\'s Creed', 'Assassin\'s Creed Shadows', 'Assetto Corsa', 'Astellia', 'Astro Bot', 'Atlas Fallen', 'Atomfall', 'Atomic Heart', 'AutoChess', 'Avatar: Frontiers of Pandora', 'Avowed', 'Awaken: Chaos Era', 'Azur Lane',
  'Back 4 Blood', 'Backrooms', 'Baldur\'s Gate 3', 'Batman: Arkham', 'Battle Teams 2', 'Battle.net', 'BattleBit Remastered', 'Battlefield', 'Battlefield 6', 'BeamNG.drive', 'Beat Saber', 'Bellatores', 'Biomutant', 'Bird Game 3', 'BitCraft Online', 'Black Beacon', 'Black Clover M', 'Black Desert', 'Black Desert Mobile', 'Black Myth: Wukong', 'Black Russia', 'Blade & Soul', 'Blade & Soul 2', 'Blade & Soul Heroes', 'Blade & Soul NEO', 'Bleach Rebirth of Souls', 'Bleach: Immortal Soul', 'Bless Unleashed', 'Block Strike', 'Blockman GO', 'Blood And Soul', 'Blood Strike', 'Bloodhunt', 'Blue Lock Project: World Champion', 'Blue Protocol: Star Resonance', 'Bodycam', 'Boom Beach', 'Borderlands', 'Borderlands 4', 'Brawl Stars', 'Brawlhalla', 'Broken Arrow', 'Broken Ranks', 'Bullet Echo',
  'Cabal Online', 'Caliber', 'Call of Dragons', 'Call of Duty', 'Call of Duty Mobile', 'Call of Duty Warzone', 'Call of Duty Warzone Mobile', 'Call of Duty: Black Ops 6', 'Call of Duty: Black Ops 7', 'Call of Duty: Modern Warfare 3 (2023)', 'Candy Crush', 'Car Parking Multiplayer', 'Car Parking Multiplayer 2', 'CarX Drift Racing', 'Castle Clash', 'Chained Together', 'Chaos Zero Nightmare', 'Chess', 'Chicken Gun', 'Chivalry 2', 'Chrono Odyssey', 'Cities: Skylines II', 'Civilization', 'Clair Obscur: Expedition 33', 'Clash of Clans', 'Clash of Kings', 'Clash Royale', 'Code Vein II', 'Command & Conquer: Legions', 'Commandos: Origins', 'Conan Exiles', 'Conqueror\'s Blade', 'Contract Wars', 'CookieRun: Kingdom', 'Core Keeper', 'Corepunk', 'Counter-Strike 2', 'Counter-Strike: GO', 'Critical Ops', 'Critical Strike', 'Cronos: The New Dawn', 'CrossFire', 'Crossout', 'Crosswind', 'Crystal of Atlan', 'Cult of the Lamb', 'Cyberpunk 2077',
  'Dark and Darker', 'Dark December', 'Dark Orbit', 'Dark Souls', 'Dawn of Ages', 'Days Gone', 'DayZ', 'Dead by Daylight', 'Dead Island 2', 'Dead Rising', 'Dead Rising Deluxe Remaster', 'Dead Space', 'Deadlock', 'Death Stranding', 'Deep Rock Galactic', 'Delta Force', 'Deltarune', 'Destiny 2', 'Destiny: Rising', 'Deus Ex', 'Devil May Cry', 'Devil May Cry: Peak of Combat', 'Diablo 2: Resurrected', 'Diablo 3', 'Diablo 4', 'Diablo Immortal', 'Don\'t Starve Together', 'Doom', 'Doomsday', 'Dota 2', 'Drag Racing: Streets', 'Dragon Age', 'Dragon Age: The Veilguard', 'Dragon Ball Legends', 'Dragon Ball: Sparking Zero', 'Dragon Mania Legends', 'Dragon Nest', 'Dragon Raja', 'Dragon\'s Dogma 2', 'Dragonheir: Silent Gods', 'Drakantos', 'Drakensang Online', 'Dreadmyst', 'Drive Beyond Horizons', 'Duet Night Abyss', 'Dune: Awakening', 'Dungeon Stalkers', 'Dungeonborne', 'Dying Light',
  'EA app', 'EA SPORTS FC 24', 'EA SPORTS FC 25', 'EA SPORTS FC 26', 'Eiyuden Chronicle: Hundred Heroes', 'Eldegarde', 'Elden Ring', 'Elden Ring Nightreign', 'Elder Scrolls', 'Elder Scrolls Online (ESO)', 'Elite Dangerous', 'Enigma of Sepia', 'Enlisted', 'Enshrouded', 'Entropia Universe', 'Epic Games', 'Epic Seven', 'Era of Celestials', 'Escape from Duckov', 'Escape from Tarkov', 'Escape from Tarkov Arena', 'Etheria Restart', 'Euro Truck Simulator 2', 'Europa Universalis V', 'EVE Echoes', 'EVE Online', 'Evil Dead: The Game', 'Exoborne', 'Exoprimal', 'Expeditions: A MudRunner Game',
  'F1 25', 'Factorio', 'Fall Guys', 'Fallout 4', 'Fallout 76', 'Far Cry', 'Farlight 84', 'Farming Simulator', 'Fate Trigger', 'FBC: Firebreak', 'FC Mobile', 'Fellowship (2025)', 'FIFA', 'Final Fantasy XIV', 'Final Fantasy XVI', 'Flintlock: The Siege of Dawn', 'Football Manager', 'For Honor', 'Forever Skies', 'Forge of Empires', 'Fortnite', 'Forza Horizon', 'Forza Motorsport (2023)', 'Foundation', 'FragPunk', 'Free Fire', 'Frostborn', 'Frostpunk 2',
  'Game of Thrones: Kingsroad', 'GanjaWars', 'Garry\'s Mod', 'Genshin Impact', 'GeoGuessr', 'Geometry Dash', 'Ghost of Tsushima', 'Ghost of Yotei', 'Ghostrunner 2', 'Girls Frontline 2: Exilium', 'God of War', 'Goddess of Victory: Nikke', 'Gods, Death & Reapers', 'GOG', 'Gothic', 'Gran Saga', 'Gran Turismo', 'Gray Zone Warfare', 'Grounded', 'GTA 5 Online', 'GTA 5 RP, SAMP', 'Guild Wars 2', 'Gwent',
  'Hades 2', 'Hamster Kombat', 'Harry Potter: Magic Awakened', 'Hay Day', 'Hearthstone', 'Heartopia', 'Hearts of Iron IV', 'Hell is Us', 'Helldivers', 'Hero Siege', 'Heroes of Might and Magic', 'Heroes of the Storm', 'Heroes vs Hordes: Survivor', 'High On Life 2', 'Hill Climb Racing 2', 'Hogwarts Legacy', 'Hollow Knight', 'Homeworld 3', 'Honkai Impact 3rd', 'Honkai: Star Rail', 'Honor of Kings', 'Horizon', 'Hunt: Showdown', 'Hustle Castle', 'Hytale',
  'Icarus', 'Identity V', 'IDLE Berserker', 'IDLE Heroes', 'Immortals of Aveum', 'Infinite Magicraid', 'Infinity Nikki', 'Injustice 2 Mobile', 'It Takes Two',
  'Journey of Monarch', 'Jujutsu Kaisen Phantom Parade', 'Jump Space', 'Jurassic World Evolution 3',
  'Kaiju NO. 8 The Game', 'Karos Online', 'Kenshi', 'Killing Floor', 'King Arthur: Legends Rise', 'Kingdom Come: Deliverance',
  'Last Day on Earth: Survival', 'Last Epoch', 'Last Island of Survival', 'Last Oasis', 'League of Legends', 'League of Legends: Wild Rift', 'Left 4 Dead', 'Legend of YMIR', 'Legend: Legacy of the Dragons', 'Lethal Company', 'Liar\'s Bar', 'Lies of P', 'Life is Strange: Double Exposure', 'Life is Strange: Reunion', 'Lineage 2', 'Lineage 2 Aden', 'Lineage 2 Essence', 'Lineage 2 Legacy', 'Lineage 2 Revolution', 'Lineage 2M', 'Little Nightmares', 'Lord of Nazarick', 'LORDNINE', 'Lords Mobile', 'Lords of the Fallen', 'Lords of War and Money', 'Lost Ark', 'Lost Light', 'Lost Records: Bloom & Rage', 'Lost Soul Aside', 'Love and Deepspace',
  'Mad World: Age of Darkness', 'Madden NFL', 'Mafia', 'Magic Chess: Go Go', 'Majestic RP', 'Mandragora: Whispers of the Witch Tree', 'Manor Lords', 'Marathon', 'Marvel Rivals', 'Matreshka RP', 'Mech Arena: Robot Showdown', 'Mecha Break', 'Mecharashi', 'Megabonk', 'Metal Gear', 'Metaphor: ReFantazio', 'Metin2', 'Metro', 'Mewgenics', 'Microsoft Flight Simulator', 'Mimesis', 'MindsEye', 'Minecraft', 'Minecraft Dungeons', 'Minecraft Legends', 'MIR4', 'Mistfall Hunter', 'Mobile Legends', 'Mobile Legends: Adventure', 'Modern Warships', 'Monster Hunter', 'Monster Hunter Wilds', 'Mortal Kombat 1', 'Mortal Kombat 11', 'Mortal Kombat Mobile', 'Mortal Kombat X', 'Mortal Online 2', 'My Singing Monsters', 'Myth of Empires', 'Myths of Moonrise',
  'Naraka: Bladepoint', 'Naruto X Boruto Ultimate Ninja Storm Connections', 'NBA 2K', 'Need for Speed', 'Neverwinter', 'New World', 'NHL', 'Night Crows', 'Nightingale', 'Ninja Gaiden 4', 'Nioh 3', 'No Man\'s Sky', 'No Rest for the Wicked', 'NTE (Neverness to Everness)', 'Nulls Brawl',
  'ODIN: Valhalla Rising', 'Once Human', 'One Piece Bounty Rush', 'One Punch Man: World', 'Oniro', 'Only Up!', 'Outlast', 'Outriders', 'Overwatch 2', 'Oxide: Survival Island',
  'Painkiller', 'Paladins', 'Palia', 'Palworld', 'Party Animals', 'Path of Exile', 'Path of Exile 2', 'Paws', 'Pax Dei', 'Payday 2', 'Payday 3', 'Peak', 'Perfect World', 'Perfect World International', 'Perfect World Mobile', 'Perfect World: Ascend', 'Persona', 'Persona 5: The Phantom X', 'Phasmophobia', 'Pixel Gun 3D', 'Plants vs Zombies 2', 'Point Blank', 'Pokemon GO', 'Pokemon TCG Pocket', 'Polytoria', 'Pragmata', 'Prince of Persia: The Lost Crown', 'Prison Architect 2', 'Project Motor Racing', 'Project Zeta', 'Project Zomboid', 'Project: Gorgon', 'Province RP', 'PUBG', 'PUBG Mobile', 'PUBG: Black Budget', 'PUBG: New State', 'Punishing: Gray Raven',
  'R.E.P.O.', 'R2 Online', 'Ragnarok', 'Ragnarok M: Eternal Love', 'Ragnarok Origin', 'Ragnarok X: Next Generation', 'Raid: Shadow Legends', 'Rappelz', 'Rasalas', 'Ratchet & Clank: Rift Apart', 'RAVEN2', 'Ravendawn', 'RavenQuest', 'Ready or Not', 'Red Dead Redemption', 'Red Dead Redemption 2', 'Rematch', 'Remnant 2', 'Resident Evil', 'Resident Evil 4', 'Resident Evil Requiem', 'Resident Evil Village', 'Revelation', 'Revelation Mobile', 'Reverse: 1999', 'RF Online', 'Riders of Icarus', 'RimWorld', 'Rise of Agon', 'Rise of Kingdoms', 'Rise of the Ronin', 'RoadCraft', 'RoboCop: Rogue City', 'Rocket League', 'Rohan 2', 'ROM', 'Royal Match', 'Royal Quest', 'RuneScape', 'RuneScape: Dragonwilds', 'Rush Royale', 'Rust', 'Rust Mobile', 'RustMe', 'RV There Yet',
  'Saros', 'Satisfactory', 'SCUM', 'Sea of Conquest: Pirate War', 'Sea of Thieves', 'Senua\'s Saga: Hellblade 2', 'Seven Hearts Stories', 'Shin Megami Tensei V: Vengeance', 'Sid Meier\'s Civilization 7', 'Silent Hill 2', 'Silent Hill f', 'Silkroad Online', 'Silver and Blood', 'Silver Palace', 'Sker Ritual', 'Skull and Bones', 'Sky: Children of the Light', 'Skyforge', 'Skyrim Roleplay', 'Smite', 'Smite 2', 'Sniper Elite', 'SnowRunner', 'Solo Leveling: ARISE', 'Sonic Racing: CrossWorlds', 'Sonic X Shadow Generations', 'Sons of the Forest', 'Soul Knight', 'Soulframe', 'Soulmask', 'SoulWorker', 'Soundpad', 'South of Midnight', 'Spectre Divide', 'Spider-Man', 'Split Fiction', 'Splitgate 2', 'Spore', 'Squad', 'Squad Busters', 'Stalcraft', 'Standoff 2', 'Star Citizen', 'Star Savior', 'Star Wars', 'Star Wars: TOR', 'StarCraft 2', 'Stardew Valley', 'Starfield', 'StarRupture', 'Stay Out', 'Steam', 'Stella Sora', 'Stellar Blade', 'Still Wakes the Deep', 'Stormgate', 'Street Fighter 6', 'Strinova', 'Stronghold', 'Stumble Guys', 'Subnautica', 'Suicide Squad: Kill the Justice League', 'Summoners War: Chronicles', 'Summoners War: Sky Arena', 'Super Sus', 'Sword Art Online Fractured Daydream', 'System Shock 2: Remaster',
  'T3 Arena', 'Tabletop Simulator', 'Tainted Grail: The Fall of Avalon', 'Tank Company', 'Tanki Online', 'Tarisland', 'Team Fortress 2', 'Teamfight Tactics', 'Tekken', 'Tempest Rising', 'TERA', 'Terraria', 'Test Drive Unlimited Solar Crown', 'The Alters', 'The Bazaar', 'The Casting of Frank Stone', 'The Crew 2', 'The Crew Motorfest', 'The Dark Pictures', 'The Finals', 'The First Berserker: Khazan', 'The First Descendant', 'The Headliners', 'The Last of Us', 'The Legend of Neverland', 'The Legend of Zelda', 'The Long Dark', 'The Lord of the Rings Online', 'The Midnight Walkers', 'The Outer Worlds', 'The Quinfall', 'The Seven Deadly Sins: Grand Cross', 'The Sims', 'The Witcher 3: Wild Hunt', 'Thief', 'Throne and Liberty', 'Tiles Survive', 'Tiny Bunny', 'Titan Quest', 'Titanfall 2', 'Tom Clancy\'s Rainbow Six', 'Tom Clancy\'s The Division', 'Tom Clancy\'s Ghost Recon', 'Tomb Raider', 'Torchlight: Infinite', 'Total Conflict: Resistance', 'Total War', 'Towa and the Guardians of the Sacred Tree', 'Tower of Fantasy', 'Trove', 'UFC', 'Ultima Online', 'Umamusume: Pretty Derby', 'Uncharted', 'Undawn', 'Undecember', 'Undertale', 'Undisputed', 'Unknown 9: Awakening', 'UNO!', 'Until Dawn', 'Uplay',
  'V Rising', 'Valheim', 'Valorant', 'Valorant Mobile', 'Vampire: The Masquerade - Bloodlines 2', 'Vaultbreakers', 'Vikings: War of Clans', 'Vladik Brutal',
  'Wallpaper Engine', 'War Thunder', 'War Thunder Mobile', 'Warborne Above Ashes', 'Warcraft 3: Reforged', 'Warcraft Rumble', 'Warface', 'Warframe', 'Warhammer', 'Warhammer 40,000: Space Marine 2', 'Warno', 'Warspear Online', 'Watch Dogs', 'Watcher of Realms', 'Wayfinder', 'Where Winds Meet', 'Wild Terra 2: New Lands', 'Wildgate', 'Will To Live Online', 'World of Goo', 'World of Sea Battle', 'World of Tanks', 'World of Tanks Blitz', 'World of Warcraft', 'World of Warcraft Classic + Hardcore + Season of Discovery', 'World of Warcraft Mists of Pandaria Classic', 'World of Warcraft Titan Reforged', 'World of Warplanes', 'World of Warships', 'World of Water', 'World War Z', 'Worms', 'WPlace', 'Wuthering Waves', 'Wuchang: Fallen Feathers',
  'Xbox', 'Yakuza', 'Zenless Zone Zero', 'Zepeto', 'Zooba', '007 First Light', '2XKO', '7 Days to Die', '8 Ball Pool',
];

/** O'yinlarni WibeStore formatida (id, name, icon, image, accountCount, color) */
export function getGamesList() {
  const seen = new Set();
  return GAME_NAMES
    .filter((name) => !EXCLUDE.has(name) && name.length > 1)
    .map((name, index) => {
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
