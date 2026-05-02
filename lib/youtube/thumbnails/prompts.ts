import type { BuildPromptOptions } from './types'

// ─── NightWire DNA Constants ──────────────────────────────────────────────────

const NW_SUBJECTS = [
  'young Black creative producer',
  'stylish Black producer',
  'Black artist',
  'group of Black creatives',
  'Black beatmaker',
  'young Black creative',
]

const NW_LOCATIONS = [
  'private Harlem loft',
  'Buffalo Route 33 at night',
  'museum hallway after hours',
  'luxury townhouse kitchen',
  'underground parking garage',
  'jazz club after closing time',
  'Buffalo rooftop at sunset',
  'Harlem brownstone poker room',
  'private villa backyard',
  'Miami backseat at night',
  'hidden lounge behind a bookshelf',
  'dimly lit recording space',
  'corner store with neon signs at midnight',
  'gas station after midnight',
  'warehouse after a private event',
  'penthouse with city views',
  'secret art room',
]

const NW_CAMERA_STYLES = [
  'disposable flash camera',
  '35mm film grain',
  'VHS camcorder',
  'old iPhone footage',
  'CCTV security camera',
  'Arri Alexa cinematic',
  'paparazzi zoom lens',
  'magazine editorial flash',
  'macro close-up lens',
  'backseat POV camera',
]

const NW_MOODS = [
  'mysterious and culturally elite',
  'nostalgic and emotionally rich',
  'dangerous calm',
  'strange luxury and hidden power',
  'jazz psychedelic elegance',
  'private culture and rare access',
  'elevated underground energy',
  'weird but tasteful',
  'cinematic loneliness',
  'stylish creative chaos',
]

const NW_DETAILS = [
  'dim gold lighting, champagne glasses, jazz energy',
  'rain on windshield, city lights glowing',
  'security lights glowing, tuxedo mixed with streetwear',
  'burgers on marble counter, gin drinks, laughter',
  'eerie shadows, timestamp overlay',
  'red velvet room, one spotlight',
  'city skyline, warm grain',
  'expensive watches, warm shadows',
  'diamond grillz, sweaty skin texture, neon blur behind',
  'red cups, sunset party energy, premium chaos',
  'smoke curling up in lamplight, leather booth',
  'vinyl records on walls, amber glass in hand',
  'wet asphalt reflections, purple neon overhead',
  'flash photography freezing the moment',
]

// ─── Title → Style Bucket Routing ────────────────────────────────────────────
// 50+ keyword-to-bucket mappings. Case-insensitive substring match.

const NIGHTWIRE_TITLE_ROUTING: Array<[string, string]> = [
  ['velvet smoke',          'Jazz Smoke'],
  ['jazz smoke',            'Jazz Smoke'],
  ['blue haze',             'Jazz Smoke'],
  ['silk pressure',         'Jazz Smoke'],
  ['late night',            'Jazz Smoke'],
  ['closing time',          'Jazz Smoke'],
  ['velvet',                'Jazz Smoke'],
  ['smoke',                 'Jazz Smoke'],
  ['33 west',               'Buffalo Noir'],
  ['route 33',              'Buffalo Noir'],
  ['buffalo',               'Buffalo Noir'],
  ['midnight in buffalo',   'Buffalo Noir'],
  ['snowfall',              'Buffalo Noir'],
  ['frost',                 'Buffalo Noir'],
  ['wet asphalt',           'Buffalo Noir'],
  ['backseat',              'Night Drive'],
  ['night drive',           'Night Drive'],
  ['highway',               'Night Drive'],
  ['city lights',           'Night Drive'],
  ['windshield',            'Night Drive'],
  ['private room',          'Harlem Private Society'],
  ['harlem',                'Harlem Private Society'],
  ['brownstone',            'Harlem Private Society'],
  ['loft rules',            'Harlem Private Society'],
  ['penthouse',             'Harlem Private Society'],
  ['society',               'Harlem Private Society'],
  ['rare vibes',            'Rare Access'],
  ['no flash',              'Rare Access'],
  ['hidden room',           'MindLoft Sessions'],
  ['mindloft',              'MindLoft Sessions'],
  ['secret',                'MindLoft Sessions'],
  ['after hours',           'Private Culture'],
  ['private',               'Private Culture'],
  ['museum talk',           'Museum Nights'],
  ['gallery',               'Museum Nights'],
  ['museum',                'Museum Nights'],
  ['exhibit',               'Museum Nights'],
  ['dangerous taste',       'Street Prestige'],
  ['prestige',              'Street Prestige'],
  ['underground',           'Street Prestige'],
  ['luxury decay',          'Luxury Decay'],
  ['marble',                'Luxury Decay'],
  ['gold',                  'Luxury Decay'],
  ['expensive',             'Luxury Decay'],
  ['creative power',        'Creative Power'],
  ['on set',                'Creative Power'],
  ['director',              'Creative Power'],
  ['genius',                'Creative Power'],
  ['midnight',              'Jazz Smoke'],
  ['dusk',                  'Buffalo Noir'],
  ['neon',                  'Street Prestige'],
]

