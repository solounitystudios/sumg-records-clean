-- Migration: DNA Automation Engine
-- Created: 2026-04-28
-- Adds: producer_variations, dna_packs
-- Seeds: GRVND DNA record, 35 producer variations (7 per producer)

-- ─── producer_variations ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS producer_variations (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_slug         TEXT        NOT NULL,
  variation_name        TEXT        NOT NULL,
  visual_world          TEXT,
  colors                TEXT[]      NOT NULL DEFAULT '{}',
  image_prompt          TEXT,
  yt_title_formula      TEXT,
  description_style     TEXT,
  tag_bank              TEXT[]      NOT NULL DEFAULT '{}',
  best_artist_pairings  TEXT[]      NOT NULL DEFAULT '{}',
  sound_direction       TEXT,
  forbidden_elements    TEXT[]      NOT NULL DEFAULT '{}',
  sort_order            INTEGER     NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS prod_variations_slug_idx ON producer_variations (producer_slug);

ALTER TABLE producer_variations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'producer_variations' AND policyname = 'admin_all_variations'
  ) THEN
    CREATE POLICY "admin_all_variations"
      ON producer_variations FOR ALL
      USING (((auth.jwt() -> 'app_metadata') ->> 'role') = ANY (ARRAY['admin','editor','media_manager','release_manager']))
      WITH CHECK (((auth.jwt() -> 'app_metadata') ->> 'role') = ANY (ARRAY['admin','editor','media_manager','release_manager']));
  END IF;
END $$;

-- ─── dna_packs ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dna_packs (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title                    TEXT        NOT NULL,
  status                   TEXT        NOT NULL DEFAULT 'draft'
                                       CHECK (status IN ('draft', 'approved', 'assigned_to_queue')),
  artist_dna_id            UUID        REFERENCES dna_records(id) ON DELETE SET NULL,
  producer_dna_id          UUID        REFERENCES dna_records(id) ON DELETE SET NULL,
  producer_variation_id    UUID        REFERENCES producer_variations(id) ON DELETE SET NULL,
  asset_id                 TEXT,
  yt_job_id                UUID,
  platform                 TEXT        NOT NULL DEFAULT 'youtube_beat',
  upload_type              TEXT,
  target_audience          TEXT,
  song_mood                TEXT,
  song_prompt              TEXT,
  suno_metatags            TEXT,
  title_ideas              TEXT,
  thumbnail_prompt         TEXT,
  yt_description           TEXT,
  hashtags                 TEXT[]      NOT NULL DEFAULT '{}',
  visual_direction         TEXT,
  rollout_notes            TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS dna_packs_status_idx    ON dna_packs (status);
CREATE INDEX IF NOT EXISTS dna_packs_artist_idx    ON dna_packs (artist_dna_id);
CREATE INDEX IF NOT EXISTS dna_packs_producer_idx  ON dna_packs (producer_dna_id);

ALTER TABLE dna_packs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'dna_packs' AND policyname = 'admin_all_dna_packs'
  ) THEN
    CREATE POLICY "admin_all_dna_packs"
      ON dna_packs FOR ALL
      USING (((auth.jwt() -> 'app_metadata') ->> 'role') = ANY (ARRAY['admin','editor','media_manager','release_manager']))
      WITH CHECK (((auth.jwt() -> 'app_metadata') ->> 'role') = ANY (ARRAY['admin','editor','media_manager','release_manager']));
  END IF;
END $$;

-- ─── SEED: GRVND (5th producer DNA) ──────────────────────────────────────────

INSERT INTO dna_records (
  entity_type, name, slug, status, priority_level, archetype, brand_positioning, identity_summary,
  genre_core, genre_secondary, emotional_targets, mix_energy, forbidden_elements,
  best_artist_matches, metadata_keywords,
  tempo_range, arrangement_dna, instrumentation_rules, fx_language, suno_metatag_rules,
  visual_dna, youtube_packaging_dna, notes
) VALUES (
  'producer', 'GRVND', 'grvnd', 'active', 'high',
  'digital pressure architect',
  'bass-heavy synthesizer engineer for futuristic dark trap and digital menace records that feel machine-cold and emotionally sharp',
  'GRVND sits at the intersection of raw mechanical pressure and emotional digital darkness. His beats should feel like operating systems running hot, neon cutting through smoke, and 808s that hit like seismic events. Not retro, not nostalgic — forward, cold, and precise.',
  ARRAY['dark digital trap','bass-forward synthesizer rap','futuristic menace production','cyberpunk trap'],
  ARRAY['industrial trap','digital noir production','synthetic soul'],
  ARRAY['adrenaline','cold power','digital tension','machine focus','pressure','forward motion'],
  ARRAY['bass-forward','cold','precise','heavy','forward-facing'],
  ARRAY['retro lo-fi aesthetics','warm organic softness','jazzy chord meandering','nostalgic throwback sounds','cartoon rage synths'],
  ARRAY['Turkz','Jayno','Zyson in digital crossover mode'],
  ARRAY['digital trap','futuristic beats','bass heavy','dark synthesizer','cyberpunk rap','mechanical pressure'],
  '{"primary": "90–140 BPM", "secondary": "140–160 BPM for maximum pressure mode", "notes": "sub-bass lock is more important than exact BPM"}',
  '{"description": "hard digital drop intros, machine-rhythm hooks, sudden silence breaks, escalating pressure builds, cold minimal outros", "notes": "intros should hit within 4 bars"}',
  '{"drums": ["machine-precise kick", "sharp digital snare", "cold hat rolls", "aggressive 808 patterning", "no warmth in drum programming"], "bass": ["massive 808 slides", "detuned sub pressure", "bass as lead instrument", "low-end violence"], "harmony": ["dark detuned synths", "cold minor chord stabs", "eerie pad textures", "digital dissonance", "sparse but heavy harmonic hits"], "melody": ["minimal sinister motifs", "digital lead shapes", "sparse atmospheric tones", "single-note tension lines"]}',
  '{"good": ["[Distortion]", "[Glitch]", "[Reverb]", "[Building Intensity]", "[Sudden Break]", "[Tense Underscore]"]}',
  '{"notes": "digital pressure tags — [Building Intensity], [Tense Underscore], [Sudden Break], [Distortion], [Glitch]"}',
  '{"world": ["neon grids", "digital darkness", "server rooms", "black glass surfaces", "rain on pavement under streetlights", "surveillance red", "electric blue against black"], "colors": ["neon blue", "black", "electric red", "dark purple", "chrome"]}',
  '{"description": "futuristic digital aesthetic — no generic type beat imagery", "thumbnail": ["high contrast digital art", "neon on black", "geometric precision", "no clutter", "machine energy"]}',
  'GRVND fills the futuristic digital pressure lane that no other SUMG producer occupies. Primary for Turkz hard-tech records and Jayno digital emotional crossovers.'
) ON CONFLICT DO NOTHING;

