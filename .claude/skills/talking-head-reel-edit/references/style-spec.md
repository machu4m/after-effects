# Style spec: the numbers

Everything `build_reel_style.jsx` does, as values you can rebuild by hand in After Effects,
Premiere, Resolve or CapCut. Sizes are for a 1080×1920 frame; scale them with frame width.
Frame counts are at 30 fps; at 25/24 fps keep the seconds, not the frame counts.

## Contents
1. Palette
2. Type
3. Caption lockup layout
4. Caption animation
5. Graphics
6. Camera moves and transitions
7. Grade and audio
8. Other editors

## 1. Palette

| Token | Hex | Use |
|---|---|---|
| Lime | `#E0FD56` | Hero words, send icon, their glow |
| White | `#FFFFFF` | Lead/tail words, REC label, card text |
| Red | `#E3212B` | Strike-through, REC dots, warning triangle |
| Card core / edge | `#B01025` / `#190407` | Radial glow inside warning cards |
| Coral | `#B45F4F` | Inner-voice bubble |
| Cream | `#F6E6C7` | Spotlight ring, ✖ icon |

Pick one accent and keep it for every hero word. Lime works because the footage is dark and warm.
On bright or green-heavy footage, swap only the accent (hot pink `#FF4FA3` or electric blue `#4FD2FF`)
and keep the rest.

## 2. Type

| Role | Font (first installed wins) | Size | Tracking |
|---|---|---|---|
| Hero | Inter Black → Inter ExtraBold → SF Pro Display Heavy → Helvetica Neue Black | 150 px (×1.45 for `{big}`), shrunk to fit 86% (92% big) of frame width | −25 |
| Lead / top / tail | Inter Bold → SF Pro Bold → Helvetica Neue Bold | 0.44 × hero (≈66 px), shrunk to fit 90% of the hero's width | −10 |
| Card / bubble text | Lexend Light → Poppins Light → Inter Light | 44 px (card), 28 px (bubble) | 0 / −10 |
| REC label | small font | 30 px | 0 |

Sentence case as spoken: the hero keeps the speaker's capitalisation ("Prospects", "content").
No outlines and no boxes behind words. Legibility comes from a dark frame, a soft dark drop shadow
(35%, 14 px soft, 2 px down) and the hero glow (lime, 45%, 45 px soft, zero distance).

## 3. Caption lockup layout

Measured from the hero's ink box (left, right, cap-top) and baseline `B`, hero size `hs`:

| Part | x | Baseline |
|---|---|---|
| Hero row | centred on the frame | mid: `0.55·H + 0.25·hs` · top: `0.19·H` · low: `0.70·H` |
| Lead row | ink starts at `heroLeft + 0.15·heroWidth` | `heroCapTop + 0.08·hs` (tucks into the hero) |
| Top row | right edge at `heroRight − 0.18·heroWidth`, never overlapping the lead | same as lead |
| Tail row | right edge at `heroRight − 0.03·heroWidth` | `B + 0.25·hs + 0.75·tailSize` |

- Keep the lockup inside 8–92% of width and 10–75% of height (clear of platform buttons and captions).
- Use `top` when the face is centred in the middle (B-roll close-ups, ring shots) or for text-behind-head.
- One lockup on screen at a time.

## 4. Caption animation

All "settle" eases: speed 0 both ends, 12% influence out of the first key, 85% into the last
(fast start, long soft landing).

| Role | Starts | Animation |
|---|---|---|
| Small word | on its spoken frame | 4 f: opacity 0→100, Gaussian blur 8→0, y +12 px→0 |
| Hero word | on its spoken frame | 5 f opacity 0→100; 7 f scale 118→100%; 6 f blur 28→0 |
| Hero, `{slam}` | on its spoken frame | 1 f opacity cut-in; 3 f scale 108→100% |
| Group exit | next group's first word / the jump cut | Hard cut, no outro |
| Card / bubble word | spoken frame (card) or every 0.2 s (bubble) | 3 f: opacity 0→100, scale 85→100%, rise 0.35×size |

## 5. Graphics

