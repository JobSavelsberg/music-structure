import * as log from "../../dev/log";
import * as structure from "../structure";
import * as SSM from "../SSM";
import * as filter from "../filter";
import * as events from "../events";
import * as noveltyDetection from "../noveltyDetection";
import * as chordDetection from "../chordDetection";

addEventListener("message", (event) => {
    const data = event.data;

    const blurredPitches = filter.gaussianBlurFeatures(data.pitchFeatures, 1);
    const chordFeatures = chordDetection.getMajorMinorChordVectors(blurredPitches);
    const maxChordFeatures = chordDetection.maxChordFeatures(chordFeatures, 1);
    const chordIndexes = chordDetection.getChordIndexes(maxChordFeatures);
    const chords = chordDetection.getChords(chordIndexes);
    chords.forEach((chord) => {
        chord.start = chord.startSample * data.sampleDuration;
        chord.end = chord.endSample * data.sampleDuration;
    });
    postMessage({ chords: chords, chordsVector: maxChordFeatures });
});
