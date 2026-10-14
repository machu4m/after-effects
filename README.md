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
