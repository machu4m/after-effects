# Plan format and cue file

`words_to_cues.py` reads a plain-text **plan** (what the captions say and how they're arranged) and
**word timestamps** (when each word is spoken), and writes **cues.json** for `build_reel_style.jsx`.
The plan holds the editorial choices; the timestamps supply the timing.

## Plan syntax

One line per caption group, in speaking order. Blank lines and `#` comments are ignored.

```
If the *Prospects* have to / meet you
to *Understand* your value {icon:plane}
your *Content* is failing {strike}
You know *content* matters {top} {big} {slam} {behind}
being on *Camera Stresses* you out {top}
[bubble +0.53] Please turn it off...
even if *You record* you are unsure {rec-dot}
[card:warning] what to say?
[card:x] how it turn to revenue?
we take it off *Your plate*
@punch 0.27 from=125 start=0
@ring 6.2 8.27 x=0.5 y=0.40 r=0.29
```

### Caption line

`lead words *Hero Words* top words / tail words {flags}`

- `*…*` marks the hero: one or two words, exactly one hero per line. Required.
- Words before the hero → lead row (small, above, left).
- Words after the hero → tail row (small, below, right-aligned).
- With ` / ` after the hero, the words before the slash go to the top-right row and the rest to the tail.
- Write words as they should appear: punctuation and case are displayed as written. Matching
  against the transcript ignores case and punctuation.

| Flag | Effect |
|---|---|
| `{top}` / `{low}` | Lockup at 19% / 70% of frame height instead of mid (≈55%) |
| `{y=0.4}` | Hero baseline at that fraction of frame height |
| `{big}` | Hero ×1.45 (up to 92% of frame width); small rows scale with it |
| `{slam}` | Hero appears in one frame instead of the blur-scale land |
| `{strike}` | Red strike-through over the hero once it has landed (+0.25 s), or 0.2 s before the next row's first word if that's later |
| `{rec-dot}` | Red dot pops at the hero's top-right |
| `{icon:plane}` | Send icon flies in with the hero and lands left of the tail row |
| `{behind}` | Copies the footage above the caption as "ROTO subject …" for you to Roto Brush |

### Card line

`[card:warning] words?` or `[card:x] words?`: a red notification card with a ⚠ or ✖ icon. The words
must be spoken (they're timed from the transcript). Consecutive card lines stack and stay up until
the next caption line starts.

### Bubble line

`[bubble +0.53] Unspoken words...` or `[bubble @6.93] …`: the coral inner-voice pill. It belongs to
the caption line above it. `+s` = seconds after that caption starts, `@s` = absolute time. Its words
are not spoken: they type on every 0.2 s (`{step=0.15}` to change). It sits next to a `@ring` that
is on screen at the same time, otherwise at upper right.

### Effect line

`@name times key=value…`, times in seconds on the comp timeline.

List the footage cuts with `@cut`. Without it, a caption holds until the next caption's first word,
which can be a few frames into the next shot. `@blurzoom`/`@flash` (at t) and `@shake` (t + 5 frames)
count as cuts automatically.

| Line | Times | Options |
|---|---|---|
| `@cut a b c …` | every footage cut | — (not an effect: each caption ends on the first cut after its last word) |
| `@punch t` | hero land time | `from=125` (start scale %), `start=` (when the punched-in hold begins, e.g. the cut) |
| `@push a b` | start, end | `to=108` |
| `@blurzoom t` | the cut | — |
| `@flash t` | the cut (brightest frame) | — |
| `@shake t` | first shake frame; cut ~5 f later | — |
| `@ring a b` | start, end | `x= y=` centre (fraction of W/H), `r=` radius (fraction of W) |
| `@rec a b` | start, end | — |
| `@tap t` | — | `x= y=` |

## Word timestamps (`--words`)

Any of:

- JSON list: `[{"word": "If", "start": 0.03, "end": 0.2}, …]` (`text` also works for `word`)
- Whisper JSON with word timestamps: `{"segments": [{"words": [{"word": …, "start": …}]}]}`
- `.srt`: word times are spread evenly through each subtitle. Coarser; check the result.

Ways to get them: Premiere's Text panel (Transcribe sequence → export), CapCut auto captions →
export SRT, `whisper audio.wav --model small --word_timestamps True --output_format json`,
or a word list the user provides. If the reel has music under the voice, transcribe the VO stem.

The aligner walks the transcript in order and looks up to 8 words ahead for each plan word. When a
word isn't found it prints a warning and guesses (+0.12 s). Fix those in the plan, or by hand in
cues.json.

## Command

```bash
python3 scripts/words_to_cues.py --plan plan.txt --words words.json --out cues.json \
    [--duration 16.9] [--fps 30] [--width 1080] [--height 1920]
```

## cues.json

```json
{
 "version": 1, "fps": 30, "width": 1080, "height": 1920, "duration": 16.9,
 "theme": {"accent": [0.878, 0.992, 0.337]},
 "groups": [
  {"kind": "caption", "pos": "mid", "start": 0.033, "end": 1.667,
   "lead": [{"text": "If", "t": 0.033}, {"text": "the", "t": 0.133}],
   "hero": [{"text": "Prospects", "t": 0.267}],
   "top":  [{"text": "have", "t": 0.533}, {"text": "to", "t": 0.633}],
   "tail": [{"text": "meet", "t": 1.0}, {"text": "you", "t": 1.133}],
   "strike": {"t": 3.467}, "recDot": {"t": 8.866}, "icon": {"type": "plane", "t": 1.833},
   "big": true, "slam": true, "behind": true, "y": 0.4},
  {"kind": "card", "icon": "warning", "slot": 0, "start": 10.167, "end": 14.8,
   "words": [{"text": "what", "t": 10.267}]},
  {"kind": "bubble", "start": 6.93, "end": 8.167, "words": [{"text": "Please", "t": 7.03}]}
 ],
 "fx": [{"type": "punch", "t": 0.27, "from": 125, "start": 0}, {"type": "ring", "start": 6.2, "end": 8.27, "x": 0.5, "y": 0.4, "r": 0.29}]
}
```

`theme` is optional. Any key overrides the script's THEME: colours as 0–1 RGB, `heroFonts` /
`smallFonts` / `uiFonts` as PostScript-name lists, `heroSize`, `smallRatio`, `uiSize`,
`heroTracking`, `smallTracking`. Add it by hand to change the accent colour or fonts for a brand.
Times can be edited directly; the script snaps them to frames.
