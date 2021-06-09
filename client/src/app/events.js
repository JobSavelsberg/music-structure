import * as similarity from "./similarity";
import * as noveltyDetection from "./noveltyDetection";
import * as filter from "./filter";
import * as uniqueness from "./uniqueness";
import * as SSM from "./SSM";

import * as log from "../dev/log";

import HalfMatrix from "./dataStructures/HalfMatrix";
import * as mds from "./mds";
import lof from "lof";

export function detectAverageWindow(features, sampleDuration, windowSizeSeconds, threshold) {
    const uniquenessFeature = uniqueness.computeFromFeatures(features, sampleDuration, windowSizeSeconds);
    const events = [];
    const uniquenessSmooth = filter.gaussianBlur1D(uniquenessFeature, 2);

    const peaks = noveltyDetection.findPeaks(uniquenessSmooth);
    peaks.forEach((peak) => {
        if (peak.confidence >= threshold) {
            events.push({
                time: peak.sample * sampleDuration,
                confidence: (peak.confidence - threshold) / (1 - threshold),
                uniqueness: uniquenessFeature[peak.sample],
                timbre: features[peak.sample],
            });
        }
    });

    color(events);

    return events;
}

export function color(events) {
    const distanceMatrix = new HalfMatrix({ size: events.length, numberType: HalfMatrix.NumberType.FLOAT32 });
    distanceMatrix.fill((x, y) => {
        return similarity.euclidianTimbre(events[x].timbre, events[y].timbre);
    });
    const MdsCoordinates = mds.getMDSCoordinates(distanceMatrix);
    const MdsFeature = mds.getMDSFeature(distanceMatrix);
    events.forEach((event, index) => {
        const [angle, radius] = mds.getAngleAndRadius(MdsCoordinates[index]);
        event.colorAngle = angle;
        event.colorRadius = radius;
        event.mdsFeature = MdsFeature[index];
    });
}

export function computeEvents(features, sampleDuration, median = 1, neighbourHoodSize = 6, threshold = 0.005) {
    const events = [];

    const medianTimbre = filter.medianFilterFeatures(features, 1);
    const csFeature = colSumFeature(medianTimbre, sampleDuration);
    const difFeatureRaw = splitAverageDifferenceFeature(medianTimbre, 6);
    const colsumDiff = csFeature.map((colsumVal, index) => colsumVal * difFeatureRaw[index]);
    const eventPeaks = noveltyDetection.findPeaks(colsumDiff);

    let mean =
        colsumDiff.reduce((acc, curr) => {
            return acc + curr;
        }, 0) / colsumDiff.length;

    const squares = colsumDiff.map((k) => {
        return (k - mean) ** 2;
    });
    let squareSum = squares.reduce((acc, curr) => acc + curr, 0);

    // Returning the Standered deviation
    let sd = Math.sqrt(squareSum / squares.length);

    eventPeaks.forEach((peak) => {
        if (colsumDiff[peak.sample] >= mean + sd * 1.5) {
            events.push({
                time: peak.sample * sampleDuration,
                confidence: 1,
                uniqueness: colsumDiff[peak.sample],
                timbre: features[peak.sample],
            });
        }
    });

    color(events);
    return events;
}

export function colSumFeature(features, sampleDuration) {
    const ssmTimbre = SSM.calculateSSM(features, sampleDuration, false, 0, "euclideanTimbre");
    const colSumFeature = [];
    for (let i = 0; i < features.length; i++) {
        let colSum = 0;
        for (let j = 0; j < features.length; j++) {
            colSum += ssmTimbre.getValueNormalizedMirrored(i, j);
        }
        colSum /= features.length;
        colSumFeature.push(1 - colSum);
    }

    return colSumFeature;
}

export function splitAverageDifferenceFeature(features, size, offset = 2) {
    const [leftBlur, rightBlur] = filter.splitGaussianBlurFeatures(features, size, offset);
    const differenceFeature = [];
    for (let i = 0; i < features.length; i++) {
        const differenceLeft = 1 - similarity.cosine(features[i], leftBlur[i]);
        const differenceRight = 1 - similarity.cosine(features[i], rightBlur[i]);
        differenceFeature.push(Math.min(differenceLeft, differenceRight));
    }

    return differenceFeature;
}

export function detectLOF(features, k = 4) {
    log.debug("DetectingLOF");
    const lofFeature = [];
    for (let i = 0; i < features.length; i++) {
        let lofValue = lof(k, features, i);
        if (lofValue > 1000) {
            log.debug("lofvalue with index", i, "is", lofValue);
            lofValue = -0.1;
        }

        lofFeature.push(lofValue);
    }
    log.debug("LofFeature", lofFeature);
    return lofFeature;
}
