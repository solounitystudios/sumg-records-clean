-- SUMG DNA Records
-- Stores editable artist and producer DNA profiles.

CREATE TABLE IF NOT EXISTS dna_records (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type          TEXT NOT NULL CHECK (entity_type IN ('artist', 'producer')),
  name                 TEXT NOT NULL,
  slug                 TEXT NOT NULL,
  status               TEXT NOT NULL DEFAULT 'active',
  priority_level       TEXT NOT NULL DEFAULT 'high',
  archetype            TEXT,
  brand_positioning    TEXT,
  identity_summary     TEXT,

  -- Simple arrays
  genre_core           TEXT[] NOT NULL DEFAULT '{}',
  genre_secondary      TEXT[] NOT NULL DEFAULT '{}',
  emotional_targets    TEXT[] NOT NULL DEFAULT '{}',
  mix_energy           TEXT[] NOT NULL DEFAULT '{}',
  key_preferences      TEXT[] NOT NULL DEFAULT '{}',
  forbidden_elements   TEXT[] NOT NULL DEFAULT '{}',
  best_producer_matches TEXT[] NOT NULL DEFAULT '{}',
  best_artist_matches  TEXT[] NOT NULL DEFAULT '{}',
  metadata_keywords    TEXT[] NOT NULL DEFAULT '{}',

  -- Rich JSONB blobs
  audience_profile     JSONB,
  tempo_range          JSONB,
  vocal_dna            JSONB,
  lyrical_dna          JSONB,
  arrangement_dna      JSONB,
  instrumentation_rules JSONB,
  fx_language          JSONB,
  suno_metatag_rules   JSONB,
  visual_dna           JSONB,
  cover_art_dna        JSONB,
  video_dna            JSONB,
  rollout_dna          JSONB,
  youtube_packaging_dna JSONB,
  notes                TEXT,

  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS dna_records_type_slug_idx ON dna_records (entity_type, slug);
CREATE INDEX IF NOT EXISTS dna_records_entity_type_idx ON dna_records (entity_type);

ALTER TABLE dna_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_dna_records"
  ON dna_records FOR ALL
  USING (true) WITH CHECK (true);

-- ============================================================
-- SEED: 4 ARTISTS
-- ============================================================

-- 1. ZYSON
INSERT INTO dna_records (
  entity_type, name, slug, status, priority_level, archetype, brand_positioning, identity_summary,
  genre_core, genre_secondary, emotional_targets, mix_energy, key_preferences, forbidden_elements,
  best_producer_matches, best_artist_matches, metadata_keywords,
  audience_profile, tempo_range, vocal_dna, lyrical_dna, arrangement_dna, instrumentation_rules,
  fx_language, suno_metatag_rules, visual_dna, cover_art_dna, video_dna, rollout_dna, notes
) VALUES (
  'artist', 'Zyson', 'zyson', 'active', 'flagship',
  'luxury nocturnal icon',
  'the mysterious high-end male star who lives in the space between glamour, pressure, sex appeal, and emotional distance',
  'Zyson should feel like the artist who already touched success but is still haunted by what it costs. His world is expensive, dark, emotionally controlled, seductive, and cinematic. He is not supposed to feel desperate, overly loud, or unserious. He should feel like the man in the penthouse after the party, not the man begging to get in.',
  ARRAY['luxury trap-soul','cinematic melodic rap','nocturnal R&B-rap fusion','upscale dark hip-hop'],
  ARRAY['ambient trap','dark contemporary R&B','atmospheric pop-rap','moody late-night soul'],
  ARRAY['desire','temptation','emotional distance','lonely success','cold glamour','seductive restraint','danger without chaos','memory after midnight'],
  ARRAY['premium','polished','dark but clean','wide stereo hooks','deep center bass','expensive vocal front placement'],
  ARRAY['minor keys favored','dark suspended harmonies','moody piano or synth beds','haunting chord loops that feel rich, not cheap'],
  ARRAY['clownish rage beats','oversaturated distortion','meme music energy','corny fake luxury lyrics','goofy hyperpop textures','cheap EDM drops','juvenile heartbreak wording','overlong intros without atmosphere'],
  ARRAY['Nightwire','IronLight','select Tidewell crossover cases'],
  ARRAY['Lysandra','Sorin','Yosin'],
  ARRAY['luxury rap','dark melodic rap','late night','seductive','cinematic','upscale','mysterious','penthouse','nocturnal','fashion-forward'],
  '{"primary": ["women who like mysterious, emotionally distant, stylish male artists", "men attracted to luxury, status, and calm power", "nightlife / fashion / mood-driven listeners", "fans of dark melodic rap and upscale R&B-rap hybrids"], "secondary": ["heartbreak listeners", "late-night driving listeners", "cinematic playlist listeners", "people drawn to expensive sadness"]}',
  '{"primary": "72–96 BPM", "secondary": "110–126 BPM if danceable but still luxurious", "notes": "avoid frantic tempos unless concept-specific"}',
  '{"style": ["masculine", "smooth without sounding soft", "melodic but controlled", "emotionally aware without sounding fragile", "confident without shouting"], "preferred": ["layered hook harmonies", "occasional female background harmonies for elevation", "spoken intro sections when cinematic", "subtle adlibs", "breathy doubles on emotional lines", "occasional low-register talk-singing"], "avoid": ["overly nasal delivery", "cartoon rage vocals", "exaggerated yelling", "too much melodic whining", "sloppy stacks that make him sound unsure"]}',
  '{"themes": ["late-night tension", "women and distance", "wealth and pressure", "style as armor", "emotional detachment", "elegance mixed with damage", "private pain behind polished surfaces", "city nights, penthouses, mirrored rooms, black cars, smoke"], "tone": ["controlled", "stylish", "quotable", "not too verbose", "emotionally suggestive rather than oversharing"], "modes": ["self-aware flexing", "dangerous romance", "retrospective heartbreak", "seductive power", "rich solitude"], "avoid": ["corny obvious flex bars", "generic I came from nothing filler", "overused trap clichés", "goofy punchlines", "desperate begging energy", "childish revenge language"]}',
  '{"patterns": [{"name": "core single", "structure": ["[Intro]", "[Spoken Word]", "[Verse 1]", "[Pre-Chorus]", "[Chorus] [Harmonies]", "[Verse 2]", "[Bridge]", "[Chorus]", "[Outro] [Fade Out]"]}, {"name": "cinematic high-end rap", "structure": ["[Fade In]", "[Intro]", "[Verse 1]", "[Hook]", "[Verse 2]", "[Bridge] [Harmonies]", "[Catchy Hook]", "[Break]", "[Verse 3]", "[Chorus repeated twice]", "[Fade Out]"]}, {"name": "seductive mood piece", "structure": ["[Soft Intro]", "[Verse 1]", "[Pre-Chorus]", "[Chorus] [Female Vocal] [Harmonies]", "[Verse 2]", "[Melodic Interlude]", "[Bridge]", "[Chorus]", "[Powerful Outro]"]}]}',
  '{"favored": ["moody piano", "airy synths", "dark bells", "deep clean sub-bass", "elegant drum programming", "restrained strings", "vocal pads", "guitar textures if luxurious, not country-ish"], "drums": ["polished kick", "crisp hats", "selective percussion", "expensive snare/clap choices", "no cheap, thin trap kits"]}',
  '{"good": ["[Echo/Delay]", "[Reverb]", "[Vinyl Record Sounds] very sparingly", "[Rainfall]", "[Nighttime Atmosphere]", "[Urban Street Noise] if cinematic", "[Soft Breeze]", "[Camera Shutter] if fashion-led", "[Traffic Noise] low in the mix"], "notes": "avoid overdoing obvious sound effects"}',
  '{"best_tags": ["[Spoken Word]", "[Harmonies]", "[Catchy Hook]", "[Fade In]", "[Fade Out]", "[Melancholic Atmosphere]", "[Nostalgic Tones]", "[Layered Arrangement]", "[Building Intensity]", "[Echo/Delay]", "[Reverb]", "[Serene Ambience] when more romantic", "[Tense Underscore] when more dangerous"], "notes": "Use [Choir] only when the song aims for grandeur or spiritual scale"}',
  '{"world": ["penthouse glass", "hotel corridors", "rooftops", "rain on windows", "mirrors", "black marble", "city lights", "smoke", "silhouette luxury", "empty clubs after closing"], "colors": ["black", "chrome silver", "midnight blue", "obsidian", "smoke grey", "occasional blood-red accent"], "camera": ["slow push-ins", "shallow focus", "glossy low light", "long lens glamour", "paparazzi-flash moments", "reflective surfaces", "controlled movement"]}',
  '{"style": ["fashion campaign meets album cover", "minimal but expensive", "one dominant image", "dramatic lighting", "confident negative space", "premium typography", "never busy or collage-chaotic unless explicitly artistic"]}',
  '{"modes": ["luxury performance", "cinematic penthouse narrative", "night-drive mood film", "rooftop skyline performance", "mirrored room performance", "femme-fatale tension scene"]}',
  '{"tone": ["mysterious", "confident", "selective", "visual-first", "controlled scarcity"]}',
  'Zyson should feel like the center of gravity for SUMG''s flagship visuals and premium male catalog.'
);

-- 2. LYSANDRA
INSERT INTO dna_records (
  entity_type, name, slug, status, priority_level, archetype, brand_positioning, identity_summary,
  genre_core, genre_secondary, emotional_targets, mix_energy, key_preferences, forbidden_elements,
  best_producer_matches, best_artist_matches, metadata_keywords,
  audience_profile, tempo_range, vocal_dna, lyrical_dna, arrangement_dna, instrumentation_rules,
  fx_language, suno_metatag_rules, visual_dna, cover_art_dna, video_dna, rollout_dna, notes
) VALUES (
  'artist', 'Lysandra', 'lysandra', 'active', 'flagship',
  'feminine villain in moonlight',
  'dark ethereal female force blending seduction, elegance, emotional intelligence, and quiet danger',
  'Lysandra should feel like velvet, moonlight, perfume, revenge, and sadness in one body. She is not bubblegum, not overly sweet, and not messy in a cheap way. She is elegant darkness. Her records should feel like emotional spells, fashion noir, and intimate power.',
  ARRAY['dark ethereal R&B','abstract neo-soul','cinematic alt-R&B','villainous feminine soul'],
  ARRAY['dream-pop R&B','noir soul','ambient trap-soul','fashion soundtrack R&B'],
  ARRAY['allure','controlled heartbreak','divine femininity','elegant revenge','loneliness with beauty','dangerous softness','emotional power','moonlit desire'],
  ARRAY['atmospheric','intimate','dark and silky','slow-burn intensity'],
  ARRAY['minor, suspended, eerie major/minor blends','floating chord voicings','elegant dissonance','unresolved endings'],
  ARRAY['overly bright pop phrasing','cartoon brat energy','too much vocal acrobatics','cheap bad girl clichés','childish bitterness','cheap sexual bars','generic breakup clichés','loud aggression','sloppy boss bitch language'],
  ARRAY['IronLight','Nightwire','select Zyson-adjacent cinematic producers'],
  ARRAY['Zyson','Sorin','Jayno in select crossover moods'],
  ARRAY['dark feminine','ethereal R&B','noir soul','moonlight','velvet','feminine villain','luxury sadness','fashion noir'],
  '{"primary": ["women drawn to dark femininity", "listeners of moody alt-R&B", "fashion-obsessed audiences", "sensual/intellectual listeners"], "secondary": ["men drawn to mystique", "visual art / cinematic audiences", "luxury noir playlist audiences"]}',
  '{"primary": "60–88 BPM", "secondary": "95–112 BPM for rhythmic crossover records"}',
  '{"style": ["silky", "layered", "intimate", "precise", "emotionally aware", "atmospheric"], "preferred": ["whisper layers", "harmony stacks", "ghost doubles", "airy head voice", "restrained belts only when earned", "adlibs that feel haunting, not gospel-heavy unless intentional"], "avoid": ["overly bright pop phrasing", "cartoon brat energy", "too much vocal acrobatics", "cheap bad girl clichés"]}',
  '{"themes": ["female power", "emotional manipulation", "protection through elegance", "yearning with pride", "sensuality with control", "night, silk, glass, perfume, ash, moonlight, velvet"], "avoid": ["childish bitterness", "cheap sexual bars", "generic breakup clichés", "loud aggression", "sloppy boss bitch language"]}',
  '{"patterns": [{"name": "primary", "structure": ["[Soft Intro]", "[Whisper]", "[Verse 1]", "[Pre-Chorus]", "[Chorus] [Harmonies]", "[Verse 2]", "[Melodic Interlude]", "[Emotional Bridge]", "[Catchy Hook]", "[Fade Out]"]}], "best_tags": ["[Whisper]", "[Harmonies]", "[Ghostly Echoes]", "[Spectral Melody]", "[Melancholic Atmosphere]", "[Serene Ambience]", "[Layered Arrangement]", "[Echo/Delay]"]}',
  '{"favored": ["analog-feeling synths", "dark Rhodes", "reverbed piano", "subtle strings", "slow percussion", "deep but soft bass", "atmosphere first, drums second"]}',
  '{"good": ["[Ghostly Echoes]", "[Eerie Whispers]", "[Spectral Melody]", "[Reverb]", "[Soft Breeze]", "[Rainfall]", "[Church Bells] sparingly"]}',
  '{"best_tags": ["[Whisper]", "[Harmonies]", "[Ghostly Echoes]", "[Spectral Melody]", "[Melancholic Atmosphere]", "[Serene Ambience]", "[Layered Arrangement]", "[Echo/Delay]"]}',
  '{"world": ["moonlight", "velvet rooms", "black lace", "silver jewelry", "candlelight", "silhouettes", "mirrored vanity rooms", "smoke and soft diffused light"], "colors": ["black", "pearl white", "silver", "deep plum", "midnight blue", "muted crimson"]}',
  '{"style": ["editorial", "elegant", "slightly surreal", "feminine and cold", "fashion-magazine quality", "no clutter"]}',
  '{"modes": ["slow-motion", "perfume-commercial darkness", "femme-fatale movement", "candlelit narrative", "high-fashion shadow rooms", "moonlit rooftop isolation"]}',
  '{"tone": ["mysterious", "editorial", "visual-first", "slow reveal"]}',
  'Lysandra should be one of SUMG''s strongest visual identities.'
);

-- 3. TURKZ
INSERT INTO dna_records (
  entity_type, name, slug, status, priority_level, archetype, brand_positioning, identity_summary,
  genre_core, genre_secondary, emotional_targets, mix_energy, key_preferences, forbidden_elements,
  best_producer_matches, best_artist_matches, metadata_keywords,
  audience_profile, tempo_range, vocal_dna, lyrical_dna, arrangement_dna, instrumentation_rules,
  fx_language, suno_metatag_rules, visual_dna, cover_art_dna, video_dna, notes
) VALUES (
  'artist', 'Turkz', 'turkz', 'active', 'high',
  'designer gangsta pressure',
  'West Coast-rooted menace with style, motion, expensive grime, and real street confidence',
  'Turkz should feel like danger in designer fabric. He is not comedic street rap. He is pressure, movement, confidence, and street authority with luxury touches. The world is hot pavement, sun glare, smoke, jewelry, and unforgiving energy.',
  ARRAY['West Coast gangsta rap','luxury street rap','hard bounce rap','cinematic menace rap'],
  ARRAY['drill-adjacent street rap','dark club pressure records','aggressive narrative rap'],
  ARRAY['intimidation','confidence','motion','survival','coded violence','stylish danger','respect'],
  ARRAY['hard-hitting','dark','menacing','street-level energy'],
  ARRAY['dark minor keys','heavy bass emphasis','sparse but powerful harmonics'],
  ARRAY['goofy internet drill clichés','over-explaining violence','melodramatic victim language','corny meme bars','singing hooks','soft emotional phrasing','weepy delivery','overcomplicated melody lines'],
  ARRAY['DeadZone310','select hard Nightwire variations','any dark West Coast builder'],
  ARRAY['Marrick','Jayno on crossover street records'],
  ARRAY['gangsta rap','west coast','luxury street','hard bounce','menace','pressure','designer','coded violence'],
  '{"primary": ["street rap fans", "West Coast energy fans", "fashion-leaning rap audiences", "hard beat listeners", "gym / car / speaker music audience"]}',
  '{"primary": "90–108 BPM", "secondary": "130–150 BPM for drill pressure if needed"}',
  '{"style": ["hard male rap", "never sings", "commanding", "direct", "forceful", "clear", "pockets matter more than melody"], "avoid": ["singing hooks", "soft emotional phrasing", "weepy delivery", "overcomplicated melody lines"]}',
  '{"themes": ["coded street movement", "designer flex", "gangsta elegance", "heat, pressure, concrete, speed, danger", "loyalty, positioning, threat, movement"], "avoid": ["goofy internet drill clichés", "over-explaining violence", "melodramatic victim language", "corny meme bars"]}',
  '{"patterns": [{"name": "primary", "structure": ["[Intro]", "[Spoken Word]", "[Verse 1]", "[Hook]", "[Verse 2]", "[Bridge]", "[Hook]", "[Verse 3]", "[Break]", "[Hook]"]}], "best_tags": ["[Spoken Word]", "[Catchy Hook]", "[Building Intensity]", "[Tense Underscore]", "[Sudden Break]", "[Percussion Break]"]}',
  '{"favored": ["hard drums", "sharp claps/snares", "dark synths", "menacing bass", "sparse pianos", "strings for threat", "heavy bounce"]}',
  '{"good": ["[Siren]", "[Urban Street Noise]", "[Traffic Noise]", "[Car Engine]", "[Gunshot] very sparingly", "[Helicopter] if cinematic", "[Distortion] selective"]}',
  '{"best_tags": ["[Spoken Word]", "[Catchy Hook]", "[Building Intensity]", "[Tense Underscore]", "[Sudden Break]", "[Percussion Break]"]}',
  '{"world": ["West Coast glare", "parking lots", "designer streetwear", "lowrider energy", "palm trees in tension", "surveillance angles", "night gas stations", "black SUVs", "gold and concrete"], "colors": ["black", "white", "gunmetal", "gold", "deep red", "asphalt grey"]}',
  '{"style": ["bold", "intimidating", "crisp", "street luxury", "cinematic realism"]}',
  '{"modes": ["documentary realism", "moving convoy scenes", "night parking lot tension", "designer flex in hostile spaces", "surveillance camera cutaways", "sun + pressure + motion"]}',
  'Turkz must never be softened into generic melodic rap.'
);

-- 4. JAYNO
INSERT INTO dna_records (
  entity_type, name, slug, status, priority_level, archetype, brand_positioning, identity_summary,
  genre_core, genre_secondary, emotional_targets, mix_energy, key_preferences, forbidden_elements,
  best_producer_matches, best_artist_matches, metadata_keywords,
  audience_profile, tempo_range, vocal_dna, lyrical_dna, arrangement_dna, instrumentation_rules,
  fx_language, suno_metatag_rules, visual_dna, cover_art_dna, notes
) VALUES (
  'artist', 'Jayno', 'jayno', 'active', 'high',
  'emotionally intelligent future-facing male artist',
  'thoughtful, stylish, emotionally layered artist who can move between introspection, melody, and modern cinematic songwriting',
  'Jayno should feel reflective, stylish, and emotionally aware without sounding weak. He sits between art, confession, and modern polished performance. He can lean into memory, relationship complexity, self-awareness, and atmospheric beauty.',
  ARRAY['melodic alt-rap','introspective trap-soul','cinematic emotional hip-hop','stylish contemporary R&B/rap'],
  ARRAY['ambient pop-rap','modern heartbreak music','reflective late-night records'],
  ARRAY['introspection','longing','regret','beauty in confusion','memory','self-awareness','modern loneliness'],
  ARRAY['atmospheric','melodic','emotionally resonant','polished'],
  ARRAY['minor keys with melodic movement','emotional chord progressions'],
  ARRAY['fake deep writing','too much abstract confusion','corny pseudo-poetry','generic social-media-caption lyrics','overdone falsetto','emo whining','excessive auto-tune haze if it kills clarity'],
  ARRAY['Nightwire','IronLight','selected cinematic producers'],
  ARRAY['Zyson','Lysandra','Yosin'],
  ARRAY['melodic rap','introspective','cinematic','emotional','modern','reflective','late night','stylish'],
  '{"primary": ["emotionally driven listeners", "younger adult audiences", "melodic rap / alt-R&B crossover fans", "visually minded audiences"]}',
  '{"primary": "70–100 BPM", "secondary": "110–122 BPM for crossover records"}',
  '{"style": ["melodic male lead", "emotionally articulate", "polished phrasing", "layered hooks", "can sing more than Turkz, less cold than Zyson"], "avoid": ["overdone falsetto", "emo whining", "excessive auto-tune haze if it kills clarity"]}',
  '{"themes": ["emotional contradiction", "memory", "growth", "heartbreak", "distance", "self-examination", "fame/attention conflict", "feeling ahead of one''s time"], "avoid": ["fake deep writing", "too much abstract confusion", "corny pseudo-poetry", "generic social-media-caption lyrics"]}',
  '{"patterns": [{"name": "primary", "structure": ["[Intro]", "[Verse 1]", "[Pre-Chorus]", "[Chorus]", "[Verse 2]", "[Bridge]", "[Catchy Hook]", "[Outro]"]}], "best_tags": ["[Harmonies]", "[Melancholic Atmosphere]", "[Building Intensity]", "[Echo/Delay]", "[Nostalgic Tones]"]}',
  '{"favored": ["melodic synths", "emotional pianos", "atmospheric guitar", "clean bass", "crisp but not aggressive drums", "mood textures"]}',
  '{"good": ["[Echo/Delay]", "[Reverb]", "[Melancholic Atmosphere]", "[Nostalgic Tones]"]}',
  '{"best_tags": ["[Harmonies]", "[Melancholic Atmosphere]", "[Building Intensity]", "[Echo/Delay]", "[Nostalgic Tones]"]}',
  '{"world": ["city loneliness", "reflective glass", "studio solitude", "minimalist fashion", "memory fragments", "late-night room light", "transit / motion imagery"], "colors": ["black", "grey", "silver", "muted blue", "soft amber"]}',
  '{"style": ["cinematic and intimate", "minimal fashion", "emotionally weighted", "never busy"]}',
  'Jayno should be the emotionally intelligent male lane, not just a watered-down Zyson.'
);

-- ============================================================
-- SEED: 4 PRODUCERS
-- ============================================================

-- 5. NIGHTWIRE
INSERT INTO dna_records (
  entity_type, name, slug, status, priority_level, archetype, brand_positioning, identity_summary,
  genre_core, genre_secondary, emotional_targets, mix_energy, forbidden_elements,
  best_artist_matches, metadata_keywords,
  tempo_range, arrangement_dna, instrumentation_rules, fx_language, suno_metatag_rules,
  visual_dna, youtube_packaging_dna, notes
) VALUES (
  'producer', 'Nightwire', 'nightwire', 'active', 'flagship producer',
  'jazz-funk luxury architect',
  'the producer of expensive groove, soulful sophistication, and musically rich worlds that still hit',
  'Nightwire should sound like elite musicianship translated into modern records. He is groove, richness, taste, and emotional sophistication. His beats should feel alive, human, and premium.',
  ARRAY['jazz-funk fusion','soulful trap','luxury groove','modern live-feeling hip-hop','upscale R&B production'],
  ARRAY['neo-soul hip-hop','live-instrument rap production'],
  ARRAY['richness','sophistication','seduction','reflection','confidence','elegance'],
  ARRAY['pocket-first','warm','soulful','polished','human-feeling'],
  ARRAY['cheap trap loops','cluttered hi-hats','low-musicality presets','soulless EDM synth stacks','corny type beat visuals'],
  ARRAY['Zyson','Sorin','Yosin','selective Jayno'],
  ARRAY['jazz-funk','luxury groove','soulful beats','live hip-hop production','upscale R&B'],
  '{"primary": "76–112 BPM", "notes": "can stretch wider if groove remains"}',
  '{"description": "clear sections, tasteful switch-ups, bridge sophistication, musical outros, layered but not overcrowded", "notes": "hooks should open up elegantly"}',
  '{"drums": ["pocket-first", "warm kicks", "tasteful snares", "crisp hats", "syncopated percussion", "groove over spam"], "bass": ["live-feeling basslines", "melodic low-end", "funk influence", "warm, rich subs"], "harmony": ["jazz chords", "gospel-touched voicings", "soulful extensions", "beautiful tension chords", "expensive musicality"], "melody": ["Rhodes", "piano", "subtle guitar", "synth leads with soul", "occasional horn textures", "vocal chops only if tasteful"]}',
  '{"good": ["[Vinyl Record Sounds]", "[Lo-fi Crackling] sparingly", "[Reverb]", "[Echo/Delay]", "[Snapping Fingers]", "room ambience if classy"]}',
  '{"notes": "tasteful groove and soul-forward tags preferred"}',
  '{"world": ["analog studio glow", "jazz club shadows", "warm wood", "polished instruments", "city-at-night elegance", "deep amber and black"]}',
  '{"description": "premium beatmaker aesthetic", "title_direction": "descriptive mood + genre + artist pairing potential, classy not shouty", "thumbnail": ["elegant", "tasteful", "not generic type beat spam"]}',
  'Nightwire uploads should feel premium — no generic type beat spam.'
);

-- 6. DEADZONE310
INSERT INTO dna_records (
  entity_type, name, slug, status, priority_level, archetype, brand_positioning, identity_summary,
  genre_core, genre_secondary, emotional_targets, mix_energy, forbidden_elements,
  best_artist_matches, metadata_keywords,
  tempo_range, arrangement_dna, instrumentation_rules, fx_language, suno_metatag_rules,
  visual_dna, youtube_packaging_dna, notes
) VALUES (
  'producer', 'DeadZone310', 'deadzone310', 'active', 'flagship producer',
  'West Coast pressure engineer',
  'dark, sharp, high-impact producer built for gangsta pressure, menace, and cinematic street energy',
  'DeadZone310 should feel like sirens in the distance, tires on asphalt, heat in the air, and expensive danger. He should produce records that hit immediately and still feel cinematic.',
  ARRAY['West Coast street rap','dark gangsta beats','menace bounce','pressure music','hard trap/drill crossover when needed'],
  ARRAY['dark drill','street cinema production'],
  ARRAY['pressure','threat','movement','hard focus','survival','adrenaline'],
  ARRAY['hard-hitting','dark','aggressive','cinematic menace'],
  ARRAY['soft dreamy pads dominating','happy melodies','goofy rage synths','childish horror-core'],
  ARRAY['Turkz','Marrick','Jayno for harder cuts'],
  ARRAY['west coast beats','gangsta pressure','street rap production','dark trap','menace beats'],
  '{"primary": "92–105 BPM", "secondary": "135–150 BPM drill/crossover"}',
  '{"description": "immediate impact intros, hard hook drops, sudden breakdowns, bridge for escalation, outro should still feel threatening"}',
  '{"drums": ["hard knock", "sharp snare", "heavy kick", "aggressive percussion", "controlled but dangerous hat movement"], "bass": ["heavy 808", "gliding pressure", "dark sub movement", "low-end intimidation"], "harmony": ["dark pianos", "sinister synths", "sparse strings", "haunting pads", "aggressive tonal centers"], "melody": ["simple but memorable", "menace motifs", "siren-like lead shapes", "low-register keys", "sparse hooks"]}',
  '{"good": ["[Siren]", "[Urban Street Noise]", "[Traffic Noise]", "[Helicopter]", "[Distortion]", "[Gunshot] very sparingly", "[City Noise]"]}',
  '{"notes": "pressure and menace tags — [Tense Underscore], [Building Intensity], [Sudden Break]"}',
  '{"world": ["freeway lights", "helicopters", "black trucks", "pressure glare", "concrete", "red warning tones", "night cameras", "urban heat"]}',
  '{"description": "dark premium street visuals", "thumbnail": ["no cartoon graphics", "no cheesy gangster fonts", "high-pressure look", "strong black/red/white contrast"]}',
  'DeadZone310 is the go-to builder for Turkz and any hard West Coast pressure record.'
);

-- 7. IRONLIGHT
INSERT INTO dna_records (
  entity_type, name, slug, status, priority_level, archetype, brand_positioning, identity_summary,
  genre_core, genre_secondary, emotional_targets, mix_energy, forbidden_elements,
  best_artist_matches, metadata_keywords,
  tempo_range, arrangement_dna, instrumentation_rules, fx_language, suno_metatag_rules,
  visual_dna, youtube_packaging_dna, notes
) VALUES (
  'producer', 'IronLight', 'ironlight', 'active', 'high',
  'noir-cinematic emotional architect',
  'dramatic, textural, darkly elegant producer for records that feel like film scenes',
  'IronLight should feel like old churches, abandoned hotels, forests in fog, city rain, and emotional danger. This producer is for cinematic darkness, not random aggression.',
  ARRAY['noir soul','cinematic trap','dramatic alt-R&B','dark orchestral hip-hop','folklore-noir mood production'],
  ARRAY['gothic soul','cinematic dark ambient','emotional orchestral rap'],
  ARRAY['grandeur','sorrow','elegance','danger','longing','haunted beauty'],
  ARRAY['cinematic','spacious','emotionally weighted','dark and dramatic'],
  ARRAY['bright commercial pop','silly trap brass','clownish energy','generic lo-fi beats marketed as cinematic'],
  ARRAY['Lysandra','Zyson','Sorin','Jayno'],
  ARRAY['cinematic beats','noir soul','dark R&B production','orchestral hip-hop','emotional trap'],
  '{"primary": "60–92 BPM", "notes": "occasional larger cinematic builds above that"}',
  '{"description": "cinematic intro, slow reveal, bridge-heavy, swelling climaxes, tension breaks, emotionally loaded outros"}',
  '{"drums": ["restrained", "spacious", "cinematic impact", "low percussion clutter", "dramatic hits instead of busy chatter"], "bass": ["deep and emotional", "less bounce, more gravity", "cinematic sustain"], "harmony": ["strings", "pianos", "church chords", "eerie pads", "dramatic minor harmonies", "emotional orchestral tension"], "melody": ["haunting motifs", "bell tones", "sorrowful keys", "distant choir ideas", "textural movement over catchy loops"]}',
  '{"good": ["[Church Bells]", "[Thunder]", "[Rainfall]", "[Ghostly Echoes]", "[Spectral Melody]", "[Reverb]", "[Wind Howling]"]}',
  '{"notes": "cinematic and emotional tags — [Spectral Melody], [Ghostly Echoes], [Building Intensity], [Choir] when appropriate"}',
  '{"world": ["gothic spaces", "rain windows", "cathedral echoes", "black forest glamour", "ruined elegance", "candlelight and steel"]}',
  '{"description": "cinematic fine-art aesthetic", "thumbnail": ["cinematic stills", "dark fine-art thumbnails", "dramatic typography", "no clutter"]}',
  'IronLight is the primary producer for Lysandra and high-concept cinematic records across the roster.'
);

-- 8. TIDEWELL
INSERT INTO dna_records (
  entity_type, name, slug, status, priority_level, archetype, brand_positioning, identity_summary,
  genre_core, genre_secondary, emotional_targets, mix_energy, forbidden_elements,
  best_artist_matches, metadata_keywords,
  tempo_range, arrangement_dna, instrumentation_rules, fx_language, suno_metatag_rules,
  visual_dna, youtube_packaging_dna, notes
) VALUES (
  'producer', 'Tidewell', 'tidewell', 'active', 'high',
  'warm rhythmic world-builder',
  'fluid, rhythmic, globally aware producer with motion, warmth, and emotionally uplifting groove',
  'Tidewell should feel like movement, ocean air, warmth, sunlight over emotion, and rhythmic confidence. The production should feel alive, human, and slightly international without becoming generic worldbeat.',
  ARRAY['Afro-influenced contemporary production','rhythmic soul','melodic global pop-rap production','warm groove records'],
  ARRAY['rhythmic alt-pop','contemporary Afrobeats crossover','global soul fusion'],
  ARRAY['motion','warmth','connection','sensual uplift','emotional confidence','freedom'],
  ARRAY['warm','rhythmic','body-forward','bright but tasteful'],
  ARRAY['cheap afro-pop stereotypes','tourist-board visuals','too many percussion layers with no focus','generic dance-pop cheese'],
  ARRAY['Yosin','Zyson for crossover energy','Jayno in brighter mode'],
  ARRAY['Afro-influenced beats','rhythmic soul','global pop production','warm groove','melodic world beats'],
  '{"primary": "92–124 BPM"}',
  '{"description": "energetic intros, rhythm-first hooks, melodic bridges, danceable breakdowns, strong chorus payoff"}',
  '{"drums": ["rolling percussion", "rhythmic movement", "body-forward groove", "danceable but tasteful", "layered hand percussion"], "bass": ["warm bounce", "groove-led subs", "melodic low-end", "movement over menace"], "harmony": ["bright-minor blends", "emotional but warm chords", "rhythmic harmonic movement", "uplifting tension"], "melody": ["guitar lines", "plucked textures", "chantable motifs", "rhythmic synths", "bright piano accents"]}',
  '{"good": ["[Waves]", "[Ocean Waves]", "[Soft Breeze]", "[Birdsong]", "[Daytime Atmosphere]", "[Natural Ambience]", "[Flowing Water]"]}',
  '{"notes": "warmth, motion, and rhythmic energy tags — [Building Intensity], [Percussion Break], [Harmonies]"}',
  '{"world": ["water reflections", "sunlight on concrete", "moving city", "ocean edge", "gold-hour warmth", "elegant motion", "modern minimal color"]}',
  '{"description": "cleaner and brighter than DeadZone/IronLight", "thumbnail": ["premium natural-light visuals", "coastal/skyline/rhythm imagery", "not tropical cliché"]}',
  'Tidewell brings warmth and global rhythm to SUMG — key differentiator from the darker producers on the roster.'
);
