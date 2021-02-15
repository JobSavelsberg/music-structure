import * as log from "../dev/log";
import * as noveltyDetection from "./noveltyDetection";
import * as filter from "./filter";

export function findHomogenousSections(ssm) {
    const size = ssm.getSize();
    const homogenousFiltered = new Float32Array(size);
    const padding = 0; // make up for lost edge of enhancing matrix

    const [homogenousScore, homogenousLength] = homogenousFeature(ssm);
    for (let i = 0; i < size; i++) {
        const normalizedHomogenousScore = homogenousScore[i] / homogenousLength[i];
        if (homogenousLength[i] > 4 && normalizedHomogenousScore > 0.75) {
            homogenousFiltered[i] = homogenousLength[i]; //homogenousScore[i];
        }
    }

    const blurHomogenous = filter.gaussianBlur1D(homogenousFiltered, 4);
    const peaks = noveltyDetection.findPeaks(blurHomogenous);

    const testSections = new Float32Array(size);

    // Detects start as first peak so skip it
    for (let p = 1; p < peaks.length; p++) {
        const sectionSize = homogenousLength[peaks[p].sample] + padding;
        const sectionStart = peaks[p].sample - sectionSize;
        const sectionEnd = peaks[p].sample + sectionSize;
        for (let i = sectionStart; i < sectionEnd; i++) {
            testSections[i] = 1;
        }
    }

    log.debug(peaks);
    return testSections;
}

export function homogenousFeature(ssm) {
    const size = ssm.getSize();
    const homogenousScore = new Float32Array(size);
    const homogenousLength = new Int32Array(size);
    const maxSize = size / 2;
    const stopThreshold = 0.2;

    for (let i = 0; i < size; i++) {
        let prevValue = 1;
        homogenousScore[i] = 0;
        for (let o = 0; o <= maxSize; o++) {
            if (o === maxSize) {
                homogenousLength[i] = o;
                break;
            }
            if (i - o >= 0 && i + o < size) {
                const value = ssm.getValueNormalized(i - o, i + o);
                if (value <= stopThreshold) {
                    homogenousLength[i] = o;
                    break;
                }

                let derivative = value - prevValue;
                prevValue = value;
                homogenousScore[i] += 1 - Math.abs(derivative);
            } else {
                homogenousLength[i] = o;
                break;
            }
        }
    }

    return [homogenousScore, homogenousLength];
}
