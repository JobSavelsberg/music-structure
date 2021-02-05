import * as similarity from "./similarity";
import * as log from "../dev/log";
const d3 = require("d3");

export const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
export const circleOfFifths = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5]; // Starting from C=0

export const colorWheel = d3
    .scaleLinear()
    .domain([
        0,
        1 / 12,
        2 / 12,
        2.8 / 12,
        3.8 / 12,
        4.3 / 12,
        5.3 / 12,
        6.8 / 12,
        8 / 12,
        8.8 / 12,
        9.3 / 12,
        10.5 / 12,
        1,
    ])
    .interpolate(d3.interpolateHcl)
    .range([
        d3.rgb("#FE0000"),
        d3.rgb("#FF7300"),
        d3.rgb("#FFAA01"),
        d3.rgb("#FFD300"),
        d3.rgb("#FFFF01"),
        d3.rgb("#9FEE00"),
        d3.rgb("#01CC00"),
        d3.rgb("#009899"),
        d3.rgb("#1241AB"),
        d3.rgb("#3914B1"),
        d3.rgb("#7209AC"),
        d3.rgb("#CD0174"),
        d3.rgb("#FE0000"),
    ]);

export const chords = {
    major: { name: "Major", weight: 1, template: [1, 0, 0, 0, 0.7, 0, 0, 0.7, 0, 0, 0, 0] },
    minor: { name: "minor", weight: 1, template: [1, 0, 0, 0.7, 0, 0, 0, 0.7, 0, 0, 0, 0] },
    sus2: { name: "Sus2", weight: 0.9, template: [1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0] },
    sus4: { name: "Sus4", weight: 0.9, template: [1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0] },
    dim: { name: "Dim", weight: 0.9, template: [1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0] },
    aug: { name: "Aug", weight: 0.9, template: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0] },
    maj7: { name: "Maj7", weight: 0.7, template: [1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1] },
    seven: { name: "7", weight: 0.7, template: [1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0] },
    min7: { name: "min7", weight: 0.7, template: [1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0] },
    min6: { name: "min6", weight: 0.7, template: [1, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0] },
    min7b5: { name: "min7/b5", weight: 0.7, template: [1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0] },
    minmaj7: { name: "minMaj7", weight: 0.7, template: [1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1] },
    sus27: { name: "Sus2/7", weight: 0.7, template: [1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1] },
    sus47: { name: "Sus4/7", weight: 0.7, template: [1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1] },
    dim6: { name: "Dim6", weight: 0.7, template: [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0] },
    maj7sharp5: { name: "Maj7/#5", weight: 0.7, template: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1] },
};
const scales = {
    major: { name: "Major", weight: 1, template: [1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1] },
    minor: { name: "minor", weight: 1, template: [1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0] },
};

const pureMajorMinor = {
    major: { name: "Major", weight: 1, template: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0] },
    minor: { name: "minor", weight: 1, template: [0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0] },
};

export const majorminor = [chords.major, chords.minor];
export const popchords = [...majorminor, chords.dim, chords.aug, chords.seven, chords.maj7, chords.min7];
export const allchords = [
    ...popchords,
    chords.sus2,
    chords.sus4,
    chords.sus27,
    chords.sus47,
    chords.min6,
    chords.min7b5,
    chords.minmaj7,
    chords.dim6,
    chords.maj7sharp5,
];

export function getConfidence(pitches, chord, bassNote) {
    if (bassNote === undefined) {
        bassNote = getBassNote(pitches);
    }
    return chord.weight * similarity.cosineTransposed(pitches, chord.template, 12 - bassNote);
}

export function getMajorMinorChordVectors(pitchFeatures) {
    const chordFeatures = [];
    pitchFeatures.forEach((pitchVector) => {
        chordFeatures.push(getMajorMinorChordVector(pitchVector));
    });
    return chordFeatures;
}

export function getMajorMinorChordVector(pitches) {
    const vector = [];
    for (let i = 0; i < 12; i++) {
        vector.push(similarity.cosineTransposed(pitches, chords.major.template, 12 - i));
    }
    for (let i = 0; i < 12; i++) {
        vector.push(similarity.cosineTransposed(pitches, chords.minor.template, 12 - i));
    }
    return vector;
}

