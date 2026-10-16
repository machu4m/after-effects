# Osamma VT → After Effects

`scripts/Osamma_VT_to_AE.jsx` turns the **"Mr-osamma VT"** Premiere sequence into an After Effects project.

1. Save the Premiere project.
2. In After Effects: **File › Scripts › Run Script File…** → `Osamma_VT_to_AE.jsx`.
3. Pick the `.prproj`. If AE asks which sequence to import, choose **Mr-osamma VT** (or All).

The script imports the sequence as a comp, mutes the camera audio (A1) while keeping the iPhone voice (A2),
saves `<project>_Osamma_VT.aep` next to the `.prproj`, and opens the comp.

Carries over: the 24 V1 pieces with their zoom/position, the 268 caption clips on V2–V8, and the audio.
Check after import: Lumetri/Warp Stabilizer settings and any Premiere-only effects, which AE may drop or
render differently.

## Skill: talking-head reel edit

`.claude/skills/talking-head-reel-edit/` is a Claude Code skill for the "hero-word" vertical reel style:
one lime keyword per beat with small white words around it, captions that cut with the jump cuts,
punch-in / blur-zoom / stripe-flash / shake transitions, one literal B-roll insert, and phone-UI graphics
(REC viewfinder, warning cards, chat bubble, spotlight ring, send icon, strike-through).

1. Write a caption plan (`examples/plan.txt` shows the syntax) and get word timestamps for the VO.
2. `python3 .claude/skills/talking-head-reel-edit/scripts/words_to_cues.py --plan plan.txt --words words.json --out cues.json`
3. In After Effects, open the reel comp and run `scripts/build_reel_style.jsx`, then pick `cues.json`.

`SKILL.md` has the workflow; `references/` has the frame-by-frame breakdown of the reel it was built from
and every number (colours, sizes, frame timings) for rebuilding it by hand or in Premiere/Resolve/CapCut.
