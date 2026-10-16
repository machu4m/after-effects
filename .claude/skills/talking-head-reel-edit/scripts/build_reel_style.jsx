/*
 * build_reel_style.jsx
 *
 * Builds the "hero-word" talking-head reel style in the active comp from a cue file
 * (cues.json, written by words_to_cues.py): stacked caption lockups with a lime hero
 * word, red strike-through, REC viewfinder, warning cards, inner-voice bubble,
 * spotlight ring, flying send icon, tap circle, and the camera moves / transitions
 * (punch-out, slow push, blur-zoom, stripe flash, shake).
 *
 * Run in After Effects: open the reel comp, then File > Scripts > Run Script File...
 * With no comp open it makes a 1080x1920 one so the graphics can be previewed alone.
 * Every layer it makes is named "RS ..."; running it again offers to replace them.
 * Footage stays untouched apart from being parented to the "RS CAMERA" null.
 */
(function () {
    var PREFIX = "RS ";

    var THEME = {
        accent: [0.878, 0.992, 0.337],   // #E0FD56 lime: hero words, send icon
        white: [1, 1, 1],
        red: [0.890, 0.129, 0.169],      // #E3212B: strike, REC dot, warning icon
        cardCore: [0.690, 0.063, 0.145], // #B01025: glow in the middle of a warning card
        cardEdge: [0.098, 0.016, 0.027], // #190407: card edges
        coral: [0.706, 0.373, 0.310],    // #B45F4F: inner-voice bubble
        cream: [0.965, 0.902, 0.780],    // #F6E6C7: spotlight ring, X icon
        heroFonts: ["Inter-Black", "Inter-ExtraBold", "SFProDisplay-Heavy", "HelveticaNeue-Black", "Arial-BoldMT"],
        smallFonts: ["Inter-Bold", "SFProDisplay-Bold", "HelveticaNeue-Bold", "Arial-BoldMT"],
        uiFonts: ["Lexend-Light", "Poppins-Light", "Inter-Light", "HelveticaNeue-Light", "ArialMT"],
        heroSize: 150,    // px on a 1080-wide comp; everything scales with comp width
        smallRatio: 0.44, // lead/tail words relative to the hero size
        uiSize: 44,
        heroTracking: -25,
        smallTracking: -10
    };

    // ---------------------------------------------------------------- cue file

    function readCues(file) {
        file.encoding = "UTF-8";
        if (!file.open("r")) return null;
        var text = file.read();
        file.close();
        // Older ExtendScript has no JSON object; the cue file is the user's own local file.
        if (typeof JSON !== "undefined" && JSON.parse) return JSON.parse(text);
        return eval("(" + text + ")");
    }

    var cueFile = File.openDialog("Choose the cue file (cues.json) made by words_to_cues.py");
    if (!cueFile) return;
    var cues;
    try {
        cues = readCues(cueFile);
    } catch (e) {
        alert("Couldn't read " + cueFile.fsName + ":\n" + e.toString());
        return;
    }
    if (!cues || !cues.groups) {
        alert("That file has no \"groups\" list. Make it with words_to_cues.py.");
        return;
    }
    if (cues.theme) {
        for (var key in cues.theme) if (cues.theme.hasOwnProperty(key)) THEME[key] = cues.theme[key];
    }

    var comp = app.project.activeItem;
    var madeComp = false;
    if (!(comp instanceof CompItem)) {
        comp = app.project.items.addComp("Reel", cues.width || 1080, cues.height || 1920, 1,
                                         Math.max(cues.duration || 15, 1), cues.fps || 30);
        madeComp = true;
    }

    var W = comp.width, H = comp.height, U = W / 1080, FD = comp.frameDuration;
    var notes = [];

    // ---------------------------------------------------------------- fonts

    var missingFonts = [];
    function pickFont(list) {
        var checked = false;
        for (var i = 0; i < list.length; i++) {
            try {
                if (app.fonts && app.fonts.getFontsByPostScriptName) {
                    checked = true;
                    if (app.fonts.getFontsByPostScriptName(list[i]).length > 0) {
                        if (i > 0) missingFonts.push(list[0] + " (used " + list[i] + ")");
                        return list[i];
                    }
                }
            } catch (e) {}
        }
        if (!checked) return list[0];   // AE before 24.0 can't check; AE substitutes if missing
        missingFonts.push(list[0]);
        return list[list.length - 1];
    }
    var FONT = {
        hero: pickFont(THEME.heroFonts),
        small: pickFont(THEME.smallFonts),
        ui: pickFont(THEME.uiFonts)
    };

    // ---------------------------------------------------------------- helpers

    function snap(t) { return Math.round(t / FD) * FD; }
    function clampEnd(t) { return Math.min(t, comp.duration); }
    function rgba(c) { return [c[0], c[1], c[2], 1]; }
    function tr(layer, name) { return layer.property("ADBE Transform Group").property(name); }

    function span(layer, a, b) {
        a = Math.max(0, snap(a));
        b = clampEnd(snap(b));
        if (b <= a) b = Math.min(a + FD, comp.duration);
        layer.inPoint = a;
        layer.outPoint = b;
    }

    function easeDims(p) {
        if (p.propertyValueType === PropertyValueType.TwoD) return 2;
        if (p.propertyValueType === PropertyValueType.ThreeD) return 3;
        return 1;   // 1D and spatial properties
    }
    function easeList(p, influence) {
        var list = [];
        for (var i = 0; i < easeDims(p); i++) list.push(new KeyframeEase(0, influence));
        return list;
    }

    // keys: [[time, value], ...]. style: "settle" (fast start, long soft landing),
    // "smooth" (ease both ends), "linear", "hold".
    function animate(p, keys, style) {
        var i, k, t;
        for (i = 0; i < keys.length; i++) {
            t = snap(keys[i][0]);
            if (t < 0) continue;
            p.setValueAtTime(t, keys[i][1]);
        }
        for (i = 0; i < keys.length; i++) {
            t = snap(keys[i][0]);
            if (t < 0) continue;
            k = p.nearestKeyIndex(t);
            if (style === "hold") {
                p.setInterpolationTypeAtKey(k, KeyframeInterpolationType.HOLD, KeyframeInterpolationType.HOLD);
            } else if (style === "linear") {
                p.setInterpolationTypeAtKey(k, KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.LINEAR);
            } else if (style === "settle") {
                p.setTemporalEaseAtKey(k, easeList(p, 85), easeList(p, 12));
            } else {
                p.setTemporalEaseAtKey(k, easeList(p, 60), easeList(p, 60));
            }
        }
    }

    // Value jumps (a cut) right after the key at time t.
    function holdAfter(p, t) {
        t = snap(t);
        if (t < 0 || p.numKeys === 0) return;
        var k = p.nearestKeyIndex(t);
        p.setInterpolationTypeAtKey(k, p.keyInInterpolationType(k), KeyframeInterpolationType.HOLD);
    }

    function effect(layer, matchName) {
        return layer.property("ADBE Effect Parade").addProperty(matchName);
    }
    function addBlur(layer) {
        var fx = effect(layer, "ADBE Gaussian Blur 2");
        try { fx.property("ADBE Gaussian Blur 2-0003").setValue(1); } catch (e) {}   // repeat edge pixels
        return fx.property("ADBE Gaussian Blur 2-0001");
    }
    // A zero-distance Drop Shadow reads as a soft glow and keeps the type crisp.
    function addGlow(layer, color, softness, opacityPct, distance) {
        var fx = effect(layer, "ADBE Drop Shadow");
        fx.property("ADBE Drop Shadow-0001").setValue(rgba(color));
        fx.property("ADBE Drop Shadow-0002").setValue(opacityPct * 2.55);   // stored 0-255
        fx.property("ADBE Drop Shadow-0003").setValue(180);
        fx.property("ADBE Drop Shadow-0004").setValue(distance || 0);
        fx.property("ADBE Drop Shadow-0005").setValue(softness);
        return fx;
    }
    function addShadow(layer) { return addGlow(layer, [0, 0, 0], 14 * U, 35, 2 * U); }

    // Anchor and position on the same comp point: the layer scales/rotates around it.
    function pivot(layer, pt) {
        tr(layer, "ADBE Anchor Point").setValue(pt);
        tr(layer, "ADBE Position").setValue(pt);
    }

    function newShape(name) {
        var l = comp.layers.addShape();
        l.name = PREFIX + name;
        pivot(l, [0, 0]);   // layer space == comp space
        return l;
    }
    function addGroup(layer, name) {
        var g = layer.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
        g.name = name;
        return g;
    }
    function contents(group) { return group.property("ADBE Vectors Group"); }
    function addPath(group, verts, closed) {
        var p = contents(group).addProperty("ADBE Vector Shape - Group");
        var s = new Shape();
        s.vertices = verts;
        s.closed = closed;
        p.property("ADBE Vector Shape").setValue(s);
        return p;
    }
    function addRect(group, size, center, roundness) {
        var r = contents(group).addProperty("ADBE Vector Shape - Rect");
        r.property("ADBE Vector Rect Size").setValue(size);
        r.property("ADBE Vector Rect Position").setValue(center);
        r.property("ADBE Vector Rect Roundness").setValue(roundness || 0);
        return r;
    }
    function addEllipse(group, diameter, center) {
        var e = contents(group).addProperty("ADBE Vector Shape - Ellipse");
        e.property("ADBE Vector Ellipse Size").setValue([diameter, diameter]);
        e.property("ADBE Vector Ellipse Position").setValue(center);
        return e;
    }
    function addFill(group, color, opacity) {
        var f = contents(group).addProperty("ADBE Vector Graphic - Fill");
        f.property("ADBE Vector Fill Color").setValue(rgba(color));
        f.property("ADBE Vector Fill Opacity").setValue(opacity === undefined ? 100 : opacity);
        return f;
    }
    function addStroke(group, color, width, opacity) {
        var s = contents(group).addProperty("ADBE Vector Graphic - Stroke");
        s.property("ADBE Vector Stroke Color").setValue(rgba(color));
        s.property("ADBE Vector Stroke Width").setValue(width);
        s.property("ADBE Vector Stroke Opacity").setValue(opacity === undefined ? 100 : opacity);
        s.property("ADBE Vector Stroke Line Cap").setValue(2);    // round
        s.property("ADBE Vector Stroke Line Join").setValue(2);   // round
        return s;
    }

    function addWord(text, font, size, color, tracking, name) {
        var l = comp.layers.addText(text);
        l.name = PREFIX + name;
        var prop = l.property("ADBE Text Properties").property("ADBE Text Document");
        var doc = prop.value;
        try { doc.resetCharStyle(); doc.resetParagraphStyle(); } catch (e) {}
        doc.font = font;
        doc.fontSize = size;
        doc.applyFill = true;
        doc.fillColor = color;
        doc.applyStroke = false;
        doc.tracking = tracking;
        doc.justification = ParagraphJustification.LEFT_JUSTIFY;
        prop.setValue(doc);
        return l;
    }

    // One text layer per word so each word can land on its own beat.
    function makeRow(words, style, name) {
        var row = { layers: [], rects: [], width: 0, gap: style.size * 0.26, size: style.size };
        for (var i = 0; i < words.length; i++) {
            var l = addWord(words[i].text, style.font, style.size, style.color, style.tracking,
                            name + " " + words[i].text);
            var r = l.sourceRectAtTime(0, false);
            row.layers.push(l);
            row.rects.push(r);
            row.width += r.width + (i ? row.gap : 0);
        }
        return row;
    }
    function removeRow(row) {
        for (var i = 0; i < row.layers.length; i++) row.layers[i].remove();
    }
    // makeRow, shrunk to maxWidth if it comes out wider.
    function fitRow(words, style, maxWidth, name) {
        var row = makeRow(words, style, name);
        if (row.width <= maxWidth) return row;
        removeRow(row);
        var smaller = { font: style.font, color: style.color, tracking: style.tracking, size: style.size * maxWidth / row.width };
        return makeRow(words, smaller, name);
    }
    // Ink of the first word starts at x; all words sit on baseline y.
    function placeRow(row, x, y) {
        row.left = x;
        row.baseline = y;
        row.top = 0;
        for (var i = 0; i < row.layers.length; i++) {
            var r = row.rects[i];
            var a = [r.left + r.width / 2, r.top + r.height / 2];
            tr(row.layers[i], "ADBE Anchor Point").setValue(a);
            tr(row.layers[i], "ADBE Position").setValue([x - r.left + a[0], y + a[1]]);
            row.top = Math.min(row.top, r.top);
            x += r.width + row.gap;
        }
        row.right = x - row.gap;
        row.top += y;
    }

    // Small word: fades up out of a blur and rises a few px.
    function revealSmall(layer, t, end) {
        span(layer, t, end);
        var pos = tr(layer, "ADBE Position");
        var p = pos.value;
        animate(tr(layer, "ADBE Opacity"), [[t, 0], [t + 4 * FD, 100]], "settle");
        animate(pos, [[t, [p[0], p[1] + 12 * U]], [t + 4 * FD, [p[0], p[1]]]], "settle");
        animate(addBlur(layer), [[t, 8 * U], [t + 4 * FD, 0]], "settle");
        addShadow(layer);
    }
    // Hero word: lands big and blurred, settles to 100%. "slam" lands in one frame.
    function revealHero(layer, t, end, slam) {
        span(layer, t, end);
        if (slam) {
            animate(tr(layer, "ADBE Opacity"), [[t, 0], [t + FD, 100]], "linear");
            animate(tr(layer, "ADBE Scale"), [[t, [108, 108]], [t + 3 * FD, [100, 100]]], "settle");
        } else {
            animate(tr(layer, "ADBE Opacity"), [[t, 0], [t + 5 * FD, 100]], "settle");
            animate(tr(layer, "ADBE Scale"), [[t, [118, 118]], [t + 7 * FD, [100, 100]]], "settle");
            animate(addBlur(layer), [[t, 28 * U], [t + 6 * FD, 0]], "settle");
        }
        addGlow(layer, THEME.accent, 45 * U, 45);
        addShadow(layer);
    }
    // UI text (cards, bubble): each word pops up from below.
    function revealPop(layer, t, end, size) {
        span(layer, t, end);
        var pos = tr(layer, "ADBE Position");
        var p = pos.value;
        animate(tr(layer, "ADBE Opacity"), [[t, 0], [t + 3 * FD, 100]], "settle");
        animate(pos, [[t, [p[0], p[1] + 0.35 * size]], [t + 3 * FD, [p[0], p[1]]]], "settle");
        animate(tr(layer, "ADBE Scale"), [[t, [85, 85]], [t + 3 * FD, [100, 100]]], "settle");
    }

    // ---------------------------------------------------------------- footage + camera

    function isFootage(l) {
        if (!(l instanceof AVLayer) || l instanceof TextLayer || l instanceof ShapeLayer) return false;
        if (l.nullLayer || l.adjustmentLayer || !l.hasVideo || !l.source) return false;
        if (l.name.indexOf(PREFIX) === 0) return false;
        if (l.source instanceof FootageItem && l.source.mainSource instanceof SolidSource) return false;
        return true;
    }
    function footageAt(t) {
        for (var i = 1; i <= comp.numLayers; i++) {
            var l = comp.layer(i);
            if (isFootage(l) && l.enabled && l.inPoint <= t && t < l.outPoint) return l;
        }
        return null;
    }
    function findLayer(name) {
        for (var i = 1; i <= comp.numLayers; i++) if (comp.layer(i).name === name) return comp.layer(i);
        return null;
    }

    // Unparent footage from a previous run's camera at rest so nothing jumps.
    function releaseCamera() {
        var cam = findLayer(PREFIX + "CAMERA");
        if (!cam) return;
        var props = [tr(cam, "ADBE Position"), tr(cam, "ADBE Scale")];
        for (var i = 0; i < props.length; i++) while (props[i].numKeys > 0) props[i].removeKey(1);
        props[0].setValue([W / 2, H / 2]);
        props[1].setValue([100, 100]);
        for (var j = 1; j <= comp.numLayers; j++) {
            var l = comp.layer(j);
            if (l.parent && l.parent.index === cam.index) l.parent = null;
        }
    }

    var camera = null;
    function getCamera() {
        if (camera) return camera;
        camera = comp.layers.addNull();
        camera.name = PREFIX + "CAMERA";
        tr(camera, "ADBE Position").setValue([W / 2, H / 2]);
        var parented = 0;
        for (var i = 1; i <= comp.numLayers; i++) {
            var l = comp.layer(i);
            if (isFootage(l) && !l.parent) {
                l.parent = camera;
                parented++;
            }
        }
        if (!parented) notes.push("No footage layers found: camera moves have nothing to move yet.");
        return camera;
    }

    // ---------------------------------------------------------------- caption lockup

    function baselineFor(g, heroSize) {
        if (typeof g.y === "number") return g.y * H;
        if (g.pos === "top") return 0.19 * H;
        if (g.pos === "low") return 0.70 * H;
        return 0.55 * H + 0.25 * heroSize;
    }

    function buildCaption(g, n) {
        var tag = "cap" + n;
        var end = g.end;
        var heroStyle = {
            font: FONT.hero, color: THEME.accent, tracking: THEME.heroTracking,
            size: THEME.heroSize * U * (g.big ? 1.45 : 1)
        };
        var hero = fitRow(g.hero, heroStyle, W * (g.big ? 0.92 : 0.86), tag + " hero");
        var hs = hero.size;
        var base = baselineFor(g, hs);
        placeRow(hero, (W - hero.width) / 2, base);

        // Small lines are ~0.44x the hero, never wider than the hero.
        var smallStyle = { font: FONT.small, color: THEME.white, tracking: THEME.smallTracking, size: THEME.smallRatio * hs };
        var lead = null, top = null, tail = null, i;
        if (g.lead && g.lead.length) {
            lead = fitRow(g.lead, smallStyle, 0.9 * hero.width, tag + " lead");
            placeRow(lead, hero.left + 0.15 * hero.width, hero.top + 0.08 * hs);   // tucks into the hero's cap line
        }
        if (g.top && g.top.length) {
            top = fitRow(g.top, smallStyle, 0.6 * hero.width, tag + " top");
            var x = hero.right - 0.18 * hero.width - top.width;
            if (lead && x < lead.right + 2 * top.gap) x = lead.right + 2 * top.gap;
            if (x + top.width > W - 0.04 * W) x = hero.right - top.width;
            placeRow(top, x, hero.top + 0.08 * hs);
        }
        if (g.tail && g.tail.length) {
            tail = fitRow(g.tail, smallStyle, 0.9 * hero.width, tag + " tail");
            placeRow(tail, hero.right - 0.03 * hero.width - tail.width, base + 0.25 * hs + 0.75 * tail.size);
        }

        var rows = [[lead, g.lead], [top, g.top], [tail, g.tail]];
        for (var r = 0; r < rows.length; r++) {
            if (!rows[r][0]) continue;
            for (i = 0; i < rows[r][1].length; i++) revealSmall(rows[r][0].layers[i], rows[r][1][i].t, end);
        }
        for (i = 0; i < g.hero.length; i++) revealHero(hero.layers[i], g.hero[i].t, end, g.slam);

        if (g.strike) buildStrike(g, hero, hs, tag);
        if (g.recDot) buildRecDot(g, hero, hs, tag);
        if (g.icon && g.icon.type === "plane") buildPlane(g, hero, tail, tag);
        if (g.behind) rotoCopy(g);
    }

    function buildStrike(g, hero, hs, tag) {
        var t = g.strike.t;
        var mid = hero.baseline - 0.36 * hs;
        var pad = 0.04 * hero.width;
        var l = newShape(tag + " strike");
        var grp = addGroup(l, "line");
        addPath(grp, [[hero.left - pad, mid - 0.05 * hs], [hero.right + pad, mid + 0.12 * hs]], false);
        var trim = contents(grp).addProperty("ADBE Vector Filter - Trim");
        addStroke(grp, THEME.red, 0.055 * hs);
        animate(trim.property("ADBE Vector Trim End"), [[t, 0], [t + 6 * FD, 100]], "settle");
        addGlow(l, THEME.red, 10 * U, 30);
        span(l, t, g.end);
    }

    function buildRecDot(g, hero, hs, tag) {
        var t = g.recDot.t;
        var c = [hero.right + 0.06 * hs, hero.top + 0.12 * hs];
        var l = newShape(tag + " rec dot");
        var grp = addGroup(l, "dot");
        addEllipse(grp, 0.09 * hs, c);
        addFill(grp, THEME.red);
        pivot(l, c);
        animate(tr(l, "ADBE Scale"), [[t, [0, 0]], [t + 3 * FD, [125, 125]], [t + 5 * FD, [100, 100]]], "smooth");
        addGlow(l, THEME.red, 12 * U, 50);
        span(l, t, g.end);
    }

    // Outlined "send" glyph flies in from bottom right and lands left of the tail line.
    function buildPlane(g, hero, tail, tag) {
        var t = g.icon.t, s = 0.035 * W;
        var l = newShape(tag + " send icon");
        var grp = addGroup(l, "plane");
        addPath(grp, [[s, 0], [-s, -0.8 * s], [-0.45 * s, 0], [-s, 0.8 * s]], true);
        addPath(grp, [[-0.45 * s, 0], [0.3 * s, 0]], false);
        addStroke(grp, THEME.accent, 0.0045 * W);
        var land = tail ? [tail.left - 0.055 * W, tail.baseline - 0.35 * tail.size]
                        : [hero.left - 0.05 * W, hero.baseline];
        var tEnd = t + 0.85;
        animate(tr(l, "ADBE Position"), [[t, [0.86 * W, 0.97 * H]], [t + 0.27, [0.62 * W, 0.80 * H]],
                                         [t + 0.53, [0.38 * W, 0.74 * H]], [tEnd, land]], "smooth");
        animate(tr(l, "ADBE Rotate Z"), [[t, 215], [t + 0.53, 190], [tEnd, -20]], "smooth");
        animate(tr(l, "ADBE Scale"), [[t, [70, 70]], [tEnd, [100, 100]]], "smooth");
        addGlow(l, THEME.accent, 18 * U, 55);
        l.motionBlur = true;
        comp.motionBlur = true;
        span(l, t, g.end);
    }

    // Copy of the footage above the caption, to Roto Brush the subject so the hero word sits behind them.
    function rotoCopy(g) {
        var name = "ROTO subject " + g.start.toFixed(2);
        if (findLayer(name)) return;
        var src = footageAt(g.hero[0].t);
        if (!src) {
            notes.push("{behind} at " + g.start.toFixed(2) + "s: no footage there to copy.");
            return;
        }
        var d = src.duplicate();
        d.name = name;
        d.moveToBeginning();
        d.inPoint = Math.max(src.inPoint, snap(g.start));
        d.outPoint = Math.min(src.outPoint, clampEnd(snap(g.end)));
        notes.push("Roto Brush the person on layer \"" + name + "\" so the caption sits behind them.");
    }

    // ---------------------------------------------------------------- UI overlays

    function buildCard(g, n) {
        var tag = "card" + n;
        var cw = 0.62 * W, ch = 0.0625 * H, cx = W / 2;
        var cy = (typeof g.y === "number" ? g.y : 0.565) * H + (g.slot || 0) * 0.10 * H;
        var t0 = g.start;

        var bg = newShape(tag + " bg");
        var grp = addGroup(bg, "card");
        addRect(grp, [cw, ch], [cx, cy], 0.18 * ch);
        addFill(grp, THEME.cardEdge, 94);
        var ramp = effect(bg, "ADBE Ramp");   // red glow in the middle, dark at the ends
        ramp.property("ADBE Ramp-0001").setValue([cx, cy + 0.7 * ch]);
        ramp.property("ADBE Ramp-0002").setValue(rgba(THEME.cardCore));
        ramp.property("ADBE Ramp-0003").setValue([cx + 0.5 * cw, cy - 0.5 * ch]);
        ramp.property("ADBE Ramp-0004").setValue(rgba(THEME.cardEdge));
        ramp.property("ADBE Ramp-0005").setValue(2);   // radial
        pivot(bg, [cx, cy]);

        var edge = newShape(tag + " edge");
        var eg = addGroup(edge, "edge");
        addRect(eg, [cw, ch], [cx, cy], 0.18 * ch);
        addStroke(eg, THEME.white, 1.5 * U, 14);

        var icon = newShape(tag + " icon");
        var ix = cx - 0.42 * cw, s = 0.21 * ch, ig, bang = null;
        if (g.icon === "x") {
            var arms = [45, -45];
            for (var a = 0; a < 2; a++) {
                ig = addGroup(icon, "arm" + a);
                addRect(ig, [2.2 * s, 0.5 * s], [0, 0], 0.25 * s);
                addFill(ig, THEME.cream);
                ig.property("ADBE Vector Transform Group").property("ADBE Vector Position").setValue([ix, cy]);
                ig.property("ADBE Vector Transform Group").property("ADBE Vector Rotation").setValue(arms[a]);
            }
        } else {
            ig = addGroup(icon, "triangle");
            addPath(ig, [[ix, cy - 1.15 * s], [ix + 1.2 * s, cy + 0.95 * s], [ix - 1.2 * s, cy + 0.95 * s]], true);
            addFill(ig, THEME.red);
            bang = addWord("!", FONT.small, 1.3 * s, THEME.white, 0, tag + " icon !");
            var br = bang.sourceRectAtTime(0, false);
            tr(bang, "ADBE Position").setValue([ix - br.left - br.width / 2, cy + 0.8 * s]);
        }

        // Parent while the card is still at rest, then animate the card.
        var extras = bang ? [edge, icon, bang] : [edge, icon];
        for (var e = 0; e < extras.length; e++) {
            extras[e].parent = bg;
            span(extras[e], t0 + FD, g.end);
            animate(tr(extras[e], "ADBE Opacity"), [[t0 + FD, 0], [t0 + 3 * FD, 100]], "settle");
        }
        animate(tr(bg, "ADBE Scale"), [[t0, [70, 25]], [t0 + 3 * FD, [100, 100]]], "settle");
        animate(tr(bg, "ADBE Opacity"), [[t0, 0], [t0 + 2 * FD, 100]], "settle");
        animate(addBlur(bg), [[t0, 20 * U], [t0 + 4 * FD, 0]], "settle");
        addGlow(bg, THEME.cardCore, 30 * U, 35);
        span(bg, t0, g.end);

        var size = THEME.uiSize * U;
        var row = makeRow(g.words, { font: FONT.ui, color: THEME.white, tracking: 0, size: size }, tag + " text");
        placeRow(row, cx - row.width / 2 + 0.03 * cw, cy + 0.35 * size);
        for (var i = 0; i < g.words.length; i++) revealPop(row.layers[i], g.words[i].t, g.end, size);
    }

    // Coral chat bubble: the unspoken inner voice next to the spotlight ring.
    function buildBubble(g, n, ring) {
        var tag = "bubble" + n;
        var size = 0.026 * W;
        var row = makeRow(g.words, { font: FONT.ui, color: THEME.white, tracking: -10, size: size }, tag + " text");
        var pad = 0.6 * size, bw = row.width + 2 * pad, bh = 1.7 * size;
        var left, by;
        if (typeof g.x === "number") {
            left = g.x * W;
            by = g.y * H;
        } else if (ring) {
            left = ring.x * W + 0.27 * ring.r * W;
            by = ring.y * H - 0.78 * ring.r * W;
        } else {
            left = 0.55 * W;
            by = 0.30 * H;
        }
        left = Math.min(left, W - bw - 0.03 * W);

        var bg = newShape(tag + " bg");
        var pill = addGroup(bg, "pill");
        addRect(pill, [bw, bh], [left + bw / 2, by], bh / 2);
        addFill(pill, THEME.coral);
        var dot = addGroup(bg, "tail dot");
        addEllipse(dot, 0.3 * bh, [left - 0.05 * bh, by + 0.62 * bh]);
        addFill(dot, THEME.coral);
        pivot(bg, [left, by]);
        animate(tr(bg, "ADBE Scale"), [[g.start, [0, 100]], [g.start + 4 * FD, [100, 100]]], "settle");
        animate(tr(bg, "ADBE Opacity"), [[g.start, 0], [g.start + 2 * FD, 100]], "settle");
        addShadow(bg);
        span(bg, g.start, g.end);
        bg.moveAfter(row.layers[0]);   // pill goes under its words

        placeRow(row, left + pad, by + 0.35 * size);
        for (var i = 0; i < g.words.length; i++) revealPop(row.layers[i], g.words[i].t, g.end, size);
    }

    function buildRing(f) {
        var c = [f.x * W, f.y * H], d = 2 * f.r * W;
        var l = newShape("ring");
        var grp = addGroup(l, "ring");
        addEllipse(grp, d, c);
        addStroke(grp, THEME.cream, 5 * U);
        pivot(l, c);
        animate(tr(l, "ADBE Scale"), [[f.start, [145, 145]], [f.start + 14 * FD, [100, 100]], [f.end, [94, 94]]], "settle");
        animate(tr(l, "ADBE Opacity"), [[f.start, 0], [f.start + 3 * FD, 100]], "settle");
        addGlow(l, THEME.cream, 30 * U, 55);
        span(l, f.start, f.end);
    }

    // Camera viewfinder: corner brackets, crosshair, red dot + REC. Flickers on like a monitor.
    function buildRec(f) {
        var l = newShape("REC frame");
        var L = 0.07 * W, R = 0.93 * W, T = 0.069 * H, B = 0.927 * H, arm = 0.08 * W, cr = 0.012 * W;
        var grp = addGroup(l, "brackets");
        addPath(grp, [[L, T + arm], [L, T], [L + arm, T]], false);
        addPath(grp, [[R - arm, T], [R, T], [R, T + arm]], false);
        addPath(grp, [[L, B - arm], [L, B], [L + arm, B]], false);
        addPath(grp, [[R - arm, B], [R, B], [R, B - arm]], false);
        addPath(grp, [[R - 0.03 * W - cr, B - 0.016 * H], [R - 0.03 * W + cr, B - 0.016 * H]], false);
        addPath(grp, [[R - 0.03 * W, B - 0.016 * H - cr], [R - 0.03 * W, B - 0.016 * H + cr]], false);
        addStroke(grp, THEME.white, 2.5 * U, 85);
        var dot = addGroup(l, "dot");
        addEllipse(dot, 0.018 * W, [0.125 * W, 0.097 * H]);
        addFill(dot, THEME.red);
        var label = addWord("REC", FONT.small, 0.028 * W, THEME.white, 0, "REC label");
        tr(label, "ADBE Position").setValue([0.148 * W, 0.104 * H]);

        var flicker = [[f.start, 100], [f.start + FD, 25], [f.start + 2 * FD, 100], [f.start + 3 * FD, 25], [f.start + 4 * FD, 100]];
        var layers = [l, label];
        for (var i = 0; i < 2; i++) {
            animate(tr(layers[i], "ADBE Opacity"), flicker, "hold");
            span(layers[i], f.start, f.end);
        }
    }

    function buildTap(f) {
        var c = [f.x * W, f.y * H];
        var l = newShape("tap");
        var grp = addGroup(l, "tap");
        addEllipse(grp, 0.13 * W, c);
        addFill(grp, THEME.white);
        pivot(l, c);
        animate(tr(l, "ADBE Scale"), [[f.t, [60, 60]], [f.t + 6 * FD, [100, 100]]], "settle");
        animate(tr(l, "ADBE Opacity"), [[f.t, 0], [f.t + 2 * FD, 28], [f.t + 8 * FD, 28], [f.t + 12 * FD, 0]], "smooth");
        span(l, f.t, f.t + 12 * FD);
    }

    // ---------------------------------------------------------------- camera moves + transitions

    function adjustment(name, a, b) {
        var l = comp.layers.addSolid([1, 1, 1], PREFIX + name, W, H, 1);
        l.adjustmentLayer = true;
        span(l, a, b);
        return l;
    }

    // Shot opens punched in (from %), then pulls back to 100% as the hero word lands at t.
    function camPunch(f) {
        var sc = tr(getCamera(), "ADBE Scale");
        var t = f.t, from = f.from || 125, start = typeof f.start === "number" ? f.start : t;
        if (start - FD >= 0) {
            animate(sc, [[start - FD, [100, 100]]], "linear");
            holdAfter(sc, start - FD);
        }
        if (start < t) animate(sc, [[start, [from, from]]], "linear");
        animate(sc, [[t, [from, from]], [t + 8 * FD, [100, 100]]], "settle");
    }

    function camPush(f) {
        var sc = tr(getCamera(), "ADBE Scale"), to = f.to || 108;
        animate(sc, [[f.start, [100, 100]], [f.end, [to, to]]], "smooth");
        animate(sc, [[f.end + FD, [100, 100]]], "linear");
        holdAfter(sc, f.end);
    }

    // Cut at t hidden inside a defocus: blur up + creep in, cut, land punched-in and pull out sharp.
    function fxBlurZoom(f) {
        var t = f.t;
        var adj = adjustment("blur-zoom", t - 4 * FD, t + 11 * FD);
        animate(addBlur(adj), [[t - 3 * FD, 0], [t, 45 * U], [t + 2 * FD, 40 * U], [t + 10 * FD, 0]], "smooth");
        var sc = tr(getCamera(), "ADBE Scale");
        animate(sc, [[t - 3 * FD, [100, 100]], [t - FD, [110, 110]]], "smooth");
        holdAfter(sc, t - FD);
        animate(sc, [[t, [130, 130]], [t + 10 * FD, [100, 100]]], "settle");
    }

    // White-out with thin vertical lines; put the cut at t, the brightest frame.
    function fxFlash(f) {
        var t = f.t, a = t - 4 * FD, b = t + 6 * FD;
        var white = comp.layers.addSolid([1, 1, 1], PREFIX + "flash white", W, H, 1);
        span(white, a, b);
        animate(tr(white, "ADBE Opacity"), [[a, 0], [t, 92], [t + 5 * FD, 0]], "smooth");

        var period = 15 * U, line = 4.5 * U;
        var lines = newShape("flash lines");
        var grp = addGroup(lines, "lines");
        addRect(grp, [line, H * 1.1], [line / 2, H / 2]);
        addFill(grp, [0, 0, 0]);
        var rep = contents(grp).addProperty("ADBE Vector Filter - Repeater");
        rep.property("ADBE Vector Repeater Copies").setValue(Math.ceil(W / period) + 2);
        rep.property("ADBE Vector Repeater Transform").property("ADBE Vector Repeater Position").setValue([period, 0]);
        span(lines, a, b);
        animate(tr(lines, "ADBE Opacity"), [[a, 0], [t - 2 * FD, 70], [t, 85], [t + 5 * FD, 0]], "smooth");
    }

    // 5-frame horizontal shake with directional blur; cut on the frame after it ends.
    function fxShake(f) {
        var t = f.t;
        var pos = tr(getCamera(), "ADBE Position"), cx = W / 2, cy = H / 2;
        var offs = [[40, 8], [-34, -6], [24, 5], [-12, -2], [0, 0]];
        var keys = [[t - FD, [cx, cy]]];
        for (var i = 0; i < offs.length; i++) keys.push([t + i * FD, [cx + offs[i][0] * U, cy + offs[i][1] * U]]);
        animate(pos, keys, "linear");
        var adj = adjustment("shake blur", t, t + 5 * FD);
        var fx = effect(adj, "ADBE Motion Blur");   // Directional Blur
        fx.property("ADBE Motion Blur-0001").setValue(90);
        animate(fx.property("ADBE Motion Blur-0002"), [[t, 40 * U], [t + 2 * FD, 25 * U], [t + 4 * FD, 0]], "linear");
        for (var j = 1; j <= comp.numLayers; j++) if (isFootage(comp.layer(j))) comp.layer(j).motionBlur = true;
        comp.motionBlur = true;
    }

    // ---------------------------------------------------------------- run

    app.beginUndoGroup("Build reel style");
    try {
        var old = [];
        for (var i = 1; i <= comp.numLayers; i++) if (comp.layer(i).name.indexOf(PREFIX) === 0) old.push(comp.layer(i));
        if (old.length) {
            if (!confirm("Replace the " + old.length + " layers from the last run (named \"" + PREFIX + "...\")?")) return;
            releaseCamera();
            for (i = 0; i < old.length; i++) old[i].remove();
        }

        var fxList = cues.fx || [];
        var CAMERA_FX = { punch: 1, push: 1, blurzoom: 1, shake: 1 };
        for (i = 0; i < fxList.length; i++) if (CAMERA_FX[fxList[i].type]) getCamera();

        var built = { caption: 0, card: 0, bubble: 0 };
        for (i = 0; i < cues.groups.length; i++) {
            var g = cues.groups[i];
            if (g.kind === "caption") {
                buildCaption(g, ++built.caption);
            } else if (g.kind === "card") {
                buildCard(g, ++built.card);
            } else if (g.kind === "bubble") {
                var ring = null;
                for (var r = 0; r < fxList.length; r++) {
                    var fr = fxList[r];
                    if (fr.type === "ring" && fr.start <= g.start && g.start < fr.end) ring = fr;
                }
                buildBubble(g, ++built.bubble, ring);
            }
        }

        // Overlays first, transitions last so they sit on top of everything.
        var ORDER = ["ring", "rec", "tap", "punch", "push", "blurzoom", "flash", "shake"];
        var BUILD = { ring: buildRing, rec: buildRec, tap: buildTap, punch: camPunch, push: camPush,
                      blurzoom: fxBlurZoom, flash: fxFlash, shake: fxShake };
        for (var o = 0; o < ORDER.length; o++) {
            for (i = 0; i < fxList.length; i++) if (fxList[i].type === ORDER[o]) BUILD[ORDER[o]](fxList[i]);
        }
        for (i = 0; i < fxList.length; i++) if (!BUILD[fxList[i].type]) notes.push("Skipped unknown fx \"" + fxList[i].type + "\".");

        if (cues.duration && cues.duration > comp.duration + FD) {
            notes.push("Cues run to " + cues.duration.toFixed(2) + "s but the comp is " + comp.duration.toFixed(2) + "s long.");
        }
        if (missingFonts.length) notes.push("Missing fonts (used a fallback): " + missingFonts.join(", "));
        if (madeComp) comp.openInViewer();

        alert("Built " + built.caption + " captions, " + built.card + " cards, " + built.bubble + " bubbles, " +
              fxList.length + " fx in \"" + comp.name + "\"." + (notes.length ? "\n\n" + notes.join("\n") : ""));
    } catch (err) {
        alert("Stopped: " + err.toString() + (err.line ? " (line " + err.line + ")" : ""));
    } finally {
        app.endUndoGroup();
    }
})();
