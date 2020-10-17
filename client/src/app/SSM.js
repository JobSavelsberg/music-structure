import * as sim from "./similarity";
import * as audioUtil from "./audioUtil";
import * as log from "../dev/log";

/**
 *
 * @param {number[][12]} pitchFeatures Array, whose length is the amount of samples or segments, each containing 12 pitch classes
 * @param {number[][12]} timbreFeatures Same as `pitchFeatures` but with timbre features
 * @returns {Uint8Array} Array of values [0,255] structured as a flat half ssm matrix starting at `ssm[0][0], ssm[1][0], ssm[1][1]` containing the diagonal.
 * Note that we have doubled values per cell (pitch and timbre)
 */

export function calculatePitchTimbreSSM(pitchFeatures, timbreFeatures) {
    const size = pitchFeatures.length;
    const totalValues = (size * size + size) / 2; // Do count diagonal (for consistency)
    const ssm = new Uint8Array(totalValues * 2); // Times two because both pitch and timbre
    for (let i = 0; i < size; i++) {
        const iPitchFeatures = pitchFeatures[i];
        const iTimbreFeatures = timbreFeatures[i];
        const cellsBefore = i * i + i; // (i*i+i) / 2 * 2, cancels out since we have two values
        for (let j = 0; j < i + 1; j++) {
            ssm[cellsBefore + j * 2] = Math.pow(sim.cosine(iPitchFeatures, pitchFeatures[j]), 3) * 255;
            ssm[cellsBefore + j * 2 + 1] = Math.pow((sim.cosine(iTimbreFeatures, timbreFeatures[j]) + 1) / 2, 3) * 255;
        }
    }
    return ssm;
}

export function seePitchDifference(ssmAllPitches, pitch) {
    const size = ssmAllPitches.length / 13;
    const ssm = new Uint8Array(size * 2); // selected pitch and timbre
    for (let i = 0; i < size; i++) {
        ssm[i * 2] = ssmAllPitches[i * 13 + pitch];
        ssm[i * 2 + 1] = ssmAllPitches[i * 13 + 12];
    }
    return ssm;
}

/**
 *
 * @param {*} features
 * @param {*} segmentStartDurations
 * @returns ssm with every cell containing 13 values: 12 pitches and 1 timbre
 */
export function calculateAllPitchTimbreSSM(pitchFeatures, timbreFeatures) {
    const size = pitchFeatures.length;
    const totalValues = (size * size + size) / 2; // Do count diagonal (for consistency)
    const ssmAllPitches = new Uint8Array(totalValues * 13);
    for (let i = 0; i < size; i++) {
        const iPitchFeatures = pitchFeatures[i];
        const iTimbreFeatures = timbreFeatures[i];
        const cellsBefore = ((i * i + i) / 2) * 13;
        for (let j = 0; j < i + 1; j++) {
            for (let p = 0; p < 12; p++) {
                ssmAllPitches[cellsBefore + j * 13 + p] =
                    Math.pow(sim.cosineTransposed(iPitchFeatures, pitchFeatures[j], p), 3) * 255;
            }
            ssmAllPitches[cellsBefore + j * 13 + 12] =
                Math.pow((sim.cosine(iTimbreFeatures, timbreFeatures[j]) + 1) / 2, 3) * 255; // +1 becasue timbres are [-1,1]
        }
    }
    return ssmAllPitches;
}

export function calculateTranspositionInvariant(ssmAllPitches) {
    const cells = ssmAllPitches.length / 13;
    const size = cells * 2; // pitch and timbre
    const transpositionInvariantSSM = new Uint8Array(size);
    const intervalSSM = new Uint8Array(size);
    for (let i = 0; i < size; i++) {
        let max = 0;
        let maxPitch = -1;
        for (let p = 0; p < 12; p++) {
            const value = ssmAllPitches[i * 13 + p];
            if (value > max) {
                max = value;
                maxPitch = p;
            }
        }
        transpositionInvariantSSM[i * 2] = max;
        intervalSSM[i] = maxPitch;
        transpositionInvariantSSM[i * 2 + 1] = ssmAllPitches[i * 13 + 12];
    }

    return { transpositionInvariantSSM, intervalSSM };
}

export function enhance(segmentStartDuration, ssm, blurTime, tempoRatios = [1], allPitches = false) {
    log.debug("enhancing allpitches: ", allPitches);
    if (blurTime === 0) {
        return ssm;
    }
    const ssmCollection = [];
    for (const tempoRatio of tempoRatios) {
        ssmCollection.push(enhanceOneDirection(segmentStartDuration, ssm, blurTime, 1, tempoRatio, allPitches));
        ssmCollection.push(enhanceOneDirection(segmentStartDuration, ssm, blurTime, -1, tempoRatio, allPitches));
    }

    const maxSSM = new Uint8Array(ssm.length);
    for (let i = 0; i < ssm.length; i++) {
        maxSSM[i] = 0;
        for (let j = 0; j < ssmCollection.length; j++) {
            const value = ssmCollection[j][i];
            if (value > maxSSM[i]) {
                maxSSM[i] = value;
            }
        }
    }
    return maxSSM;
}

