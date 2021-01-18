import * as similarity from "./similarity";
import * as noveltyDetection from "./noveltyDetection";
import * as filter from "./filter";
import * as uniqueness from "./uniqueness";

import * as log from "../dev/log";

import HalfMatrix from "./dataStructures/HalfMatrix";
import * as mds from "./mds";

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
        return similarity.cosine(events[x].timbre, events[y].timbre);
    });
    const MdsCoordinates = mds.getMdsCoordinatesWithGradientDescent(distanceMatrix);
    const MdsFeature = mds.getMDSFeatureWithGradientDescent(distanceMatrix);
    events.forEach((event, index) => {
        const [angle, radius] = mds.getAngleAndRadius(MdsCoordinates[index]);
        event.colorAngle = angle;
        event.colorRadius = radius;
        event.mdsFeature = MdsFeature[index];
    });
}
