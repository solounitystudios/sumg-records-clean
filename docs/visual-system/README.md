# SUMG Visual Operating System

This system gives every SUMG producer and artist a unique, documented visual identity that powers AI thumbnail generation, beat covers, social media graphics, and automated visual creation inside the SUMG pipeline.

---

## 4-Layer System

### Layer 1 — Identity Docs
Who each producer/artist is visually. Emotions, audience, brand, color palette, forbidden looks, and visual world. Lives in `producers/{slug}/dna.md`.

### Layer 2 — Prompt Docs
How to generate thumbnails consistently. Master formula, scene library, camera styles, title routing. Lives in `producers/{slug}/prompts.md`.

### Layer 3 — Reference Docs
What images, moods, scenes, textures, and camera styles the producer should feel like. Lives in `producers/{slug}/references.md`.

### Layer 4 — Performance Docs
What thumbnails actually win — based on CTR, views, watch time, and notes. Lives in `producers/{slug}/ctr-data-template.csv` and `analytics/`.

---

## Producers

| Slug       | Genre                  | Status  |
|------------|------------------------|---------|
| nightwire  | Jazz Psychedelic Trap  | Active  |

To add a producer: copy `templates/producer-dna-template.md` → `producers/{slug}/dna.md`.

---

## Directory Structure

```
docs/visual-system/
  README.md                         ← this file
  thumbnail-studio-spec.md          ← Phase 2 studio spec

  producers/
    nightwire/
      dna.md                        ← visual identity
      prompts.md                    ← 50+ ready prompts + formula
      references.md                 ← reference image guide
      ctr-data-template.csv         ← performance tracking

  templates/
    producer-dna-template.md
    thumbnail-prompt-template.md
    title-formulas.md
    thumbnail-formulas.md
    prompt-cheatsheet.md
    ctr-tracking-template.csv

  analytics/
    winners.md
    losers.md
    learnings.md
```

---

## Scale Path

This system is built to support 100+ producers. Each producer gets their own folder. The prompt engine in `lib/youtube/thumbnails/prompts.ts` reads the producer slug and applies the correct DNA automatically.

Next producers to onboard: Ironlight, Deadzone310, Tidewell.