-- ─── SEED: NIGHTWIRE — 7 Variations ──────────────────────────────────────────

INSERT INTO producer_variations
  (producer_slug, variation_name, visual_world, colors, image_prompt, yt_title_formula,
   description_style, tag_bank, best_artist_pairings, sound_direction, forbidden_elements, sort_order)
VALUES

('nightwire', 'Late Night Jazz',
  'analog lounge, amber warmth, polished wood surfaces, jazz club shadows, smoke diffusing soft light',
  ARRAY['amber', 'black', 'warm gold'],
  'Dimly lit jazz lounge, amber light catching piano keys, rich wood textures, deep shadows, smoke curling through warm light, analog warmth and sophistication',
  '{TRACK} (Jazz Soul Beat) — {ARTIST} x Nightwire',
  'Refined and intimate — describe the musical world and emotional gravity. No hype language. Warmth and taste.',
  ARRAY['jazz soul beats', 'luxury groove', 'smooth hip hop instrumental', 'late night jazz', 'soulful beats', 'nightwire type beat'],
  ARRAY['Zyson', 'Sorin'],
  'Jazzy piano-forward groove with warm basslines, syncopated percussion, subtle horn textures, rich harmonic movement, analog feel',
  ARRAY['harsh digital sounds', 'cheap trap patterns', 'aggressive distortion'],
  1),

('nightwire', 'Soul Groove',
  'warm wood recording studio, sunlight through venetian blinds, vintage gear, organic textures, brown and gold world',
  ARRAY['warm brown', 'gold', 'cream', 'deep orange'],
  'Vintage recording studio bathed in warm afternoon light, venetian blind shadow patterns, classic gear on shelves, organic wood surfaces, soul and warmth',
  '{TRACK} (Soul Groove Beat) — Nightwire',
  'Warm and human — talk about the groove, the feeling, the organic soul energy. Write like the beat breathes.',
  ARRAY['soul groove', 'funky hip hop', 'organic beats', 'live feeling', 'neo soul instrumental', 'groove music'],
  ARRAY['Zyson', 'Yosin'],
  'Rhodes-forward groove with live-feeling percussion, deep warm bass, syncopated rhythmic movement, soulful chord progressions',
  ARRAY['stiff quantized programming', 'cold digital sounds', 'harsh high-end'],
  2),

('nightwire', 'Luxury Drive',
  'highway at night, chrome reflections, city lights streaking, high-end car interior, dark glass and polished metal',
  ARRAY['chrome', 'black', 'midnight blue', 'silver'],
  'Inside a luxury vehicle at night, city lights blurring past chrome surfaces, dashboard glow, architectural highway lights, premium dark interior',
  '{TRACK} (Luxury Type Beat) — {ARTIST} x Nightwire',
  'Premium and cinematic — evoke speed, elegance, nocturnal movement. Short and confident.',
  ARRAY['luxury beats', 'cinematic hip hop', 'nightwire type beat', 'premium groove', 'dark luxury rap instrumental'],
  ARRAY['Zyson', 'Jayno'],
  'Polished groove with clean mix, deep sub movement, wide stereo hooks, elegant chord changes, cinematic transitions',
  ARRAY['rough unfinished sounds', 'cheap mixdowns', 'overcrowded arrangements'],
  3),

('nightwire', 'Deep Chamber',
  'velvet-draped performance space, candles on dark stone, orchestral shadows, intimate grand piano, old world elegance',
  ARRAY['deep burgundy', 'black', 'candlelight gold', 'dark green'],
  'Grand piano in a candlelit stone chamber, velvet drapes, orchestral shadows, warm dramatic lighting, old world atmosphere with modern tension',
  '{TRACK} (Dark Soul Beat) — Nightwire x {ARTIST}',
  'Dramatic and introspective — frame the emotional weight and musical sophistication. Classical references welcome.',
  ARRAY['dark soul beats', 'orchestral hip hop', 'cinematic soul', 'dramatic instrumental', 'piano beats', 'dark groove'],
  ARRAY['Sorin', 'Lysandra'],
  'Orchestral soul with dramatic piano, deep bass, restrained percussion, string textures, cinematic emotional builds',
  ARRAY['cheap synth pads', 'bright pop sounds', 'thin basslines'],
  4),