export function routeTitleToStyleBucket(title: string): string {
  const lower = title.toLowerCase()
  for (const [keyword, bucket] of NIGHTWIRE_TITLE_ROUTING) {
    if (lower.includes(keyword)) return bucket
  }
  return 'MindLoft Sessions'
}

// ─── Master Prompt Formula ────────────────────────────────────────────────────

const BASE_SUFFIX = 'Black culture energy, jazz psychedelic trap atmosphere, cinematic realism, high CTR YouTube thumbnail, sharp focus, premium composition, emotional realism, designed to stop scrolling, mobile optimized --ar 16:9'

export function buildThumbnailPrompt(opts: BuildPromptOptions): string {
  const { producerSlug, title, mood, sceneType, cameraStyle, presetSlug, rawIdea } = opts

  if (producerSlug === 'nightwire') {
    return buildNightWirePrompt({ title, mood, sceneType, cameraStyle, presetSlug, rawIdea })
  }

  if (rawIdea) {
    const camera = cameraStyle ?? 'cinematic'
    return `${rawIdea.trim()}, captured in ${camera}, ${BASE_SUFFIX}`
  }

  const subject = 'music producer'
  const location = sceneType ?? 'studio'
  const camera = cameraStyle ?? 'cinematic'
  const emotion = mood ?? 'creative energy'
  return `${subject} in ${location}, captured in ${camera}, mood of ${emotion}, ${BASE_SUFFIX}`
}

function buildNightWirePrompt(opts: {
  title?: string
  mood?: string
  sceneType?: string
  cameraStyle?: string
  presetSlug?: string
  rawIdea?: string
}): string {
  const { title, mood, sceneType, cameraStyle, presetSlug, rawIdea } = opts

  const styleBucket = title ? routeTitleToStyleBucket(title) : 'MindLoft Sessions'
  const camera = cameraStyle ?? bucketToDefaultCamera(styleBucket, presetSlug)
  const emotion = mood ?? bucketToDefaultMood(styleBucket)

  if (rawIdea) {
    return `${rawIdea.trim()}, captured in ${camera}, mood of ${emotion}, ${BASE_SUFFIX}`
  }

  const subject = NW_SUBJECTS[Math.floor(Math.random() * NW_SUBJECTS.length)]
  const location = sceneType ?? bucketToDefaultLocation(styleBucket)
  const details = bucketToDefaultDetails(styleBucket)

  return `${subject} in ${location}, captured in ${camera}, mood of ${emotion}, with ${details}, ${BASE_SUFFIX}`
}

