import * as log from "../../dev/log";
import * as structure from "../structure";
import * as SSM from "../SSM";
import * as filter from "../filter";
import * as events from "../events";
import * as noveltyDetection from "../noveltyDetection";
import * as chordDetection from "../chordDetection";
import * as audioUtil from "../audioUtil";

import * as keyDetection from "../keyDetection";

addEventListener("message", (event) => {
    const data = event.data;

    // key of entire song
    const key = keyDetection.detect(data.pitchFeatures, 0, data.pitchFeatures.length);

    // chords
    const blurredPitches = filter.gaussianBlurFeatures(data.pitchFeatures, 2);
    const chordFeatures = chordDetection.getMajorMinorChordVectors(blurredPitches);
    const maxChordFeatures = chordDetection.maxChordFeatures(chordFeatures, 2);
    const chordIndexes = chordDetection.getChordIndexes(maxChordFeatures);
    const chords = chordDetection.getChords(chordIndexes);
    chords.forEach((chord) => {
        chord.start = chord.startSample * data.sampleDuration;
        chord.end = chord.endSample * data.sampleDuration;
    });

    // tonality feature
    const smallBlurredPitch = filter.gaussianBlurFeatures(data.pitchFeatures, 15);
    const largeBlurredPitch = filter.gaussianBlurFeatures(data.pitchFeatures, 25);

    const tonalityFeature = [];
    const keyFeature = [];
    const chordFeature = [];
    for (let i = 0; i < smallBlurredPitch.length; i++) {
        tonalityFeature.push(audioUtil.tonality(smallBlurredPitch[i]));
        keyFeature.push(keyDetection.detectSingle(largeBlurredPitch[i]));
    }

    postMessage({ chords: chords, chordsVector: maxChordFeatures, key: key, tonalityFeature, keyFeature });
});