('nightwire', 'Sunrise Session',
  'morning studio, golden hour light flooding wood floors, coffee steam, musicians warming up, golden warmth and hope',
  ARRAY['warm gold', 'cream', 'light amber', 'soft orange'],
  'Studio in early morning light, golden sun rays across hardwood floors, instruments at rest, steam rising from a cup, soft warmth and possibility',
  '{TRACK} (Morning Soul) — Nightwire',
  'Uplifting and warm — describe the morning feeling, the hope in the groove. Bright but tasteful.',
  ARRAY['morning soul', 'uplifting hip hop', 'positive groove', 'daytime instrumental', 'feel good beats', 'warm soul'],
  ARRAY['Yosin', 'Jayno'],
  'Bright-minor soul groove with optimistic chord movement, light percussion, melodic bass, warm synth or guitar textures',
  ARRAY['dark minor heaviness', 'menacing tones', 'cold digital production'],
  5),

('nightwire', 'Glass City',
  'modern urban nightscape, glass towers reflecting light, clean lines, contemporary luxury architecture, city sophistication',
  ARRAY['slate grey', 'electric blue', 'black', 'silver white'],
  'Modern glass skyscraper at night, city lights multiplied in reflections, clean architectural lines, contemporary urban sophistication',
  '{TRACK} (Urban Soul) — {ARTIST} x Nightwire',
  'Modern and sharp — speak to the urban sophistication, the contemporary groove. Clean and direct.',
  ARRAY['urban soul', 'modern hip hop instrumental', 'city groove', 'contemporary beats', 'nightwire 2025'],
  ARRAY['Jayno', 'Zyson'],
  'Modern clean groove with contemporary chord movement, polished drums, melodic synth textures over organic bass',
  ARRAY['retro vintage feel', 'lo-fi aesthetics', 'nostalgic tones'],
  6),

('nightwire', 'Noir Kitchen',
  'late night restaurant kitchen, steam and shadow, stainless steel catching light, private conversations, dark intimate world',
  ARRAY['black', 'steel grey', 'amber', 'deep red'],
  'After-hours restaurant kitchen, steam rising through shadows, stainless steel surfaces catching light, intimate and slightly dangerous atmosphere',
  '{TRACK} (Noir Soul Beat) — Nightwire x {ARTIST}',
  'Mysterious and intimate — describe the hidden world, the emotional tension beneath the surface. Dark and tasteful.',
  ARRAY['noir soul', 'dark groove beats', 'mysterious instrumental', 'jazz noir', 'dark hip hop', 'cinematic groove'],
  ARRAY['Lysandra', 'Zyson'],
  'Sparse jazz-influenced groove with dark chord voicings, intimate bass, minimal percussion, atmospheric piano or Rhodes',
  ARRAY['bright or happy melodies', 'upbeat tempo', 'generic type beat energy'],
  7);

-- ─── SEED: DEADZONE310 — 7 Variations ────────────────────────────────────────

INSERT INTO producer_variations
  (producer_slug, variation_name, visual_world, colors, image_prompt, yt_title_formula,
   description_style, tag_bank, best_artist_pairings, sound_direction, forbidden_elements, sort_order)
VALUES

('deadzone310', 'Gang Motion',
  'convoy moving at night, headlights cutting darkness, organized movement, collective threat in motion',
  ARRAY['black', 'white headlights', 'dark asphalt', 'deep red'],
  'Multiple black vehicles in convoy at night, headlights cutting through dark highway, organized menace in motion, cinematic surveillance angle',
  '{TRACK} (West Coast Pressure) — {ARTIST} x DeadZone310',
  'Hard and direct — movement, motion, organized pressure. No softness. Commands respect immediately.',
  ARRAY['west coast rap beat', 'gang motion beat', 'pressure instrumental', 'gangsta rap type beat', 'convoy beat', 'deadzone310'],
  ARRAY['Turkz', 'Marrick'],
  'Hard bounce with heavy kick, aggressive 808 movement, dark minimal melody, pressure-building arrangement, no wasted space',
  ARRAY['soft melodies', 'singing hooks', 'bright sounds', 'happy chord progressions'],
  1),

('deadzone310', 'Night Surveillance',
  'security camera angles, surveillance footage aesthetic, parking lot at 3am, cold artificial light, observed pressure',
  ARRAY['green-grey', 'black', 'cold white', 'asphalt'],
  'Security camera perspective, empty parking structure at night, harsh fluorescent light casting cold shadows, surveillance timestamp overlay, observed danger',
  '{TRACK} (Street Pressure) — DeadZone310 x {ARTIST}',
  'Cold and observational — write like you are documenting danger from a distance. Clinical but threatening.',
  ARRAY['street pressure beat', 'surveillance beat', 'dark west coast instrumental', 'hard rap beat', 'night beat', 'menace music'],
  ARRAY['Turkz', 'Marrick'],
  'Cold minimal production, sharp snare, heavy 808, sparse sinister melody, no warmth in the mix',
  ARRAY['warm tones', 'organic instruments', 'jazz influences', 'bright melodies'],
  2),