function bucketToDefaultLocation(bucket: string): string {
  const map: Record<string, string> = {
    'MindLoft Sessions':       'private Harlem loft surrounded by strange elegant guests',
    'Buffalo Noir':            'Buffalo Route 33 at night, rain on windshield, city lights',
    'Jazz Smoke':              'jazz club after closing time, red velvet interior, one spotlight',
    'Night Drive':             'backseat driving through downtown at night',
    'Harlem Private Society':  'Harlem brownstone with warm lighting and stylish guests',
    'Museum Nights':           'museum hallway after hours, security lights glowing',
    'Rare Access':             'hidden private room behind a bookshelf door',
    'Private Culture':         'luxury penthouse lounge, after-hours gathering',
    'Luxury Decay':            'grand townhouse kitchen with marble countertops',
    'Street Prestige':         'underground parking garage, luxury sedan arriving',
    'Creative Power':          'podcast production set, editorial flash photography',
  }
  return map[bucket] ?? NW_LOCATIONS[0]
}

function bucketToDefaultCamera(bucket: string, presetSlug?: string): string {
  if (presetSlug === 'nightwire-buffalo-noir') return 'VHS camcorder'
  if (presetSlug === 'nightwire-jazz-smoke')   return '35mm film grain'
  const map: Record<string, string> = {
    'MindLoft Sessions':      'disposable flash camera',
    'Buffalo Noir':           'VHS camcorder',
    'Jazz Smoke':             '35mm film grain',
    'Night Drive':            'VHS camcorder',
    'Harlem Private Society': 'magazine editorial flash',
    'Museum Nights':          'CCTV security camera',
    'Rare Access':            'old iPhone footage',
    'Luxury Decay':           'Arri Alexa cinematic',
    'Street Prestige':        'CCTV security camera',
    'Creative Power':         'Arri Alexa cinematic',
  }
  return map[bucket] ?? 'disposable flash camera'
}

function bucketToDefaultMood(bucket: string): string {
  const map: Record<string, string> = {
    'MindLoft Sessions':      'chaotic luxury and hidden power',
    'Buffalo Noir':           'dangerous calm and nostalgic Black culture energy',
    'Jazz Smoke':             'emotional rich loneliness and jazz psychedelic',
    'Night Drive':            'cinematic blur and night energy',
    'Harlem Private Society': 'private culture and warm intimacy',
    'Museum Nights':          'weird elite energy and high fashion underground',
    'Rare Access':            'mysterious exclusive access',
    'Luxury Decay':           'strange luxury and elevated underground',
    'Street Prestige':        'mysterious powerful vibe',
    'Creative Power':         'authentic creative authority',
  }
  return map[bucket] ?? NW_MOODS[0]
}

function bucketToDefaultDetails(bucket: string): string {
  const map: Record<string, string> = {
    'MindLoft Sessions':      'dim gold lighting, champagne glasses, jazz energy, chaotic luxury atmosphere',
    'Buffalo Noir':           'city lights glowing, cinematic blur, dangerous calm, nostalgic grain',
    'Jazz Smoke':             'one spotlight, smoke curling, red velvet walls, emotional atmosphere',
    'Night Drive':            'windshield reflections, neon city blur, leather interior',
    'Harlem Private Society': 'warm flash, stylish guests, private cultural energy',
    'Museum Nights':          'tuxedo mixed with streetwear, security lights, flash photo realism',
    'Rare Access':            'hidden door, secret room, selective lighting, rare presence',
    'Luxury Decay':           'marble surfaces, expensive taste, quiet wealth',
    'Street Prestige':        'eerie shadows, timestamp overlay, grainy surveillance aesthetic',
    'Creative Power':         'camera flashes, editorial framing, behind-the-scenes authority',
  }
  return map[bucket] ?? NW_DETAILS[0]
}

// ─── NightWire Ready-To-Use Prompt Library (50 prompts) ──────────────────────

export interface PromptEntry {
  id: string
  title: string
  category: 'private-culture' | 'street-prestige' | 'creative-power' | 'abstract-social' | 'buffalo-noir' | 'jazz-smoke' | 'museum-nights'
  styleBucket: string
  prompt: string
}

