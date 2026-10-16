---
name: talking-head-reel-edit
description: Edit a vertical (9:16) talking-head reel in the "hero-word" style. One lime keyword per beat with small white lead/tail words, captions that cut with the jump cuts, punch-in / blur-zoom / stripe-flash / shake transitions, a single literal B-roll insert, and phone-UI motion graphics (REC viewfinder, red warning cards, inner-voice chat bubble, spotlight ring, flying send icon, strike-through). Includes an After Effects script that builds all of it from a caption plan plus word timestamps. Use this whenever someone wants to edit, caption or animate a talking-head, founder, coach, UGC or ad video for Reels/TikTok/Shorts, asks for engaging, kinetic or animated captions, wants an After Effects/Premiere/CapCut caption template, says "make my reel look like this", or shares a reel and asks how its captions, B-roll or motion graphics were done, even if they never name the style.
---

# Talking-head reel edit: the hero-word style

This style makes one static talking-head setup feel designed and multi-shot. It was reverse-engineered
frame by frame from a 17 s agency ad (`references/reference-reel-breakdown.md`). Four layers do the work:

1. **Caption lockups.** Each beat gets one lime hero word, with small white words tucked above and
   below. Words appear on the frame they're spoken, and the lockup cuts away on the next jump cut.
2. **Camera moves on the A-roll.** Punch-ins, a slow push, and four transition types, each used once.
3. **One literal B-roll insert** at the emotional low point.
4. **Phone-UI graphics** that carry meaning: a REC viewfinder, error cards, a chat bubble, a send icon.

## Why it holds attention

Keep these when adapting the style; they matter more than the exact pixels.

- **Motion in the first 300 ms.** Open mid-sentence on a tight frame. The first hero word lands with a pull-back.
- **A skim track.** Reading only the lime words should tell the whole pitch, so pick exactly one
  hero (1–2 words) per beat. Small white words give context without competing.
- **A new visual event every ≤1 s** (a word, an icon move, a card pop). **A structural change every
  ~1.5–2 s** (a cut, a transition, a new graphic).
- **Colour carries meaning, consistently.** Accent = the idea, red = the problem, coral = the inner
  voice, cream = the spotlight.
- **Native phone UI** (notifications, viewfinder, send icon) reads instantly.
- **The relief is a visual state change.** Stack the problem graphics during the agitate beat, then
  remove all of them in one cut on the first word of the solution.
- **Each trick once.** One B-roll, one behind-the-head shot, one flash, one shake.
- **Tight VO.** Cut every pause and breath. No music bed is needed.

## Workflow

### 1. Gather inputs

- **The cut.** Vertical A-roll (1080×1920, any fps) with the jump cuts already made. The script decorates
  an existing edit; it doesn't cut footage. Get the cut times from the timeline, or run
  `ffmpeg -i cut.mp4 -vf "select='gt(scene,0.1)',showinfo" -f null - 2>&1 | grep pts_time`.
- **Word timestamps.** Use a Premiere/CapCut transcript or SRT, Whisper with `--word_timestamps True`,
  or a list from the user. If none exists and you can't make one, ask for it. Guessing timings
  breaks the style.
- **Brand constraints.** Accent colour and fonts, if the user has them. Otherwise use the defaults
  (lime `#E0FD56`, Inter).

### 2. Map beats and pick hero words

Split the VO into groups of 3–7 words: one idea each, ~1.3–2.1 s on screen. For each group, pick the
word that carries the meaning (usually the noun or verb the sentence is about) as the hero.
Arrange the arc and assign treatments:

| Beat | Typical treatment |
|---|---|
| Hook (0–3 s) | `@punch` on the first hero; a small graphic (send icon) |
| Problem | `{strike}` on the thing that's failing; a `@blurzoom` or `@flash` into it; `{behind}` + `{big}` once on the key line |
| Agitate | The one B-roll insert with `@ring` + `[bubble]`; exit with `@shake`; `@rec` frame and `[card:…]` stack for doubts |
| Solution | Hard cut that clears every problem graphic; clean frame; accent payoff word; end on it (loops) |