('deadzone310', 'Desert Warfare',
  'sun-baked desert, relentless heat, dry cracked ground, heat haze, pressure without escape, unforgiving terrain',
  ARRAY['burnt orange', 'sand', 'black', 'deep brown'],
  'Aerial view of desert landscape under brutal midday sun, heat distortion visible on horizon, dry cracked earth, vast and unforgiving, extreme isolation',
  '{TRACK} (Desert Heat) — {ARTIST} x DeadZone310',
  'Relentless and dry — the pressure is environmental, inescapable. Write about dominance and survival.',
  ARRAY['desert rap beat', 'hard trap beat', 'west coast beat 2025', 'pressure music', 'heat beat', 'gangsta instrumental'],
  ARRAY['Turkz', 'Marrick'],
  'Heavy mid-range punch, dry reverb, sharp percussion, 808 with hard pitch movement, no atmospheric softness',
  ARRAY['atmospheric reverb', 'lush pads', 'melodic lead lines', 'emotional content'],
  3),

('deadzone310', 'Red Alert',
  'emergency red light flashing, warning systems active, controlled chaos, high stakes, immediate danger signal',
  ARRAY['deep red', 'black', 'white flash', 'gunmetal'],
  'Industrial space bathed in pulsing red emergency lighting, alarm states, sharp contrast between dark and red, immediate danger and controlled response',
  '{TRACK} (Red Alert) — DeadZone310',
  'High energy and urgent — write like every second matters. Pressure at maximum. Short and aggressive.',
  ARRAY['siren beat', 'hard trap instrumental', 'alert music', 'west coast banger', 'aggressive rap beat', 'deadzone type beat'],
  ARRAY['Turkz'],
  'Fast aggressive 808 pattern, sharp snare, siren-like lead, high energy arrangement, maximum pressure from bar one',
  ARRAY['slow tempo', 'mellow production', 'smooth sounds', 'emotional content'],
  4),

('deadzone310', 'Concrete Cinema',
  'documentary realism, street level camera, real environments, authentic urban tension, observed not staged',
  ARRAY['grey concrete', 'black', 'white', 'deep navy'],
  'Street level documentary angle, concrete pillars, authentic urban environment, natural harsh lighting, gritty realism without glamorization',
  '{TRACK} (Street Cinema) — {ARTIST} x DeadZone310',
  'Cinematic and real — write like a narrator documenting the streets. Authoritative without being performative.',
  ARRAY['street rap beat', 'cinematic trap', 'documentary hip hop', 'real street music', 'hard instrumental', 'west coast cinema'],
  ARRAY['Turkz', 'Marrick'],
  'Mid-tempo menace with cinematic tension, sharp drums, heavy bass, sparse but effective melodic elements',
  ARRAY['staged aesthetic', 'glamour visuals', 'soft production', 'melodic hip hop sounds'],
  5),

('deadzone310', 'Designer Menace',
  'street luxury crossover, designer clothing in dangerous spaces, expensive taste with real edge, contradiction of wealth and threat',
  ARRAY['black', 'gold', 'deep red', 'gunmetal'],
  'High fashion editorial in raw street environment, designer clothing against concrete and chain-link, expensive watches and raw danger coexisting, controlled contradiction',
  '{TRACK} (Designer Pressure) — {ARTIST} x DeadZone310',
  'Luxury and dangerous simultaneously — write about the collision of money and menace. Elevated but never soft.',
  ARRAY['designer trap beat', 'luxury street beat', 'fashion rap instrumental', 'hard luxury beat', 'west coast designer', 'premium pressure'],
  ARRAY['Turkz', 'Zyson'],
  'Polished hard production — cleaner mix than typical street beats but just as heavy, expensive-sounding 808s, dark musical sophistication with maximum impact',
  ARRAY['generic trap patterns', 'budget-sounding drums', 'cheap synths', 'unpolished mix'],
  6),

('deadzone310', 'Black Convoy',
  'premium black vehicles at low speed, controlled elite threat, quiet power, expensive danger moving without rushing',
  ARRAY['flat black', 'dark tinted windows', 'asphalt', 'chrome accents'],
  'Fleet of matte black luxury vehicles moving slowly through empty streets at night, chrome barely catching light, quiet collective power, restrained threat',
  '{TRACK} (Black Convoy) — DeadZone310 x {ARTIST}',
  'Quiet and powerful — not loud aggression but controlled menace. The most dangerous energy is calm.',
  ARRAY['slow hard beat', 'controlled pressure', 'midnight trap', 'premium street beat', 'black convoy type beat', 'slow menace'],
  ARRAY['Turkz', 'Zyson'],
  'Slower tempo menace, deep 808 movement, restraint over chaos, cold minimalist melody, each element placed with precision',
  ARRAY['fast chaotic energy', 'frantic production', 'high energy trap', 'busy arrangements'],
  7);

-- ─── SEED: IRONLIGHT — 7 Variations ──────────────────────────────────────────

INSERT INTO producer_variations
  (producer_slug, variation_name, visual_world, colors, image_prompt, yt_title_formula,
   description_style, tag_bank, best_artist_pairings, sound_direction, forbidden_elements, sort_order)
VALUES