export const NIGHTWIRE_PROMPTS: PromptEntry[] = [
  {
    id: 'nw-001',
    title: 'Harlem Loft Party',
    category: 'private-culture',
    styleBucket: 'MindLoft Sessions',
    prompt: 'young Black creative producer in a private Harlem loft surrounded by strange elegant guests, dim gold lighting, champagne glasses, jazz energy, photographed with disposable flash camera, chaotic luxury atmosphere, cinematic realism, premium culture scene, high CTR YouTube thumbnail, mobile optimized --ar 16:9',
  },
  {
    id: 'nw-002',
    title: 'Route 33 Backseat',
    category: 'buffalo-noir',
    styleBucket: 'Buffalo Noir',
    prompt: 'POV from backseat driving down Buffalo Route 33 at night, rain on windshield, city lights glowing, moody VHS camcorder quality, nostalgic Black culture energy, cinematic blur, dangerous calm feeling, stop-scroll thumbnail --ar 16:9',
  },
  {
    id: 'nw-003',
    title: 'Museum After Hours',
    category: 'museum-nights',
    styleBucket: 'Museum Nights',
    prompt: 'Black producer laughing in museum hallway after hours, security lights glowing, tuxedo mixed with streetwear, weird elite energy, flash photo realism, high fashion underground aesthetic --ar 16:9',
  },
  {
    id: 'nw-004',
    title: 'Townhouse Kitchen',
    category: 'private-culture',
    styleBucket: 'Harlem Private Society',
    prompt: 'group of stylish Black friends partying in townhouse kitchen, burgers on marble counter, gin drinks, laughter frozen in flash photography, authentic energy, warm skin tones, premium lifestyle thumbnail --ar 16:9',
  },
  {
    id: 'nw-005',
    title: 'Parking Garage Arrival',
    category: 'street-prestige',
    styleBucket: 'Street Prestige',
    prompt: 'security camera view of underground parking garage, black luxury sedan arriving, eerie shadows, timestamp overlay, mysterious powerful vibe, grainy surveillance realism, dim uneven fluorescent lighting, concrete pillars, motion blur artifacts --ar 16:9',
  },
  {
    id: 'nw-006',
    title: 'Jazz Club Alone',
    category: 'jazz-smoke',
    styleBucket: 'Jazz Smoke',
    prompt: 'young Black creative sitting alone in jazz club after closing time, red velvet room, one spotlight, emotional rich loneliness, cinematic realism, moody shadows, jazz psychedelic trap atmosphere --ar 16:9',
  },
  {
    id: 'nw-007',
    title: 'Buffalo Rooftop Session',
    category: 'buffalo-noir',
    styleBucket: 'Buffalo Noir',
    prompt: 'Buffalo rooftop smoke session during sunset, city skyline behind, stylish Black producer looking thoughtful, candid old phone camera look, warm grain, rare private moment --ar 16:9',
  },
  {
    id: 'nw-008',
    title: 'Brownstone Poker Room',
    category: 'private-culture',
    styleBucket: 'Harlem Private Society',
    prompt: 'Harlem brownstone poker room, weird silent tension, expensive watches visible, flash photo realism, private culture, warm shadows, hidden power atmosphere --ar 16:9',
  },
  {
    id: 'nw-009',
    title: 'Diamond Grillz Close-Up',
    category: 'creative-power',
    styleBucket: 'Street Prestige',
    prompt: 'cinematic extreme close-up of a Black artist mouth singing with diamond grillz, sweaty skin texture, neon street blur behind, Arri Alexa realism, macro lens, high contrast, raw street energy --ar 16:9',
  },
  {
    id: 'nw-010',
    title: 'Villa Beer Pong',
    category: 'abstract-social',
    styleBucket: 'Harlem Private Society',
    prompt: 'private luxury villa backyard beer pong game, Black creatives dressed elite casual, red cups and ping pong balls, sunset party energy, premium chaos, candid flash photo --ar 16:9',
  },
  {
    id: 'nw-011',
    title: 'Hidden Bookshelf Room',
    category: 'private-culture',
    styleBucket: 'MindLoft Sessions',
    prompt: 'young Black creative entering a hidden room behind a bookshelf, dim emerald lighting, jazz records on walls, secret art collection visible, old iPhone photo quality, mysterious exclusive access, cinematic realism --ar 16:9',
  },
  {
    id: 'nw-012',
    title: 'Miami Backseat Night',
    category: 'street-prestige',
    styleBucket: 'Night Drive',
    prompt: 'POV from the back seat of a luxury car looking forward at downtown Miami at night, VHS quality, 80s cinematic, neon reflections on wet streets, city energy, dangerous calm --ar 16:9',
  },
  {
    id: 'nw-013',
    title: 'Podcast Set Flash',
    category: 'creative-power',
    styleBucket: 'Creative Power',
    prompt: 'Black creative producer working on a podcast set, taken from above with flash photography, wearing streetwear, editorial framing, 35mm film using an Arriflex camera, grainy appearance, behind-the-scenes authority --ar 16:9',
  },
  {
    id: 'nw-014',
    title: 'Friends Donut Party',
    category: 'abstract-social',
    styleBucket: 'Harlem Private Society',
    prompt: 'candid fun snapshot of diverse group of Black stylish friends partying indoors at night, holding gin and tonics, laughing, someone holding a donut, casual elegant fashion, eating burgers, intimate flash photography, retro disposable camera aesthetic, Y2K party vibe, urban nightlife --ar 16:9',
  },
  {
    id: 'nw-015',
    title: 'Velvet Smoke Session',
    category: 'jazz-smoke',
    styleBucket: 'Jazz Smoke',
    prompt: 'Black producer in deep red velvet private lounge, smoke rising in golden lamplight, vinyl records visible on wall, 35mm film grain, emotional jazz atmosphere, one amber glass on marble table, cinematic realism --ar 16:9',
  },
  {
    id: 'nw-016',
    title: 'Corner Store Neon',
    category: 'street-prestige',
    styleBucket: 'Street Prestige',
    prompt: 'young Black creative leaning against corner store at midnight, purple and blue neon signs reflecting on wet pavement, old phone photo quality, authentic street energy, casual elite fashion, urban nostalgia --ar 16:9',
  },
  {
    id: 'nw-017',
    title: 'Gas Station After Midnight',
    category: 'street-prestige',
    styleBucket: 'Street Prestige',
    prompt: 'Black creatives at gas station after midnight, fluorescent canopy lights casting cold shadows, luxury car in background, spontaneous candid energy, old iPhone camera quality, grainy authentic, city edge --ar 16:9',
  },
  {
    id: 'nw-018',
    title: 'Private Art Room',
    category: 'private-culture',
    styleBucket: 'MindLoft Sessions',
    prompt: 'secret art room in Harlem loft, Black artist surrounded by rare paintings and sculptures, warm tungsten lighting, editorial magazine flash, private collection visible, hidden creative power, cinematic realism --ar 16:9',
  },
  {
    id: 'nw-019',
    title: 'Snow Buffalo Night',
    category: 'buffalo-noir',
    styleBucket: 'Buffalo Noir',
    prompt: 'Buffalo street at 2am in winter, snow falling, lone Black figure in expensive coat, old city streetlights reflected in snow, VHS camcorder, dangerous calm, nostalgic cinematic isolation --ar 16:9',
  },
  {
    id: 'nw-020',
    title: 'Penthouse Gathering',
    category: 'private-culture',
    styleBucket: 'MindLoft Sessions',
    prompt: 'exclusive Black creative gathering in glass penthouse, city skyline at night below, champagne and conversation, Arri Alexa cinematic quality, warm ambient lighting, elevated underground society --ar 16:9',
  },
  {
    id: 'nw-021',
    title: 'Museum Statue Selfie',
    category: 'museum-nights',
    styleBucket: 'Museum Nights',
    prompt: 'Black artist taking a photo beside ancient museum statue after closing time, guards gone, security lights on low, weird cultural ownership energy, 35mm grain, high contrast, underground elite --ar 16:9',
  },
  {
    id: 'nw-022',
    title: 'Jazz Penthouse Stage',
    category: 'jazz-smoke',
    styleBucket: 'Jazz Smoke',
    prompt: 'Black musician performing in private jazz penthouse, small intimate crowd of stylish guests, deep purple and gold lighting, VHS warmth, cinematic realism, exclusive underground performance --ar 16:9',
  },
  {
    id: 'nw-023',
    title: 'Backstage Flash Moment',
    category: 'creative-power',
    styleBucket: 'Creative Power',
    prompt: 'camera flashes backstage at exclusive Black creative event, candid flash photography freezing motion, stylish faces, editorial quality, premium chaos energy, disposable camera aesthetic --ar 16:9',
  },
  {
    id: 'nw-024',
    title: 'Warehouse After Party',
    category: 'abstract-social',
    styleBucket: 'Street Prestige',
    prompt: 'Black creatives in warehouse after private event ends, industrial space with warm pendant lights, laughing and candid, old iPhone photo quality, authentic post-party energy, cultural underground --ar 16:9',
  },
  {
    id: 'nw-025',
    title: 'VHS Harlem Walk',
    category: 'private-culture',
    styleBucket: 'Harlem Private Society',
    prompt: 'VHS camcorder footage of young Black creative walking through Harlem at golden hour, brownstones in background, old city energy, grainy warm tones, nostalgic cultural power, rare private moment --ar 16:9',
  },
  {
    id: 'nw-026',
    title: 'Luxury Marble Kitchen',
    category: 'private-culture',
    styleBucket: 'Luxury Decay',
    prompt: 'Black producer cooking in marble luxury kitchen at 3am, warm pendant lights, expensive tasteful interior, bottle of champagne on counter, candid old phone photo, strange quiet wealth --ar 16:9',
  },
  {
    id: 'nw-027',
    title: 'Route 33 Snowstorm',
    category: 'buffalo-noir',
    styleBucket: 'Buffalo Noir',
    prompt: 'driving down Buffalo Route 33 during snowstorm, headlights cutting through white, VHS grainy footage, windshield wipers, dangerous calm drive, cinematic Buffalo noir energy --ar 16:9',
  },
  {
    id: 'nw-028',
    title: 'Secret Dinner Table',
    category: 'abstract-social',
    styleBucket: 'MindLoft Sessions',
    prompt: 'strange private dinner table with Black creatives, weird silent tension, expensive food on plates, no one speaking, editorial flash photography, weird luxury ritual energy, cinema of hidden power --ar 16:9',
  },
  {
    id: 'nw-029',
    title: 'Night Club Exit',
    category: 'street-prestige',
    styleBucket: 'Street Prestige',
    prompt: 'young Black producer exiting exclusive nightclub, paparazzi zoom lens shot, purple neon sign above, bodyguard visible, flash photography, candid authentic, street prestige --ar 16:9',
  },
  {
    id: 'nw-030',
    title: 'Gallery After Hours',
    category: 'museum-nights',
    styleBucket: 'Museum Nights',
    prompt: 'small group of Black creatives in art gallery after hours, wine glasses, paintings illuminated by spot lighting, editorial flash, weird cultural elite energy, high fashion casual --ar 16:9',
  },
  {
    id: 'nw-031',
    title: 'Beatmaker Dim Room',
    category: 'creative-power',
    styleBucket: 'Creative Power',
    prompt: 'Black beatmaker in a dim recording room, warm amber light over equipment, focused creative state, editorial magazine photography, authentic creative genius energy, sharp detail --ar 16:9',
  },
  {
    id: 'nw-032',
    title: 'Rooftop Skyline Night',
    category: 'private-culture',
    styleBucket: 'Harlem Private Society',
    prompt: 'two Black creatives on Harlem rooftop at midnight, city skyline behind, cold clear night air, candid old phone photo quality, rare private moment, elevated underground --ar 16:9',
  },
  {
    id: 'nw-033',
    title: 'Elevator Mirror Shot',
    category: 'private-culture',
    styleBucket: 'MindLoft Sessions',
    prompt: 'Black producer in luxury elevator mirror, expensive outfit reflected multiple times, gold and black tones, old iPhone front camera quality, solo private moment of elegance --ar 16:9',
  },
  {
    id: 'nw-034',
    title: 'Hotel Lobby Late Night',
    category: 'street-prestige',
    styleBucket: 'Luxury Decay',
    prompt: 'Black creative in expensive hotel lobby at 4am, marble floors, minimal staff, moody architectural lighting, Arri Alexa cinematic quality, dangerous calm and quiet luxury --ar 16:9',
  },
  {
    id: 'nw-035',
    title: 'Model Fitting Room',
    category: 'creative-power',
    styleBucket: 'Creative Power',
    prompt: 'Black producer directing model fitting room session, racks of clothes visible, editorial flash photography, warm overhead lighting, creative authority energy, behind-the-scenes authenticity --ar 16:9',
  },
  {
    id: 'nw-036',
    title: 'Harlem Fire Escape',
    category: 'buffalo-noir',
    styleBucket: 'Buffalo Noir',
    prompt: 'young Black creative on Harlem fire escape at dusk, city below, introspective gaze, grain of old iPhone photo, warm purple and gold sky, cultural nostalgia, emotional cinematic --ar 16:9',
  },
  {
    id: 'nw-037',
    title: 'Bar Alone',
    category: 'jazz-smoke',
    styleBucket: 'Jazz Smoke',
    prompt: 'Black producer alone at empty jazz bar after last call, wooden bar top, one glass, warm amber overhead light, 35mm grain, emotional solitude, jazz psychedelic trap atmosphere --ar 16:9',
  },
  {
    id: 'nw-038',
    title: 'Fancy Restaurant Corner',
    category: 'private-culture',
    styleBucket: 'Luxury Decay',
    prompt: 'Black creative dining alone in corner of expensive restaurant, candlelight, dark wood panels, menu still in hand, shot on old iPhone, private strange luxury feeling --ar 16:9',
  },
  {
    id: 'nw-039',
    title: 'Night Club Booth',
    category: 'abstract-social',
    styleBucket: 'MindLoft Sessions',
    prompt: 'Black creatives in nightclub VIP booth, purple and gold light, champagne tower, laughing and candid, disposable flash photography, chaotic luxury atmosphere, cultural power --ar 16:9',
  },
  {
    id: 'nw-040',
    title: 'Snow Street Portrait',
    category: 'buffalo-noir',
    styleBucket: 'Buffalo Noir',
    prompt: 'close portrait of young Black creative on empty Buffalo street in winter, snowflakes falling, cold breath visible, old film camera quality, dangerous calm intensity, stylish wool coat --ar 16:9',
  },
  {
    id: 'nw-041',
    title: 'Loft Window View',
    category: 'private-culture',
    styleBucket: 'MindLoft Sessions',
    prompt: 'Black producer looking out floor-to-ceiling loft windows at night city below, glass of wine, one warm lamp, reflections visible in glass, Arri Alexa cinematic, emotional isolation and power --ar 16:9',
  },
  {
    id: 'nw-042',
    title: 'Studio Session Overhead',
    category: 'creative-power',
    styleBucket: 'Creative Power',
    prompt: 'overhead shot of Black producer in dim recording studio, hands on keyboard, equipment glowing, taken from ceiling mounted camera, cinematic surveillance quality, creative power in private moment --ar 16:9',
  },
  {
    id: 'nw-043',
    title: 'Velvet Room Candlelight',
    category: 'jazz-smoke',
    styleBucket: 'Jazz Smoke',
    prompt: 'Black artist in velvet-curtained private room, rows of candles, old books on shelves, jazz instrument in background, editorial magazine photography, mysterious cultural elegance --ar 16:9',
  },
  {
    id: 'nw-044',
    title: 'Street Corner Rain',
    category: 'street-prestige',
    styleBucket: 'Street Prestige',
    prompt: 'Black producer on rain-soaked street corner, puddles reflecting neon signs, paparazzi zoom lens, cinematic depth of field, wet asphalt energy, dangerous calm and cultural prestige --ar 16:9',
  },
  {
    id: 'nw-045',
    title: 'Private Art Auction',
    category: 'museum-nights',
    styleBucket: 'Museum Nights',
    prompt: 'small private art auction with Black creative buyers, expensive art on pedestals, paddles in hand, editorial flash, weird elite ritual, luxury and culture intersecting --ar 16:9',
  },
  {
    id: 'nw-046',
    title: 'Taxi Ride Night',
    category: 'buffalo-noir',
    styleBucket: 'Night Drive',
    prompt: 'Black producer in taxi at night, window down, city blurring behind, candid VHS camcorder quality, late night energy, introspective mood, neon lights smearing --ar 16:9',
  },
  {
    id: 'nw-047',
    title: 'Roof Access Door',
    category: 'private-culture',
    styleBucket: 'Rare Access',
    prompt: 'Black creative pushing open rooftop access door, city view exploding behind, dramatic reveal moment, old iPhone candid shot, rare access energy, warm sunset light --ar 16:9',
  },
  {
    id: 'nw-048',
    title: 'Library Private Room',
    category: 'private-culture',
    styleBucket: 'Harlem Private Society',
    prompt: 'two Black creatives in wood-paneled private library, rare books visible, leather chairs, warm desk lamp, old phone photo, secret society energy, intellectual prestige and warmth --ar 16:9',
  },
  {
    id: 'nw-049',
    title: 'Post-Show Backstage',
    category: 'creative-power',
    styleBucket: 'Creative Power',
    prompt: 'Black producer backstage after a show, glowing with sweat, small crowd gathering, camera flashes, disposable flash camera, chaotic authentic energy, creative triumph moment --ar 16:9',
  },
  {
    id: 'nw-050',
    title: 'Morning After Loft',
    category: 'abstract-social',
    styleBucket: 'MindLoft Sessions',
    prompt: 'morning after private Harlem loft party, sunlight streaming in, bottles and glasses still on tables, lone Black creative with coffee by window, 35mm film grain, quiet after the chaos --ar 16:9',
  },
]

