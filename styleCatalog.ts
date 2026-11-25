// Profile customisation catalogue. Built-in items are drawn with CSS (class = item code, see index.css).
// The same codes are seeded into the database by SYMBIOTES_PHASE6_STYLE.sql. Admin-uploaded items (video backdrops, custom titles) live only in the database. 'bd_myvideo' lets a member upload their own video backdrop (video only, no pictures).
export type Slot = 'frame' | 'namefx' | 'backdrop' | 'aura' | 'card' | 'title'
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'ultra'
export type Item = { code: string; slot: Slot; name: string; rarity: Rarity; desc: string; free?: boolean; img?: string; media?: string | null; poster?: string | null; kind?: 'video' | 'image' | null; custom?: boolean }
import type { Fx } from './templates'
export type Equip = { template?: string | null; accent?: string | null; fx?: Fx; frame: string; namefx: string; backdrop: string; aura: string; card: string; title: string; status: string; bg_media?: string | null; bg_poster?: string | null; bg_kind?: string | null }

export const SLOTS: { id: Slot; label: string; icon: string; hint: string }[] = [
  { id: 'frame', label: 'Frame', icon: '◎', hint: 'The ring around your photo' },
  { id: 'namefx', label: 'Name', icon: 'Aa', hint: 'How your name shines' },
  { id: 'backdrop', label: 'Backdrop', icon: '▣', hint: 'Fills your whole profile card (video backdrops move!)' },
  { id: 'aura', label: 'Aura', icon: '✦', hint: 'Floating light around your card' },
  { id: 'card', label: 'Card', icon: '▤', hint: 'The finish of the whole profile, like the Golden Profile' },
  { id: 'title', label: 'Title', icon: '♛', hint: 'A badge of honour under your name' },
]
export const RARITY: Record<Rarity, { label: string; color: string }> = {
  common: { label: 'Normal', color: '#A8A3B8' }, rare: { label: 'Rare', color: '#60A5FA' }, epic: { label: 'Epic', color: '#C084FC' }, legendary: { label: 'Legendary', color: '#FBBF24' }, ultra: { label: 'Ultra', color: '#FF4D8D' },
}
export const DEFAULT_EQUIP: Equip = { frame: 'fr_none', namefx: 'nm_plain', backdrop: 'bd_night', aura: 'au_none', card: 'cd_glass', title: 'tt_none', status: '' }