('ironlight', 'Cathedral Dark',
  'gothic cathedral interior, vaulted arches, stained glass in darkness, stone and candlelight, sacred and haunted',
  ARRAY['black', 'deep burgundy', 'stained glass blue', 'candlelight gold'],
  'Gothic cathedral interior at night, vaulted stone arches disappearing into darkness, single shaft of colored light from stained glass, scattered candles, sacred and haunted atmosphere',
  '{TRACK} (Cathedral Dark) — IronLight x {ARTIST}',
  'Sacred and heavy — write about grandeur, weight, and spiritual darkness. Elevated and emotional.',
  ARRAY['cinematic dark beats', 'gothic hip hop', 'orchestral trap instrumental', 'dark emotional music', 'cathedral beat', 'ironlight type beat'],
  ARRAY['Lysandra', 'Sorin'],
  'Orchestral dark production with choir elements, dramatic piano, restrained but powerful percussion, string tension, cinematic swells',
  ARRAY['bright commercial sounds', 'happy progressions', 'cheap trap loops', 'generic drum patterns'],
  1),

('ironlight', 'Rainstorm',
  'heavy rain on glass, grey emotional weight, storm light, flooded streets reflecting city lights, emotional release',
  ARRAY['grey', 'deep blue', 'black', 'pale amber'],
  'Rain-soaked city window at night, heavy drops distorting the view of streetlights below, emotional weight of storm, soft interior light, reflection and grief',
  '{TRACK} (Dark Emotional) — {ARTIST} x IronLight',
  'Raw and emotional — write about weight, release, and the beauty inside pain. Honest and cinematic.',
  ARRAY['dark emotional beat', 'sad hip hop instrumental', 'rainstorm beat', 'emotional trap', 'cinematic sad beat', 'dark R&B instrumental'],
  ARRAY['Lysandra', 'Jayno'],
  'Slow emotional production with piano at center, atmospheric reverb, sparse delicate percussion, bass carrying emotional weight, long sustains',
  ARRAY['upbeat energy', 'hard trap hits', 'aggressive sounds', 'fast tempo'],
  2),

('ironlight', 'Forest Isolation',
  'dark ancient forest, fog between trees, isolation and natural weight, distant sounds, primordial darkness and beauty',
  ARRAY['dark forest green', 'black', 'silver fog', 'deep brown'],
  'Ancient forest in dense fog at night, twisted trees disappearing into darkness, silver mist at ground level, absolute isolation, primordial atmosphere of beauty and threat',
  '{TRACK} (Forest Dark) — IronLight',
  'Isolated and ancient — write about nature as emotional landscape. Introspective and weighty.',
  ARRAY['dark atmospheric beats', 'forest instrumental', 'isolated beat', 'nature dark hip hop', 'ambient trap', 'cinematic isolation'],
  ARRAY['Sorin', 'Lysandra'],
  'Ambient dark production with acoustic elements processed heavily, nature sound integration, slow sparse percussion, textural depth over rhythmic momentum',
  ARRAY['urban production clichés', 'street sounds', 'hard trap drums', 'commercial sounds'],
  3),

('ironlight', 'Urban Gothic',
  'city architecture at night with gothic weight, abandoned beautiful buildings, decay and elegance coexisting, emotional urban darkness',
  ARRAY['black', 'slate blue', 'rusted orange', 'pale concrete'],
  'Abandoned urban architecture at night, ornate stone details on decaying buildings, rain on broken windows, city gothic decay, elegance and rot coexisting',
  '{TRACK} (Urban Dark) — {ARTIST} x IronLight',
  'Heavy and urban — the city as emotional weight. Civilizational darkness, not just street pressure.',
  ARRAY['urban cinematic beat', 'dark city instrumental', 'gothic trap', 'emotional urban hip hop', 'dark atmospheric', 'abandoned beauty beat'],
  ARRAY['Jayno', 'Lysandra'],
  'Urban noir production with city-influenced sounds processed cinematically, dark piano, heavy atmosphere, drums that feel like distant echoes',
  ARRAY['bright urban production', 'happy city sounds', 'upbeat street energy', 'commercial hip hop'],
  4),

('ironlight', 'Abandoned Palace',
  'decayed grand estate, faded opulence, beautiful ruin, gilded surfaces under dust, nobility fallen to time',
  ARRAY['faded gold', 'dusty white', 'dark grey', 'deep red'],
  'Grand palace ballroom in decay, chandelier covered in cobwebs catching light, peeling gold walls, parquet floor warped by time, faded opulence and beautiful ruin',
  '{TRACK} (Faded Elegance) — IronLight x {ARTIST}',
  'Decayed elegance — write about beauty that time has destroyed. Nostalgic grief for something magnificent and lost.',
  ARRAY['orchestral hip hop beat', 'abandoned beauty instrumental', 'faded elegance beat', 'cinematic sadness', 'dark orchestral', 'ironlight style'],
  ARRAY['Lysandra', 'Sorin'],
  'Orchestral production with decayed textures, vinyl-like warmth processed through sadness, piano over string bed, dramatic but restrained',
  ARRAY['clean polished sounds', 'modern production aesthetics', 'digital clarity', 'hard drums'],
  5),

