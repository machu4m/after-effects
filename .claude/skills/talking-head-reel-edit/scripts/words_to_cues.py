#!/usr/bin/env python3
"""Turn a caption plan + word timestamps into cues.json for build_reel_style.jsx.

    python3 words_to_cues.py --plan plan.txt --words words.json --out cues.json

--words takes a JSON word list ([{"word"|"text", "start", "end"}]), a Whisper-style
JSON ({"segments": [{"words": [...]}]}), or an .srt (word times spread evenly per cue).
The plan format is documented in references/plan-format.md.
"""
import argparse
import json
import re
import sys

FX_SPANS = {"push", "ring", "rec"}            # take start and end
FX_POINTS = {"punch", "blurzoom", "flash", "shake", "tap"}   # take one time
FLAGS = {"strike", "top", "low", "big", "slam", "behind", "rec-dot"}


def warn(msg):
    print("warning: " + msg, file=sys.stderr)


def norm(word):
    return re.sub(r"[^a-z0-9]", "", word.lower())


def srt_time(stamp):
    h, m, rest = stamp.strip().split(":")
    s, ms = rest.replace(".", ",").split(",")
    return int(h) * 3600 + int(m) * 60 + int(s) + int(ms) / 1000.0


def load_words(path):
    with open(path, encoding="utf-8") as f:
        raw = f.read()
    words = []
    if path.lower().endswith(".srt"):
        for block in re.split(r"\n\s*\n", raw.strip()):
            lines = [l for l in block.splitlines() if l.strip()]
            stamps = [l for l in lines if "-->" in l]
            if not stamps:
                continue
            a, b = (srt_time(x) for x in stamps[0].split("-->"))
            text = " ".join(lines[lines.index(stamps[0]) + 1:]).split()
            for i, w in enumerate(text):
                words.append({"text": w, "start": a + (b - a) * i / len(text)})
        return words
    data = json.loads(raw)
    if isinstance(data, dict):
        if "segments" in data:
            data = [w for seg in data["segments"] for w in seg.get("words", [])]
        else:
            data = data.get("words", [])
    for w in data:
        text = (w.get("word") or w.get("text") or "").strip()
        if text:
            words.append({"text": text, "start": float(w["start"])})
    return words


class Aligner:
    """Walks the transcript in order and hands each plan word its spoken time."""

    def __init__(self, words, lookahead=8):
        self.words = [dict(w, key=norm(w["text"])) for w in words]
        self.pos = 0
        self.lookahead = lookahead
        self.last = 0.0

    def time_of(self, text):
        key = norm(text)
        for i in range(self.pos, min(self.pos + self.lookahead, len(self.words))):
            if self.words[i]["key"] == key:
                self.pos = i + 1
                self.last = self.words[i]["start"]
                return self.last
        warn('"%s" not found in the transcript near %.2fs; guessed its time' % (text, self.last))
        self.last += 0.12
        return self.last


def split_flags(line):
    flags = re.findall(r"\{([^}]*)\}", line)
    return re.sub(r"\{[^}]*\}", "", line).strip(), [f.strip() for f in flags]


def parse_fx(line, n):
    parts = line[1:].split()
    kind = parts[0].lower()
    nums, opts = [], {}
    for p in parts[1:]:
        if "=" in p:
            k, v = p.split("=", 1)
            try:
                opts[k] = float(v)
            except ValueError:
                opts[k] = v
        else:
            nums.append(float(p))
    fx = {"type": kind}
    if kind in FX_SPANS:
        if len(nums) != 2:
            sys.exit("line %d: @%s needs a start and an end time" % (n, kind))
        fx["start"], fx["end"] = nums
    elif kind in FX_POINTS:
        if len(nums) != 1:
            sys.exit("line %d: @%s needs one time" % (n, kind))
        fx["t"] = nums[0]
    else:
        warn("line %d: unknown fx @%s passed through" % (n, kind))
        if nums:
            fx["t"] = nums[0]
    fx.update(opts)
    return fx


def caption_group(text, flags, align, n, fps):
    m = re.search(r"\*([^*]+)\*", text)
    if not m:
        sys.exit("line %d: mark the hero word(s) with *stars*: %s" % (n, text))
    before, hero, after = text[:m.start()], m.group(1), text[m.end():]
    top, tail = (after.split(" / ", 1) if " / " in after else ("", after))

    g = {"kind": "caption", "pos": "mid"}
    for role, chunk in (("lead", before), ("hero", hero), ("top", top), ("tail", tail)):
        g[role] = [{"text": w, "t": 0.0} for w in chunk.split()]
    # Times in reading order, which is also speaking order: lead, hero, top, tail.
    for role in ("lead", "hero", "top", "tail"):
        for w in g[role]:
            w["t"] = align.time_of(w["text"])
    g["start"] = (g["lead"] or g["hero"])[0]["t"]

    for f in flags:
        if f in ("top", "low"):
            g["pos"] = f
        elif f.startswith("y="):
            g["y"] = float(f[2:])
        elif f.startswith("icon:"):
            g["icon"] = {"type": f[5:], "t": g["hero"][0]["t"]}
        elif f == "rec-dot":
            g["recDot"] = {"t": g["hero"][-1]["t"] + 4.0 / fps}
        elif f == "strike":
            after_hero = g["tail"] or g["top"]
            g["strike"] = {"t": after_hero[0]["t"] - 0.2 if after_hero else g["hero"][-1]["t"] + 0.4}
        elif f in FLAGS:
            g[f] = True
        else:
            warn("line %d: unknown flag {%s}" % (n, f))
    return g