// ─── Raw Reference Prompts (archived from user) ───────────────────────────────

export const NIGHTWIRE_REFERENCE_PROMPTS = [
  'harlem MindLoft company way to weird scenes, hidden powers being practiced in private luxury photo collection --ar 16:9 --seed 1721306848 --profile 2nzbhuv 6z5ijwm --v 7',
  'Playing at the park --ar 4:3 --profile 6z5ijwm',
  'harlem MindLoft company way to weird scenes from my old cell phone, hidden powers being practiced in private luxury photo collection --ar 16:9 --sref 2355472031 --profile tk8i8xm --sv 4 --sw 10 --stylize 500',
  'black People play beer pong on a table in the garden of the American luxury mega villa with red glasses and ping pong balls with beer --ar 16:9 --profile l8q4dq2',
  'POV from the back seat of a car looking forward at downtown Miami night VHS quality 80s cinematic --ar 16:9',
  'underground parking garage, CCTV security camera view from ceiling corner, wide angle, slightly tilted downward, dim uneven fluorescent lighting, one car partially blocking the view in foreground, concrete pillars, dark shadow areas in the back, grainy low quality surveillance footage, motion blur artifacts, compression noise, desaturated colors, timestamp overlay, security camera interface, realistic, imperfect, slightly blurry, eerie atmosphere --profile alx26yp --v 8.1',
  'A photograph of a Black creative producer working on a set, taken from above with flash photography. The producer is wearing streetwear clothing. The background is podcast set. The image was captured on 35mm film using an Arriflex camera, resulting in a grainy appearance. --ar 16:9 --profile 2nzbhuv',
  'a candid, fun snapshot of a diverse group of Black stylish friends partying indoors at night, holding gin and tonics with lime, laughing, playfully posing for the camera, someone holding a donut, casual elegant fashion, eating burgers, intimate flash photography, retro disposable camera aesthetic, imperfect framing, warm skin tones, real smiles, spontaneous energy, slightly chaotic, Y2K party vibe, urban nightlife --ar 16:9 --raw --profile 2nzbhuv --stylize 250',
]