('ironlight', 'Night Confession',
  'intimate dark room, single light source, two figures in shadow, private emotional truth-telling, vulnerability in darkness',
  ARRAY['black', 'warm amber single light', 'deep shadow', 'skin tones'],
  'Small dark room with single lamp casting amber circle of light, figure half-in-shadow, intimate space, private confession atmosphere, emotional rawness',
  '{TRACK} (Night Confession) — {ARTIST} x IronLight',
  'Intimate and raw — write about private truth and emotional exposure. Close and personal.',
  ARRAY['intimate dark beat', 'emotional rap instrumental', 'confession beat', 'late night R&B', 'dark soul beat', 'night confession'],
  ARRAY['Zyson', 'Lysandra'],
  'Intimate production — small room reverb, close-mic piano, sparse percussion, emotional bass movement, feels private and confessional',
  ARRAY['large reverb', 'grand orchestral sounds', 'wide stereo spread', 'bombastic production'],
  6),

('ironlight', 'Orchestra Darkness',
  'dark concert hall, full orchestra in shadow, dramatic lighting, power of full ensemble in cinematic darkness, maximum emotional scale',
  ARRAY['black', 'deep red', 'gold conductor light', 'silver instruments'],
  'Concert hall plunged in darkness except for conductor light, full orchestra silhouettes, instruments catching gold light, maximum emotional scale and power',
  '{TRACK} (Orchestral Dark) — IronLight x {ARTIST}',
  'Grand and cinematic — write at the scale of a film score. This is maximum emotional and artistic power.',
  ARRAY['orchestral hip hop', 'cinematic rap instrumental', 'dark orchestra beat', 'film score hip hop', 'dramatic music', 'orchestra trap'],
  ARRAY['Sorin', 'Lysandra'],
  'Full orchestral production with live-feeling strings, dramatic percussion, powerful cinematic builds, brass if appropriate, maximum emotional architecture',
  ARRAY['simple trap production', 'basic drum loops', 'digital synths without orchestration', 'minimal arrangements'],
  7);

-- ─── SEED: TIDEWELL — 7 Variations ───────────────────────────────────────────

INSERT INTO producer_variations
  (producer_slug, variation_name, visual_world, colors, image_prompt, yt_title_formula,
   description_style, tag_bank, best_artist_pairings, sound_direction, forbidden_elements, sort_order)
VALUES

('tidewell', 'Ocean Sunrise',
  'coastal morning, first light on ocean water, horizon warmth, salt air, open space and possibility, first breath of day',
  ARRAY['gold sunrise', 'ocean blue', 'white foam', 'warm coral'],
  'Coastal cliffs at sunrise, golden light painting ocean water, horizon glowing, soft waves against shore, open sky and salt air, warmth and possibility',
  '{TRACK} (Ocean Soul) — {ARTIST} x Tidewell',
  'Open and alive — write about the feeling of morning and possibility. Warm without being soft.',
  ARRAY['ocean soul beat', 'sunrise instrumental', 'coastal hip hop', 'morning groove', 'warm afrobeats', 'tidewell type beat'],
  ARRAY['Yosin'],
  'Light bright-minor groove with coastal energy, guitar textures or plucked instruments, rhythmic warmth, open airy mix',
  ARRAY['dark minor progressions', 'heavy bass dominance', 'menacing atmosphere', 'indoor claustrophobic sounds'],
  1),

('tidewell', 'City Rhythm',
  'urban movement, warm afternoon in the city, people in motion, energy of collective life, warmth in the street flow',
  ARRAY['warm amber', 'concrete grey', 'street color', 'sky blue'],
  'Wide city street in warm afternoon light, people in motion at golden hour, energy of urban life, warmth and rhythm in the collective flow of the city',
  '{TRACK} (City Groove) — Tidewell x {ARTIST}',
  'Energetic and alive — capture urban warmth and movement. Rhythmic and connected.',
  ARRAY['city groove beat', 'urban soul', 'afro hip hop', 'movement music', 'warm city instrumental', 'tidewell groove'],
  ARRAY['Jayno', 'Yosin'],
  'Rhythmic groove with urban percussion textures, warm bass bounce, melodic movement, body-forward energy',
  ARRAY['cold digital sounds', 'static environments', 'dark heavy production', 'slow depressive tempos'],
  2),

('tidewell', 'Gold Hour',
  'late afternoon golden light everywhere, warmth saturating the world, beautiful transition moment, everything luminous',
  ARRAY['deep gold', 'amber', 'warm orange', 'shadow purple'],
  'Urban scene at golden hour, warm light saturating surfaces, long shadows stretching, everything touched by gold, luminous transition between day and evening',
  '{TRACK} (Gold Hour) — {ARTIST} x Tidewell',
  'Beautiful and warm — the world at its most luminous. Emotional warmth and visual beauty.',
  ARRAY['golden hour beat', 'warm groove instrumental', 'sunset hip hop', 'luminous beats', 'warm emotional music', 'gold hour type beat'],
  ARRAY['Zyson', 'Yosin'],
  'Warm groove with emotional chord movement, golden-hour sonic palette, rhythmic but introspective, melodic bass and guitar',
  ARRAY['cold clinical sounds', 'aggressive production', 'harsh digital tones', 'dark heavy atmosphere'],
  3),

