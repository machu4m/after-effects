/*
 * Osamma_VT_to_AE.jsx
 *
 * Builds an After Effects project from the "Mr-osamma VT" sequence in the
 * Premiere Pro project, then saves it as an .aep next to the .prproj.
 *
 * Run in After Effects: File > Scripts > Run Script File... and pick this file.
 * Save the Premiere project first; AE reads it from disk.
 */
(function () {
    var SEQUENCE_NAME = "Mr-osamma VT";

    function findComp(folder, name) {
        for (var i = 1; i <= folder.numItems; i++) {
            var item = folder.item(i);
            if (item instanceof CompItem && item.name === name) return item;
            if (item instanceof FolderItem) {
                var found = findComp(item, name);
                if (found) return found;
            }
        }
        return null;
    }

    // Camera audio (A1) comes from the same files as the V1 picture; the iPhone
    // voice on A2 is a separate file. Silence anything sourced from a picture file.
    function muteCameraAudio(comp) {
        var pictureSources = {};
        var i, layer;
        for (i = 1; i <= comp.numLayers; i++) {
            layer = comp.layer(i);
            if (layer.source && layer.hasVideo && layer.enabled) pictureSources[layer.source.id] = true;
        }
        var muted = 0;
        for (i = 1; i <= comp.numLayers; i++) {
            layer = comp.layer(i);
            if (layer.hasAudio && layer.source && pictureSources[layer.source.id] && layer.audioEnabled) {
                layer.audioEnabled = false;
                muted++;
            }
        }
        return muted;
    }

    var prproj = File.openDialog("Select the Premiere Pro project that contains \"" + SEQUENCE_NAME + "\"", "*.prproj");
    if (!prproj) return;

    var io = new ImportOptions(prproj);
    if (!io.canImportAs(ImportAsType.PROJECT)) {
        alert("After Effects can't import this file as a Premiere project:\n" + prproj.fsName);
        return;
    }
    io.importAs = ImportAsType.PROJECT;

    app.beginUndoGroup("Import " + SEQUENCE_NAME);
    var imported = app.project.importFile(io);
    var comp = findComp(imported instanceof FolderItem ? imported : app.project.rootFolder, SEQUENCE_NAME);
    if (!comp) {
        app.endUndoGroup();
        alert("Imported the project, but found no sequence called \"" + SEQUENCE_NAME + "\".\n" +
              "Check the sequence name in Premiere and edit SEQUENCE_NAME at the top of this script.");
        return;
    }
    var muted = muteCameraAudio(comp);
    app.endUndoGroup();

    var aep = new File(prproj.path + "/" + prproj.name.replace(/\.prproj$/i, "") + "_Osamma_VT.aep");
    app.project.save(aep);
    comp.openInViewer();

    alert("Done.\n\nComp: " + comp.name + " (" + comp.numLayers + " layers, " +
          comp.duration.toFixed(1) + " s)\nCamera-audio layers muted: " + muted +
          "\nSaved: " + aep.fsName);
})();
