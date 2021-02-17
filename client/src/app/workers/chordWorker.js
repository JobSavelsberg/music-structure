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
    const minChordDuration = 0.5;
    const blurLengthInSeconds = 0.5;
    const blurLengthInSamples = (1 / data.fastSampledPitchDuration) * blurLengthInSeconds;
    const blurredPitches = filter.gaussianBlurFeatures(data.fastSampledPitch, blurLengthInSamples);
    const chordFeatures = chordDetection.getMajorMinorChordVectors(blurredPitches);
    const maxChordFeatures = chordDetection.maxChordFeatures(chordFeatures, 2);
    const chordIndexes = chordDetection.getChordIndexes(maxChordFeatures);
    log.debug("Chord", chordIndexes);
    const medianBlurredChordIndexes = filter.maxFrequencyFilter(chordIndexes, 24, blurLengthInSamples);
    log.debug("Chord mdeian", medianBlurredChordIndexes);
    const chords = chordDetection.getChords(medianBlurredChordIndexes);
    const prunedChords = [];
    for (let i = 0; i < chords.length; i++) {
        const chord = chords[i];
        chord.start = chord.startSample * data.fastSampledPitchDuration;
        chord.end = chord.endSample * data.fastSampledPitchDuration;
        if (chord.end - chord.start < minChordDuration) {
            if (prunedChords.length > 0) {
                prunedChords[prunedChords.length - 1].endSample = chord.endSample;
                prunedChords[prunedChords.length - 1].end = chord.end;
            }
        } else {
            prunedChords.push(chord);
        }
    }

    // tonality feature
    const smallBlurredPitch = filter.gaussianBlurFeatures(data.fastSampledPitch, 2);
    const largeBlurredPitch = filter.gaussianBlurFeatures(data.fastSampledPitch, 40);

    const tonalityFeatureSmall = [];
    const tonalityFeatureLarge = [];

    const keyFeature = [];
    const chordFeature = [];
    for (let i = 0; i < smallBlurredPitch.length; i++) {
        tonalityFeatureSmall.push(audioUtil.tonality(smallBlurredPitch[i]));
        tonalityFeatureLarge.push(audioUtil.tonality(largeBlurredPitch[i]));

        keyFeature.push(keyDetection.detectSingle(largeBlurredPitch[i]));
    }

    postMessage({
        chords: prunedChords,
        chordsVector: maxChordFeatures,
        key: key,
        tonalityFeatureSmall,
        tonalityFeatureLarge,
        keyFeature,
    });
});