('tidewell', 'Rooftop Summer',
  'rooftop above the city in summer, elevated perspective, city heat and breeze, social energy, feeling above the everyday',
  ARRAY['sky blue', 'city warm grey', 'white', 'summer green'],
  'Rooftop party setup above city skyline on summer evening, string lights, warm breeze, elevated perspective over glittering city, social energy and warmth',
  '{TRACK} (Rooftop Summer) — Tidewell',
  'Social and elevated — write about the feeling of being above it all in good company. Warm and bright.',
  ARRAY['summer groove beat', 'rooftop music', 'social hip hop', 'warm summer instrumental', 'party groove', 'elevated beats'],
  ARRAY['Jayno', 'Yosin'],
  'Bright groove with chant-ready hooks, summer percussion, melodic synths, danceable but tasteful rhythm',
  ARRAY['indoor heavy production', 'dark atmospheric sounds', 'menacing energy', 'cold digital production'],
  4),

('tidewell', 'Global Motion',
  'world in motion, cultural confluence, Afro-influenced visual energy, rhythmic global pulse, movement across continents',
  ARRAY['earth tones', 'warm amber', 'deep ocean blue', 'terracotta'],
  'Dynamic global imagery, cultural vibrancy and movement, Afro-influenced textures, rich color and rhythmic visual energy, world as connected and alive',
  '{TRACK} (Global Groove) — {ARTIST} x Tidewell',
  'Global and rhythmic — write about connection, movement, the world as one rhythm. Inclusive and alive.',
  ARRAY['afrobeats type beat', 'global groove instrumental', 'world music hip hop', 'afro-influenced beat', 'rhythmic world beat', 'tidewell global'],
  ARRAY['Yosin'],
  'Afro-influenced groove with rolling percussion, global rhythm textures, warm melodic movement, body-forward energy',
  ARRAY['western-only sounds', 'tourist clichés', 'generic afrobeats stereotypes', 'cheap world music stereotypes'],
  5),

('tidewell', 'Warm Drift',
  'floating and weightless, warm color world, melodic movement without anchor, emotional warmth in motion, dreaming while moving',
  ARRAY['warm cream', 'soft gold', 'pale blue', 'gentle amber'],
  'Abstract warm visual world, soft color gradients, movement like warm air or gentle current, emotional lightness and melodic drift, beautiful and weightless',
  '{TRACK} (Warm Drift) — Tidewell x {ARTIST}',
  'Floating and melodic — write about weightlessness and emotional warmth. Drifting forward gently.',
  ARRAY['melodic groove beat', 'warm drift instrumental', 'floating hip hop', 'melodic soul beat', 'smooth groove', 'atmospheric warmth'],
  ARRAY['Yosin', 'Jayno'],
  'Melodic groove production, floating chord movement, gentle percussion, melodic bass, warm atmospheric pad textures',
  ARRAY['hard hitting drums', 'aggressive bass', 'dark atmosphere', 'pressure music'],
  6),

('tidewell', 'Island Current',
  'coastal rhythm, natural water movement, island energy with sophistication, organic and alive, ocean meets culture',
  ARRAY['turquoise water', 'white sand', 'deep green', 'warm coral'],
  'Sophisticated coastal scene, clear turquoise water, elegant natural light, organic textures of sand and vegetation, rhythmic ocean movement, tasteful tropical energy',
  '{TRACK} (Island Current) — {ARTIST} x Tidewell',
  'Rhythmic and coastal — write about natural energy and island sophistication. Organic not tourist.',
  ARRAY['coastal beats', 'island groove', 'rhythmic hip hop', 'tropical soul', 'ocean current beat', 'afro coastal'],
  ARRAY['Yosin'],
  'Coastal rhythmic groove with organic percussion, water-inspired movement, warm bass, tropical melodic textures without cliché',
  ARRAY['cliché tropical sounds', 'generic afrobeats', 'touristy imagery', 'cheap steel drum sounds'],
  7);

-- ─── SEED: GRVND — 7 Variations ──────────────────────────────────────────────

INSERT INTO producer_variations
  (producer_slug, variation_name, visual_world, colors, image_prompt, yt_title_formula,
   description_style, tag_bank, best_artist_pairings, sound_direction, forbidden_elements, sort_order)
VALUES

('grvnd', 'Digital Warfare',
  'futuristic battlefield, drone swarms, digital targeting systems, blue data overlays, tech-aggression at scale',
  ARRAY['electric blue', 'black', 'white digital', 'cold grey'],
  'Futuristic military command center, drone swarms visible through massive screens, blue data overlays, cold digital targeting systems, technology as weapon, aggressive and precise',
  '{TRACK} (Digital Warfare) — {ARTIST} x GRVND',
  'Aggressive and futuristic — write about technological power and digital dominance. Cold and precise.',
  ARRAY['digital trap beat', 'futuristic rap instrumental', 'tech trap beat', 'hard digital music', 'warfare beat', 'grvnd type beat'],
  ARRAY['Turkz', 'Jayno'],
  'Maximum pressure digital production, hard aggressive 808, sharp digital snare, minimal sinister synth, fast hat movement, overwhelming bass energy',
  ARRAY['warm organic sounds', 'jazz influences', 'soft production', 'vintage aesthetics'],
  1),

('grvnd', 'Neon Pressure',
  'neon-lit urban night, wet pavement reflecting colored light, cyberpunk street energy, dark city glow, neon as power',
  ARRAY['neon pink', 'electric blue', 'black', 'deep purple'],
  'Cyberpunk urban street at night, wet pavement reflecting multiple neon signs, dark figures moving through colored light, digital advertising towers, futuristic city menace',
  '{TRACK} (Neon Pressure) — GRVND x {ARTIST}',
  'Dark and futuristic — neon color against total darkness. Cyberpunk energy with real menace.',
  ARRAY['neon trap beat', 'cyberpunk rap', 'dark neon instrumental', 'futuristic pressure', 'night pressure beat', 'digital menace'],
  ARRAY['Turkz', 'Zyson'],
  'Dark synthesizer pressure with neon-bright lead tones against heavy bass, cyberpunk aesthetic sound design, cold rhythm programming',
  ARRAY['warm vintage sounds', 'organic instruments', 'nostalgic aesthetics', 'lo-fi elements'],
  2),