const I = (slot: Slot, code: string, name: string, rarity: Rarity, desc: string, extra: Partial<Item> = {}): Item => ({ slot, code, name, rarity, desc, ...extra })
export const BUILTIN: Item[] = [
  I('frame', 'fr_none', 'No Frame', 'common', 'Just your photo in a thin ring.', { free: true }),
  // frames: 33 artwork rings (SVG, transparent centre sized for the round profile photo), Normal -> Ultra
  I('frame', 'fr_steel', "Classic Steel", 'common', "A clean brushed-steel ring.", { img: '/styles/fr_steel.svg', free: true }),
  I('frame', 'fr_bronze', "Bronze Ring", 'common', "Warm polished bronze.", { img: '/styles/fr_bronze.svg' }),
  I('frame', 'fr_silver', "Silver Ring", 'common', "Cool mirror silver.", { img: '/styles/fr_silver.svg' }),
  I('frame', 'fr_forest', "Forest Ring", 'common', "Deep green with a soft shine.", { img: '/styles/fr_forest.svg' }),
  I('frame', 'fr_ocean', "Ocean Ring", 'common', "Calm ocean blue.", { img: '/styles/fr_ocean.svg' }),
  I('frame', 'fr_quartz', "Rose Quartz", 'common', "Soft pink pearl ring.", { img: '/styles/fr_quartz.svg' }),
  I('frame', 'fr_amethyst_gems', "Amethyst Gems", 'rare', "Violet ring set with eight gems.", { img: '/styles/fr_amethyst_gems.svg' }),
  I('frame', 'fr_sapphire_twist', "Sapphire Twist", 'rare', "A twisted double ring of sapphire.", { img: '/styles/fr_sapphire_twist.svg' }),
  I('frame', 'fr_emerald_leaf', "Emerald Leaf", 'rare', "Emerald ring wrapped in leaves.", { img: '/styles/fr_emerald_leaf.svg' }),
  I('frame', 'fr_ruby_studs', "Ruby Studs", 'rare', "A silver ring studded with rubies.", { img: '/styles/fr_ruby_studs.svg' }),
  I('frame', 'fr_circuit', "Cyan Circuit", 'rare', "A glowing data ring that keeps spinning.", { img: '/styles/fr_circuit.svg' }),
  I('frame', 'fr_orbit', "Violet Orbit", 'rare', "Tiny stars orbiting your photo.", { img: '/styles/fr_orbit.svg' }),
  I('frame', 'fr_sunset_beads', "Sunset Beads", 'rare', "A necklace of sunset coloured beads.", { img: '/styles/fr_sunset_beads.svg' }),
  I('frame', 'fr_laurel', "Golden Laurel", 'epic', "A gold ring crowned with a laurel wreath.", { img: '/styles/fr_laurel.svg' }),
  I('frame', 'fr_crimson_flame', "Crimson Flame", 'epic', "A ring of living crimson fire.", { img: '/styles/fr_crimson_flame.svg' }),
  I('frame', 'fr_frost_crystal', "Frost Crystal", 'epic', "Sharp ice crystals around a frozen ring.", { img: '/styles/fr_frost_crystal.svg' }),
  I('frame', 'fr_thunder_arc', "Thunder Arc", 'epic', "Electric bolts that flicker around you.", { img: '/styles/fr_thunder_arc.svg' }),
  I('frame', 'fr_void_swirl', "Void Swirl", 'epic', "Violet void energy swirling in orbit.", { img: '/styles/fr_void_swirl.svg' }),
  I('frame', 'fr_sakura', "Sakura Bloom", 'epic', "Pink cherry blossoms in full bloom.", { img: '/styles/fr_sakura.svg' }),
  I('frame', 'fr_neon_pulse', "Neon Pulse", 'epic', "A pulsing neon-green tube light.", { img: '/styles/fr_neon_pulse.svg' }),
  I('frame', 'fr_obsidian_thorns', "Obsidian Thorns", 'epic', "Black obsidian spikes with a violet edge.", { img: '/styles/fr_obsidian_thorns.svg' }),
  I('frame', 'fr_royal_crown', "Royal Crown", 'legendary', "A golden ring under a jeweled crown.", { img: '/styles/fr_royal_crown.svg' }),
  I('frame', 'fr_angel_wings', "Angel Wings", 'legendary', "Pure white wings over a silver ring.", { img: '/styles/fr_angel_wings.svg' }),
  I('frame', 'fr_dragon_horns', "Dragon Horns", 'legendary', "Crimson horns and a spiked ring.", { img: '/styles/fr_dragon_horns.svg' }),
  I('frame', 'fr_phoenix', "Phoenix Rising", 'legendary', "Burning wings and a crown of flame.", { img: '/styles/fr_phoenix.svg' }),
  I('frame', 'fr_celestial', "Celestial Star", 'legendary', "Starlight rays turning around a sapphire ring.", { img: '/styles/fr_celestial.svg' }),
  I('frame', 'fr_dark_wings', "Shadow Wings", 'legendary', "Dark feathered wings humming with violet light.", { img: '/styles/fr_dark_wings.svg' }),
  I('frame', 'fr_aurora_halo', "Aurora Halo", 'legendary', "Northern lights circling like a halo.", { img: '/styles/fr_aurora_halo.svg' }),
  I('frame', 'fr_imperial', "Imperial Majesty", 'ultra', "Golden wings, a seven-point crown and a passing shine.", { img: '/styles/fr_imperial.svg' }),
  I('frame', 'fr_void_emperor', "Void Emperor", 'ultra', "Spiked void armour with two orbiting energy rings.", { img: '/styles/fr_void_emperor.svg' }),
  I('frame', 'fr_galaxy', "Infinity Galaxy", 'ultra', "A spinning galaxy of stars around your photo.", { img: '/styles/fr_galaxy.svg' }),
  I('frame', 'fr_seraph', "Divine Seraph", 'ultra', "A halo, six wings and rays of holy light.", { img: '/styles/fr_seraph.svg' }),
  I('frame', 'fr_eclipse_monarch', "Eclipse Monarch", 'ultra', "A crowned black sun with a blazing corona.", { img: '/styles/fr_eclipse_monarch.svg' }),
  // live backgrounds (animated canvas, drawn in LiveBg.tsx)
  I('backdrop', 'bd_live_eclipse', 'Crimson Eclipse', 'legendary', 'A black sun with a blood-red corona and drifting smoke. (live)', {}),
  I('backdrop', 'bd_live_ember', 'Volcanic Embers', 'epic', 'Glowing embers rising from a molten sky. (live)', {}),
  I('backdrop', 'bd_live_abyssal', 'Abyssal Lightning', 'epic', 'Deep blue storm with sudden lightning. (live)', {}),
  I('backdrop', 'bd_live_dragon', 'Imperial Gold Aura', 'legendary', 'Golden god-rays and floating sparks. (live)', {}),
  I('backdrop', 'bd_live_frost', 'Glacial Blizzard', 'epic', 'Icy light and drifting snow. (live)', {}),
  I('backdrop', 'bd_live_void', 'Shadow Void', 'legendary', 'A singularity pulling violet light into the dark. (live)', {}),
  I('backdrop', 'bd_live_emerald', 'Emerald Spirit', 'epic', 'Green aurora ribbons in the night. (live)', {}),
  I('backdrop', 'bd_live_nebula', 'Cosmic Nebula', 'epic', 'Pink and blue nebula clouds. (live)', {}),
  I('backdrop', 'bd_live_sakura', 'Midnight Sakura', 'rare', 'A pale moon and falling petals. (live)', {}),
  I('backdrop', 'bd_live_bloodmoon', 'Blood Moon Mist', 'epic', 'A red moon behind rolling fog. (live)', {}),
  // names
  I('namefx', 'nm_plain', 'Plain Name', 'common', 'Simple white.', { free: true }),
  I('namefx', 'nm_silver', 'Silver Script', 'common', 'Soft silver gradient.'),
  I('namefx', 'nm_amethyst', 'Amethyst Name', 'rare', 'Violet to rose gradient.'),
  I('namefx', 'nm_frost', 'Frost Name', 'rare', 'Icy white to sky blue.'),
  I('namefx', 'nm_gold', 'Golden Name', 'epic', 'Shimmering liquid gold.'),
  I('namefx', 'nm_ember', 'Ember Name', 'epic', 'Fire orange to red.'),
  I('namefx', 'nm_aurora', 'Aurora Name', 'legendary', 'Colours that slowly drift.'),
  I('namefx', 'nm_royal', 'Royal Glow', 'legendary', 'Gold lettering with a glow.'),
  // backdrops
  I('backdrop', 'bd_night', 'Midnight', 'common', 'Deep violet night.', { free: true }),
  I('backdrop', 'bd_nebula', 'Nebula', 'rare', 'Soft purple and rose clouds.'),
  I('backdrop', 'bd_ember', 'Cinder', 'rare', 'Smouldering red and orange.'),
  I('backdrop', 'bd_gold', 'Gilded', 'epic', 'Rich flowing gold.'),
  I('backdrop', 'bd_aurora', 'Northern Lights', 'epic', 'Slow moving green and violet light.'),
  I('backdrop', 'bd_stars', 'Starfall', 'legendary', 'A twinkling star field.'),
  I('backdrop', 'bd_myvideo', 'My Video Backdrop', 'legendary', 'Upload your own looping video. It fills your whole profile card.'),
  // backdrop bundle (artwork)
  I('backdrop', 'bd_x_void_throne', 'Void Throne', 'legendary', 'A chained throne in violet fire.', { img: '/styles/bd_void_throne' }),
  I('backdrop', 'bd_x_golden_realm', 'Golden Realm', 'legendary', 'A golden palace gate with crowns.', { img: '/styles/bd_golden_realm' }),
  I('backdrop', 'bd_x_blood_moon', 'Blood Moon', 'epic', 'A crimson moon over a dead tree.', { img: '/styles/bd_blood_moon' }),
  I('backdrop', 'bd_x_frost_kingdom', 'Frost Kingdom', 'epic', 'Aurora over a frozen lake.', { img: '/styles/bd_frost_kingdom' }),
  I('backdrop', 'bd_x_mystic_butterfly', 'Mystic Butterfly', 'epic', 'Glowing butterflies at a violet lake.', { img: '/styles/bd_mystic_butterfly' }),
  I('backdrop', 'bd_x_shadow_chain', 'Shadow Chain', 'rare', 'Chains drifting in dark smoke.', { img: '/styles/bd_shadow_chain' }),
  I('backdrop', 'bd_x_phoenix_sky', 'Phoenix Sky', 'legendary', 'A phoenix rising from lava.', { img: '/styles/bd_phoenix_sky' }),
  I('backdrop', 'bd_x_nebula_space', 'Nebula Space', 'epic', 'A galaxy and distant planets.', { img: '/styles/bd_nebula_space' }),
  I('backdrop', 'bd_x_rose_garden', 'Rose Garden', 'epic', 'Red roses under a blood moon.', { img: '/styles/bd_rose_garden' }),
  I('backdrop', 'bd_x_electric_storm', 'Electric Storm', 'rare', 'Lightning striking a dark lake.', { img: '/styles/bd_electric_storm' }),
  // auras
  I('aura', 'au_none', 'No Aura', 'common', 'Clean and quiet.', { free: true }),
  I('aura', 'au_violet', 'Violet Haze', 'rare', 'A gentle pulsing glow.'),
  I('aura', 'au_snow', 'Soft Snow', 'rare', 'Snowflakes drift down.'),
  I('aura', 'au_sparkle', 'Gold Sparkle', 'epic', 'Golden sparks rise and fade.'),
  I('aura', 'au_embers', 'Rising Embers', 'epic', 'Warm embers float upward.'),
  I('aura', 'au_stars', 'Starlight', 'legendary', 'Little stars twinkle all around.'),
  // cards
  I('card', 'cd_glass', 'Glass', 'common', 'The standard frosted glass.', { free: true }),
  I('card', 'cd_obsidian', 'Obsidian', 'rare', 'Black stone with a violet edge.'),
  I('card', 'cd_amethyst', 'Amethyst', 'rare', 'Violet tinted card.'),
  I('card', 'cd_emerald', 'Emerald', 'rare', 'Deep green card.'),
  I('card', 'cd_rose', 'Rose', 'rare', 'Rose pink card.'),
  I('card', 'cd_ice', 'Glacier', 'rare', 'Cold blue card.'),
  I('card', 'cd_gold', 'Golden Profile', 'legendary', 'The whole profile in gold: border, glow and accents.'),
  // titles (the item name is the text shown)
  I('title', 'tt_none', 'No Title', 'common', 'Show no title.', { free: true }),
  I('title', 'tt_rookie', 'Rookie', 'common', 'Everyone starts somewhere.'),
  I('title', 'tt_regular', 'Regular', 'common', 'Always around.'),
  I('title', 'tt_veteran', 'Veteran', 'rare', 'Seen it all.'),
  I('title', 'tt_strategist', 'Strategist', 'rare', 'Plans win games.'),
  I('title', 'tt_recruiter', 'Recruiter', 'rare', 'Brought new blood.'),
  I('title', 'tt_champion', 'Champion', 'epic', 'Tournament level.'),
  I('title', 'tt_mvp', 'Weekly MVP', 'epic', 'Best of the week.'),
  I('title', 'tt_legend', 'Legend', 'legendary', 'Talked about for years.'),
  I('title', 'tt_vip', 'VIP', 'legendary', 'Given by the admins.'),
  I('title', 'tt_founder', 'Founder', 'legendary', 'Only for the founders.'),
]
export const BUILTIN_MAP = new Map(BUILTIN.map(i => [i.code, i]))
export const itemOf = (code: string | null | undefined, extra?: Map<string, Item>): Item | undefined => (code ? BUILTIN_MAP.get(code) ?? extra?.get(code) : undefined)
export const nameOfTitle = (code: string, extra?: Map<string, Item>) => (code === 'tt_none' ? '' : itemOf(code, extra)?.name ?? '')
export const rarityRank = (r: Rarity) => ({ common: 0, rare: 1, epic: 2, legendary: 3, ultra: 4 }[r])
export const normEquip = (e?: Partial<Equip> | null): Equip => ({ ...DEFAULT_EQUIP, ...Object.fromEntries(Object.entries(e ?? {}).filter(([, v]) => v !== null && v !== undefined && v !== '')) } as Equip)
/** Score used to sort "fanciest profile first". */
export const flex = (e: Equip, extra?: Map<string, Item>) => (['frame', 'namefx', 'backdrop', 'aura', 'card', 'title'] as Slot[]).reduce((n, s) => { const it = itemOf(e[s], extra); return n + (it && !it.free ? 1 + rarityRank(it.rarity) : 0) }, 0)

// Quest metrics the database can measure by itself
export const METRICS: { id: string; label: string; unit: string }[] = [
  { id: 'photo', label: 'Profile photo added', unit: '' },
  { id: 'bio', label: 'Bio written (10+ letters)', unit: '' },
  { id: 'game_id', label: 'Game ID and in-game name added', unit: '' },
  { id: 'visit_days', label: 'Different days visited', unit: 'days' },
  { id: 'streak', label: 'Visit streak (days in a row)', unit: 'days' },
  { id: 'weekly_glory', label: 'Glory this week', unit: 'glory' },
  { id: 'best_week', label: 'Best weekly glory ever', unit: 'glory' },
  { id: 'lifetime_glory', label: 'Lifetime glory', unit: 'glory' },
  { id: 'badges', label: 'Achievement badges earned', unit: 'badges' },
  { id: 'polls', label: 'Polls voted in', unit: 'votes' },
  { id: 'messages', label: 'Chat messages sent', unit: 'messages' },
]
export const metricLabel = (id: string) => METRICS.find(m => m.id === id)?.label ?? id