| Element | Geometry | Motion |
|---|---|---|
| Strike-through | Line from `(heroLeft − 4%·w, capMid − 0.05·hs)` to `(heroRight + 4%·w, capMid + 0.12·hs)`, red, width 0.055·hs, round caps, light red glow | Trim end 0→100% over 6 f, starting 0.2 s before the tail's first word |
| REC dot on hero | Red disc, diameter 0.09·hs, at `(heroRight + 0.06·hs, heroCapTop + 0.12·hs)` | 4 f after the hero: scale 0→125→100% over 5 f |
| Send icon | Outlined paper plane ~76 px long, lime stroke 5 px, glow | Path (0.86W,0.97H) → (0.62W,0.80H) → (0.38W,0.74H) → left of tail line over 0.85 s; rotation 215°→190°→−20°; scale 70→100%; motion blur |
| Spotlight ring | Circle stroke 5 px cream around the face (`r ≈ 0.29·W`), cream glow 55%, 30 px | Scale 145→100% in 14 f (settle), then slowly to 94% by the end |
| Inner-voice bubble | Coral pill, height 1.7×text, fully rounded, padding 0.6×text; tail dot (0.3×height) below-left; left edge at ring centre + 0.27r, centre 0.78r above ring centre | Scale X 0→100% from the left edge, 4 f; words pop every ~0.2 s |
| REC viewfinder | Corner brackets at 7%/93% width and 6.9%/92.7% height, arms 8% of width, white 85%, 2.5 px; small "+" near the bottom-right corner; red dot (Ø 1.8% W) at (12.5% W, 9.7% H); bold "REC" 30 px at (14.8% W, 10.4% H baseline) | Flicker on with hold keys: 100/25/100/25/100% over 5 f; stays until the solution cut |
| Warning card | 62% W × 6.25% H, corner radius 18% of height, centred; first at 56.5% H, next +10% H; fill `#190407` 94% with a radial red glow (core `#B01025` at bottom centre, radius ½ card width); 1.5 px white edge at 14%; soft red outer glow | Scale (70%,25%)→100% in 3 f, blur 20→0 in 4 f; icon fades in 2 f later; words pop as spoken |
| Card icons | ⚠: red triangle with white "!"; ✖: two cream rounded bars at ±45°, left at 8% of card width | |
| Tap circle | White disc Ø 13% W at 28% opacity | Scale 60→100% in 6 f; fade 0→28→28→0 over 12 f |

## 6. Camera moves and transitions

Put camera moves on a null that parents all footage, so the graphics stay still.

| Move | Keys |
|---|---|
| Punch-out (`@punch t from=125`) | Held at `from`% until `t`, then ease to 100% over 8 f (settle) |
| Slow push (`@push a b to=108`) | 100→`to`% eased between a and b; snaps back to 100% on the next frame (the cut) |
| Blur-zoom (`@blurzoom t`, cut at t) | Adjustment layer Gaussian blur 0 (t−3f) → 45 (t) → 40 (t+2f) → 0 (t+10f); camera 100→110% over t−3f…t−1f, hold, 130% at t → 100% at t+10f |
| Stripe flash (`@flash t`, cut at t) | White solid 0→92→0% (t−4f, t, t+5f) under black vertical lines 4.5 px every 15 px at 0→70→85→0% |
| Shake (`@shake t`, cut at t+5f) | Camera position offsets (+40,+8) (−34,−6) (+24,+5) (−12,−2) (0,0) px on consecutive frames, linear; Directional Blur 90°, 40→25→0 px; motion blur on footage |

Use each transition type once or twice per minute at most. Plain jump cuts under a caption change
are the default; the transitions mark a change of beat.

## 7. Grade and audio

- A-roll: low-key and warm. Lift skin a touch, keep the wall charcoal, add a vignette that takes the
  lower third close to black. The captions need that dark stage.
- B-roll for a negative beat: cooler (−200 K), −20% saturation, −0.3 stop.
- VO: cut every breath and pause. No music bed is needed. If you add one, keep it under −28 LUFS
  and duck it under speech. One literal SFX where a graphic implies sound (the camera beep on REC);
  leave the transitions silent or use a very soft whoosh.
- Loudness: −14 LUFS integrated, true peak −1 dBTP for Reels/TikTok/Shorts.

## 8. Other editors

| Feature | Premiere Pro | DaVinci Resolve | CapCut |
|---|---|---|---|
| Per-word reveal | One text layer per word (Essential Graphics), opacity + Gaussian Blur keyframes | Text+ per word, or Text+ "Follow" modifier | Split text per word; "Fade in" + "Blur" in-animations, 0.13 s |
| Hero glow | Duplicate the text, blur 40, opacity 45% | Glow effect on the Text+ | Text → Glow, lime, intensity ~40 |
| Camera null | Nest the A-roll; keyframe the nest's Scale/Position | Keyframe a compound clip's Zoom/Position | Keyframe Scale on the main track |
| Strike | Shape line + Crop/Linear Wipe | Line + mask reveal | Sticker line + "Wipe" in-animation |
| Behind-head text | Mask the subject on a duplicate track above the text (object mask if your version has it, or Roto Brush in AE via Dynamic Link) | Magic Mask on a duplicate | "Remove background" on a duplicate clip above the text |
| REC frame / cards / bubble | Build once as a .mogrt and reuse | Fusion macro | Save as a text template / sticker combo |