('grvnd', 'Void Space',
  'digital void, pure darkness with geometric light elements, minimalist digital nothingness, space as pressure',
  ARRAY['pure black', 'white geometric lines', 'deep space blue', 'cold grey'],
  'Infinite digital void, pure black space with barely visible geometric grid lines, single point of cold light in distance, minimalist digital nothingness, pressure through absence',
  '{TRACK} (Void Space) — GRVND',
  'Minimalist and cold — write about pressure through absence. Empty space as power. Clinical.',
  ARRAY['minimalist trap beat', 'dark atmospheric beat', 'void music', 'space trap instrumental', 'cold dark beat', 'abstract rap beat'],
  ARRAY['Jayno'],
  'Extreme minimalism — single heavy 808, cold sparse melody, massive space between elements, silence as weapon, each hit hits harder from the emptiness',
  ARRAY['busy arrangements', 'crowded production', 'warm full sounds', 'happy chord movement'],
  3),

('grvnd', 'Machine Soul',
  'robotic but emotional, machine interior with human warmth, cold technology containing hidden feeling, digital heart',
  ARRAY['silver', 'deep black', 'warm amber glow', 'electric blue'],
  'Industrial machine interior but with unexpected warmth — amber light filtering through cold metal, mechanical precision revealing emotional depth, technology with a heartbeat',
  '{TRACK} (Machine Soul) — {ARTIST} x GRVND',
  'Cold and emotional simultaneously — write about the feeling inside the machine. Technology that hurts.',
  ARRAY['digital emotional beat', 'machine soul instrumental', 'cold rap beat with feeling', 'emotional trap 2025', 'synthetic soul', 'grvnd emotional'],
  ARRAY['Jayno', 'Zyson'],
  'Digital production with emotional undertone — hard 808 with melodic tension, cold synthesis with warm chord suggestion, the feeling of emotion in a machine',
  ARRAY['purely cold robotic sounds', 'completely emotionless production', 'happy melodics', 'organic warmth'],
  4),

('grvnd', 'Underground Current',
  'underground infrastructure, massive power running beneath everything, raw concrete and electricity, hidden force',
  ARRAY['concrete grey', 'electric yellow warning', 'black', 'industrial red'],
  'Underground electrical infrastructure, massive conduits and generators, raw concrete tunnels, warning lights, enormous power moving through hidden systems beneath the city',
  '{TRACK} (Underground Current) — {ARTIST} x GRVND',
  'Raw and powerful — massive energy moving underground. The power that nobody sees but everyone feels.',
  ARRAY['underground rap beat', 'raw trap instrumental', 'bass heavy beat', 'underground pressure', 'raw digital music', 'power beat'],
  ARRAY['Turkz'],
  'Maximum bass energy, raw distorted 808, industrial percussion, minimum melodic content, pure rhythmic power and bass dominance',
  ARRAY['polished clean production', 'soft melodics', 'gentle dynamics', 'pristine mixing'],
  5),

('grvnd', 'Synthetic Luxury',
  'digital luxury, premium interfaces, cold elegance of technology, high-end digital world, expensive and artificial',
  ARRAY['deep black', 'chrome', 'cold white', 'electric blue accent'],
  'High-end digital interface rendered in premium quality, smooth chrome surfaces, cold elegant typography, luxury technology aesthetic, expensive and artificial world',
  '{TRACK} (Synthetic Luxury) — {ARTIST} x GRVND',
  'Premium and digital — write about luxury through the lens of technology. Expensive and cold.',
  ARRAY['luxury digital beat', 'premium trap instrumental', 'upscale digital music', 'expensive beat', 'synthetic luxury', 'premium dark trap'],
  ARRAY['Zyson', 'Jayno'],
  'Polished digital production with premium mix quality, expensive-sounding 808 design, clean dark melodic content, controlled and precise',
  ARRAY['rough raw sounds', 'lo-fi aesthetics', 'distorted dirty production', 'budget-sounding elements'],
  6),

('grvnd', 'Night Protocol',
  'covert operations at night, mission-focused movement, precision and discipline, dark tactical world, operations aesthetic',
  ARRAY['tactical green', 'black', 'dark grey', 'night vision green'],
  'Covert nighttime operation, dark tactical environment, night vision aesthetic, precise disciplined movement, mission-focused energy, operations command',
  '{TRACK} (Night Protocol) — GRVND x {ARTIST}',
  'Tactical and precise — write about mission focus and covert power. Disciplined, not chaotic.',
  ARRAY['tactical beat', 'operation rap instrumental', 'covert music', 'night mission beat', 'discipline rap', 'protocol beat'],
  ARRAY['Turkz', 'Zyson'],
  'Tactical minimal production, disciplined drum programming, covert bass movement, precision over chaos, night-ops aesthetic sound design',
  ARRAY['chaotic energy', 'busy arrangements', 'emotional content', 'warm sounds'],
  7);