/**
 * Defined as
 *      |\
 *   y  | \
 *      |__\
 *        x
 * @param {*} segmentStartDuration
 * @param {*} ssm
 * @param {*} blurTime
 * @param {*} direction
 * @param {*} tempoRatio
 */

export function enhanceOneDirection(segmentStartDuration, ssm, blurTime, direction, tempoRatio, allPitches) {
    const size = segmentStartDuration.length;
    const features = allPitches ? 13 : 2;
    log.debug(
        "size",
        size,
        "blurTime",
        blurTime,
        "direction",
        direction,
        "tempoRatio",
        tempoRatio,
        "allPitches",
        allPitches
    );
    const enhancedSSM = new Uint8Array(ssm.length);
    const yStart = direction > 0 ? 0 : size - 1;
    const yEnd = direction > 0 ? size : -1;

    for (let y = yStart; y !== yEnd; y += direction) {
        const cellsBefore = ((y * y + y) / 2) * features; // (y*y+y) / 2 * 2, cancels out since we have two values
        const xStart = direction > 0 ? 0 : y;
        const xEnd = direction > 0 ? y + 1 : -1;
        for (let x = xStart; x !== xEnd; x += direction) {
            let timeLeft = blurTime;
            let scorePitch = new Array(features - 1).fill(0);
            let scoreTimbre = 0;
            let offsetY = 0;
            let offsetX = 0;
            let pathY = y;
            let pathX = x;
            while (timeLeft > 0) {
                const yRemain = segmentStartDuration[pathY][1] - offsetY; // [1] is duration
                const xRemain = segmentStartDuration[pathX][1] * tempoRatio - offsetX;
                let duration = Math.min(yRemain, xRemain);

                if (timeLeft < duration) {
                    duration = timeLeft;
                }

                timeLeft -= duration;

                let pathCellsBefore = ((pathY * pathY + pathY) / 2) * features;

                for (let p = 0; p < features - 1; p++) {
                    scorePitch[p] += duration * ssm[pathCellsBefore + pathX * features + p];
                }

                scoreTimbre += duration * ssm[pathCellsBefore + pathX * features + features - 1];

                if (xRemain < yRemain) {
                    // Going to cell on right
                    pathX += direction;
                    if (pathX >= size || pathX < 0 || pathX > pathY) {
                        break;
                    }
                    offsetX = 0;
                    offsetY += xRemain;
                } else if (yRemain < xRemain) {
                    // Going to cell on bottom
                    pathY += direction;
                    if (pathY >= size || pathY < 0 || pathX > pathY) {
                        break;
                    }
                    offsetY = 0;
                    offsetX += yRemain;
                } else {
                    // Going to bottom-right diagonal cell
                    pathX += direction;
                    pathY += direction;
                    if (pathY >= size || pathX >= size || pathY < 0 || pathX < 0 || pathX > pathY) {
                        break;
                    }
                    offsetY = 0;
                    offsetX = 0;
                }
            }
            for (let p = 0; p < features - 1; p++) {
                enhancedSSM[cellsBefore + x * features + p] = scorePitch[p] / (blurTime - timeLeft);
            }
            enhancedSSM[cellsBefore + x * features + features - 1] = scoreTimbre / (blurTime - timeLeft);
        }
    }
    return enhancedSSM;
}

export function threshold(ssm, threshold) {
    const thresholdSSM = new Uint8Array(ssm.length);
    for (let i = 0; i < ssm.length; i++) {
        thresholdSSM[i] = Math.min(Math.max(ssm[i] / 255.0 - threshold, 0) / (1 - threshold), 1) * 255;
    }
    return thresholdSSM;
}

export function penalizeThreshold(ssm, threshold) {
    const thresholdSSM = new Int16Array(ssm.length);
    for (let i = 0; i < ssm.length; i++) {
        thresholdSSM[i] = Math.min(Math.max(ssm[i] / 255.0 - threshold, 0) / (1 - threshold), 1) * 255;
    }
    return thresholdSSM;
}

export function getFullPitchSSM(ssm, sampleAmount) {
    const fullSSM = new Uint8Array(sampleAmount * sampleAmount);

    for (let y = 0; y < sampleAmount; y++) {
        const cellsBefore = y * y - y;
        for (let x = 0; x <= y; x++) {
            const value = ssm[cellsBefore + x * 2];
            fullSSM[y * sampleAmount + x] = value;
            fullSSM[x * sampleAmount + y] = value;
        }
    }
    return fullSSM;
}