export function maxChordFeatures(vectors, windowSize) {
    const maxChordFeatures = [];
    const vectorSize = vectors[0].length;
    const totalWindowSize = windowSize * 2 + 1;
    for (let i = 0; i < vectors.length; i++) {
        const averagedVector = new Float32Array(vectorSize);

        for (let w = -windowSize; w <= windowSize; w++) {
            if (i + w >= 0 && i + w < vectors.length) {
                const vector = vectors[i + w];
                for (let f = 0; f < vectorSize; f++) {
                    averagedVector[f] += vector[f] / totalWindowSize;
                }
            }
        }
        let max = 0;
        let maxIndex = 0;
        for (let f = 0; f < vectorSize; f++) {
            if (averagedVector[f] > max) {
                max = averagedVector[f];
                maxIndex = f;
            }
        }

        for (let f = 0; f < vectorSize; f++) {
            if (f !== maxIndex) averagedVector[f] = 0;
        }
        maxChordFeatures.push(averagedVector);
    }
    return maxChordFeatures;
}

export function getChordIndexes(maxChordFeatures) {
    const chordIndexes = [];
    for (let i = 0; i < maxChordFeatures.length; i++) {
        chordIndexes.push(maxChordFeatures[i].findIndex((val) => val !== 0));
    }
    return chordIndexes;
}

export function getChords(chordIndexes) {
    const chords = [];
    let prevChordIndex = 0;
    for (let i = 0; i < chordIndexes.length; i++) {
        const chordIndex = chordIndexes[i];
        if (chordIndex !== prevChordIndex) {
            prevChordIndex = chordIndex;
            if (chords.length > 0) chords[chords.length - 1].endSample = i;
            chords.push({
                name: getChordName(chordIndex),
                index: chordIndex,
                angle: chordAngle(chordIndex),
                startSample: i,
            });
        }
    }
    chords[chords.length - 1].endSample = chordIndexes.length;
    return chords;
}

export function chordAngle(chordIndex) {
    const posZeroEleven = chordIndex >= 12 ? (chordIndex + 3) % 12 : chordIndex;
    const angle = circleOfFifths[posZeroEleven] / 12;
    return angle;
}

var TWO_PI = 2 * Math.PI;
var OFFSET = (3 * Math.PI) / 2; // full cycle is 2pi

export function tonality(pitches) {
    let x = 0;
    let y = 0;
    let energy = 0;
    for (let i = 0; i < 12; i++) {
        const angle = (-circleOfFifths[i] / 12.0) * TWO_PI + OFFSET;
        const radius = pitches[i]; // Between 0 and 1
        energy += radius / 12;
        x += radius * Math.cos(angle);
        y += radius * Math.sin(angle);
    }

    const angle = (Math.atan2(x, y) + Math.PI) / TWO_PI;
    const radius = Math.sqrt(x * x + y * y);
    return [angle, radius, energy];
}

export function tonalVectorColor(pitches) {
    const [angle, radius, energy] = tonality(pitches);

    //const color = d3.color(d3.interpolateSinebow((angle+OFFSET)%1.0));
    const color = d3.hsl(colorWheel(angle));
    const saturation = Math.min((radius * 3) / (energy * 12), 1); // 3 because chord usually minimally 3 tones
    color.s = saturation;
    return color.hex();
}

export function getChordName(chordIndex) {
    return `${notes[chordIndex % 12]}${chordIndex >= 12 ? "m" : ""}`;
}

// Is it more Major than minor ?
export function isMajor(pitches) {
    return getConfidence(pitches, chords.major) >= getConfidence(pitches, chords.minor);
}

// Is it more minor than Major ?
export function isMinor(pitches) {
    return !isMajor(pitches);
}

export function getBassNote(pitches) {
    let maxPitch = 0;
    let maxIndex = 0;
    for (let i = 0; i < 12; i++) {
        if (pitches[i] > maxPitch) {
            maxPitch = pitches[i];
            maxIndex = i;
        }
    }
    return maxIndex;
}

export function getHighestConfidenceChord(pitches, chordSet) {
    const bassNote = getBassNote(pitches);

    let maxChord = null;
    let maxConfidence = 0;
    chordSet.forEach((chord) => {
        const confidence = getConfidence(pitches, chord, bassNote);
        if (confidence > maxConfidence) {
            maxConfidence = confidence;
            maxChord = chord;
        }
    });
    return maxChord;
}

export function getMajorMinor(pitches) {
    return getHighestConfidenceChord(pitches, majorminor);
}

export function getMajorMinorNess(pitches) {
    const majorness = getConfidence(pitches, pureMajorMinor.major);
    const minorness = getConfidence(pitches, pureMajorMinor.minor);
    return Math.max(-1, Math.min(1, (majorness - minorness) * 12));
}

export function getPopChord(pitches) {
    return getHighestConfidenceChord(pitches, popchords);
}

export function getChord(pitches) {
    return getHighestConfidenceChord(pitches, allchords);
}
