import * as log from "../dev/log";

import * as audioUtil from "./audioUtil";

// The Krumhansl-Kessler key profiles
// Non normalized:
const majorProfileKK = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const minorProfileKK = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
const majorProfileKKNorm = [
    1,
    0.35118110236220473,
    0.5480314960629922,
    0.36692913385826775,
    0.6897637795275591,
    0.6440944881889764,
    0.39685039370078745,
    0.8173228346456693,
    0.3763779527559056,
    0.5763779527559055,
    0.36062992125984256,
    0.45354330708661417,
];
const minorProfileKKNorm = [
    1,
    0.42338072669826227,
    0.5560821484992101,
    0.8499210110584517,
    0.4107424960505529,
    0.5576619273301737,
    0.40126382306477093,
    0.7503949447077409,
    0.6287519747235387,
    0.4249605055292259,
    0.5276461295418641,
    0.5007898894154819,
];
const majorProfileKKCentered = [
    2.8674999999999993,
    -1.2525000000000004,
    -0.002500000000000391,
    -1.1525000000000003,
    0.8974999999999995,
    0.6074999999999995,
    -0.9625000000000004,
    1.7075,
    -1.0925000000000002,
    0.17749999999999977,
    -1.1925000000000003,
    -0.6025000000000005,
];
const minorProfileKKCentered = [
    2.620833333333333,
    -1.0291666666666668,
    -0.18916666666666693,
    1.670833333333333,
    -1.1091666666666669,
    -0.17916666666666714,
    -1.169166666666667,
    1.040833333333333,
    0.27083333333333304,
    -1.019166666666667,
    -0.3691666666666671,
    -0.539166666666667,
];

// Temperley key profiles
// Non normalized:
const majorProfileTemperley = [5, 2, 3.5, 2, 4.5, 4, 2, 4.5, 2, 3.5, 1.5, 4];
const minorProfileTemperley = [5, 2, 3.5, 4.5, 2, 4, 2, 4.5, 3.5, 2, 1.5, 4];
const majorProfileTemperleyNorm = [1, 0.4, 0.7, 0.4, 0.9, 0.8, 0.4, 0.9, 0.4, 0.7, 0.3, 0.8];
const minorProfileTemperleyNorm = [1, 0.4, 0.7, 0.9, 0.4, 0.8, 0.4, 0.9, 0.7, 0.4, 0.3, 0.8];
const majorProfileTemperleyCentered = [
    1.7917,
    -1.2083,
    0.2917,
    -1.2083,
    1.2917,
    0.7917,
    -1.2083,
    1.2917,
    -1.2083,
    0.2917,
    -1.7083,
    0.7917,
];
const minorProfileTemperleyCentered = [
    1.7917,
    -1.2083,
    0.2917,
    1.2917,
    -1.2083,
    0.7917,
    -1.2083,
    1.2917,
    0.2917,
    -1.2083,
    -1.7083,
    0.7917,
];

export function detect(pitchFeatures, start, end) {
    const length = end - start;
    let averagePitches = new Float32Array(12);
    for (let i = start; i < end; i++) {
        for (let p = 0; p < 12; p++) {
            averagePitches[p] += pitchFeatures[i][p] / length;
        }
    }
    const correlation = correlate(averagePitches);
    let max = Number.NEGATIVE_INFINITY;
    let maxIndex = -1;
    correlation.forEach((val, index) => {
        if (val > max) {
            max = val;
            maxIndex = index;
        }
    });
    return maxIndex;
}

export function getName(keyIndex) {
    return audioUtil.keyNames[keyIndex];
}

export function correlate(pitches) {
    const majorProfile = majorProfileTemperleyCentered;
    const minorProfile = minorProfileTemperleyCentered;

    const pitchesAverage = pitches.reduce((sum, val) => sum + val) / 12;
    const sumDistanceMajor = [];
    const sumDistanceMinor = [];
    for (let p = 0; p < 12; p++) {
        sumDistanceMajor.push(
            pitches.reduce((sum, val, i) => sum + (val - pitchesAverage) * majorProfile[(12 + i - p) % 12])
        );
        sumDistanceMinor.push(
            pitches.reduce((sum, val, i) => sum + (val - pitchesAverage) * minorProfile[(12 + i - p) % 12])
        );
    }
    const absSumDistancePitches = Math.sqrt(pitches.reduce((sum, val, i) => sum + Math.pow(val - pitchesAverage, 2)));
    const absSumDistanceMajor = Math.sqrt(majorProfile.reduce((sum, val) => sum + Math.pow(val, 2)));
    const absSumDistanceMinor = Math.sqrt(minorProfile.reduce((sum, val) => sum + Math.pow(val, 2)));

    const rMajor = [];
    const rMinor = [];
    for (let p = 0; p < 12; p++) {
        rMajor.push(sumDistanceMajor[p] / (absSumDistancePitches * absSumDistanceMajor));
        rMinor.push(sumDistanceMinor[p] / (absSumDistancePitches * absSumDistanceMinor));
    }

    return [...rMajor, ...rMinor];
}