def build(plan_lines, words, duration, fps, width, height):
    align = Aligner(words)
    groups, fx = [], []
    last_caption = None
    for n, raw in enumerate(plan_lines, 1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("@"):
            fx.append(parse_fx(line, n))
            continue
        text, flags = split_flags(line)
        tag = re.match(r"\[([^\]]+)\]\s*", text)
        if tag:
            head = tag.group(1).split()
            body = text[tag.end():]
            if head[0].startswith("card"):
                icon = head[0].split(":", 1)[1] if ":" in head[0] else "warning"
                ws = [{"text": w, "t": align.time_of(w)} for w in body.split()]
                groups.append({"kind": "card", "icon": icon, "words": ws,
                               "start": max(0.0, ws[0]["t"] - 3.0 / fps)})
            elif head[0] == "bubble":
                # Unspoken text: typed on from an offset (+s) into the caption it belongs to, or at @s.
                if last_caption is None:
                    sys.exit("line %d: a [bubble] has to follow a caption line" % n)
                when = head[1] if len(head) > 1 else "+0.4"
                start = float(when[1:]) + (last_caption["start"] if when.startswith("+") else 0)
                step = 0.2
                for f in flags:
                    if f.startswith("step="):
                        step = float(f[5:])
                ws = [{"text": w, "t": start + 0.1 + i * step} for i, w in enumerate(body.split())]
                groups.append({"kind": "bubble", "words": ws, "start": start, "owner": last_caption})
            else:
                sys.exit("line %d: unknown tag [%s]" % (n, tag.group(1)))
            continue
        last_caption = caption_group(text, flags, align, n, fps)
        groups.append(last_caption)

    # Each caption holds until the next spoken group starts (a hard cut, no outro).
    # Cards in a row stack and all hold until the next caption.
    spoken = [g for g in groups if g["kind"] != "bubble"]
    for i, g in enumerate(spoken):
        j = i + 1
        if g["kind"] == "card":
            while j < len(spoken) and spoken[j]["kind"] == "card":
                j += 1
        g["end"] = spoken[j]["start"] if j < len(spoken) else duration
    slot = 0
    for i, g in enumerate(spoken):
        if g["kind"] == "card":
            g["slot"] = slot
            slot += 1
        else:
            slot = 0
    for g in groups:
        if g["kind"] == "bubble":
            g["end"] = g.pop("owner")["end"]

    for g in groups:
        if g["end"] - g["start"] < 0.4:
            warn("group at %.2fs is on screen only %.2fs" % (g["start"], g["end"] - g["start"]))
    return {"version": 1, "fps": fps, "width": width, "height": height,
            "duration": duration, "groups": groups, "fx": fx}


def rounded(obj):
    if isinstance(obj, float):
        return round(obj, 3)
    if isinstance(obj, dict):
        return {k: rounded(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [rounded(v) for v in obj]
    return obj


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--plan", required=True, help="caption plan (.txt)")
    ap.add_argument("--words", required=True, help="word timestamps (.json or .srt)")
    ap.add_argument("--out", required=True, help="cue file to write (.json)")
    ap.add_argument("--duration", type=float, help="reel length in seconds (default: last word + 1s)")
    ap.add_argument("--fps", type=float, default=30)
    ap.add_argument("--width", type=int, default=1080)
    ap.add_argument("--height", type=int, default=1920)
    args = ap.parse_args()

    words = load_words(args.words)
    if not words:
        sys.exit("no words found in " + args.words)
    with open(args.plan, encoding="utf-8") as f:
        plan = f.read().splitlines()
    duration = args.duration or words[-1]["start"] + 1.0
    cues = build(plan, words, duration, args.fps, args.width, args.height)
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(rounded(cues), f, indent=1)
    kinds = [g["kind"] for g in cues["groups"]]
    print("wrote %s: %d captions, %d cards, %d bubbles, %d fx" % (
        args.out, kinds.count("caption"), kinds.count("card"), kinds.count("bubble"), len(cues["fx"])))


if __name__ == "__main__":
    main()