Not every reel has every beat. Use what fits the script, and leave graphics out rather than force them.
`references/broll-and-reframing.md` covers where B-roll and punch-ins go.

### 3. Write the plan

Write `plan.txt`: one line per group, `*hero*` marked, flags in `{}`, effects as `@lines`. The full
syntax is in `references/plan-format.md`; read it before writing one. `examples/plan.txt` rebuilds
the reference reel:

```
If the *Prospects* have to / meet you
your *Content* is failing {strike}
being on *Camera Stresses* you out {top}
[bubble +0.53] Please turn it off...
[card:warning] what to say?
we take it off *Your plate*
@punch 0.27 from=125 start=0
@shake 8.1
```

Place every transition (`@blurzoom`, `@flash`, `@shake`) on an actual footage cut.

### 4. Build

```bash
python3 scripts/words_to_cues.py --plan plan.txt --words words.json --out cues.json --duration <seconds>
```

Fix any "not found in the transcript" warnings. Then, in After Effects, open the reel comp and run
**File › Scripts › Run Script File… → `scripts/build_reel_style.jsx`**, and pick `cues.json`.

The script makes word-by-word caption layers with glow and land animations, the strike, REC dot,
send icon, cards, bubble, ring, REC frame and tap circle. It also adds an `RS CAMERA` null that parents
the footage, and adjustment layers for the transitions. Every layer it makes is named `RS …`.
Re-running it replaces them, so iterate by editing the plan and running both steps again.
With no comp open, it builds a 1080×1920 comp of graphics only, for previewing.

### 5. Finish by hand

- `{behind}`: Roto Brush the person on the `ROTO subject …` layer it created (that layer survives re-runs).
- B-roll: cooler and darker grade (see `references/style-spec.md` §7).
- Audio: cut pauses to silence, add one literal SFX where a graphic implies sound (a camera beep on
  REC), and master to −14 LUFS.
- Fonts: the end-of-run alert lists any fallbacks. Install Inter (free) or set `theme` fonts in cues.json.

### 6. Check before export

- [ ] Only lime words, read in order, make sense as the message.
- [ ] Every word appears on its spoken frame. No caption lingers past its cut.
- [ ] Nothing in the bottom quarter or behind the right-edge buttons. Text is never over the face,
      except the one deliberate behind-the-head moment.
- [ ] Each transition sits on a real cut; each trick is used once.
- [ ] The problem graphics all disappear on the solution line.
- [ ] Export H.264 1080×1920 at source fps, high bitrate (≥16 Mbps), −14 LUFS.

## Not using After Effects?

Give the user the plan (step 3) plus the numbers in `references/style-spec.md`. Its last section maps
each element to Premiere, Resolve and CapCut. If they only want an analysis of a reel, use the method
at the end of `references/reference-reel-breakdown.md`.

## Files

| File | Read when |
|---|---|
| `references/reference-reel-breakdown.md` | The user asks how the original was made, or you need the reasoning behind a choice; also has the method for analysing a new reference reel |
| `references/style-spec.md` | Building or tweaking anything by hand: colours, type sizes, layout maths, frame-by-frame animation values, other editors |
| `references/plan-format.md` | Writing a plan, reading or editing cues.json, or overriding the theme |
| `references/broll-and-reframing.md` | Deciding punch-ins and the B-roll insert, including AI-generated inserts |
| `scripts/words_to_cues.py` | Plan + word timestamps → cues.json (Python 3, standard library only) |
| `scripts/build_reel_style.jsx` | cues.json → layers in the active AE comp |
| `examples/` | `plan.txt`, `words.json`, `cues.json` that rebuild the reference reel; a good smoke test |

## Limits

- The JSX was exercised against a mocked After Effects object model (keyframe calls, layer order,
  layout with real Inter metrics), not inside After Effects. On the first real run, use a duplicate
  comp and check three things: the hero glow strength (Drop Shadow opacity), whether the card's
  Gradient Ramp stays inside the card, and the shake blur direction.
- The script doesn't cut footage, rotoscope, grade, or mix sound. Those are the manual passes above.
- Lockup maths assumes horizontal Latin text. Very long hero words are shrunk to fit, so keep heroes short.
