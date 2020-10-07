import * as sim from "./similarity";
import * as audioUtil from "./audioUtil";
import * as log from "../dev/log";

export async function calculatePitchTimbre(pitchFeatures, timbreFeatures) {
    const size = pitchFeatures.length;
    const ssm = new Array(size);
    for (let i = 0; i < size; i++) {
        const iPitchFeatures = pitchFeatures[i];
        const iTimbreFeatures = timbreFeatures[i];
        ssm[i] = new Array(size - i);
        for (let j = i; j < size; j++) {
            ssm[i][j - i] = new Array(2);
            ssm[i][j - i][0] = sim.cosine(iPitchFeatures, pitchFeatures[j]);
            ssm[i][j - i][1] = sim.cosine(iTimbreFeatures, timbreFeatures[j]);
        }
    }
    return ssm;
}

/**
 *
 * @param {number[][12]} pitchFeatures Array, whose length is the amount of samples or segments, each containing 12 pitch classes
 * @param {number[][12]} timbreFeatures Same as `pitchFeatures` but with timbre features
 * @returns {Uint8Array} Array of values [0,255] structured as a flat half ssm matrix starting at `ssm[0][0], ssm[1][0], ssm[1][1]` containing the diagonal.
 * Note that we have doubled values per cell (pitch and timbre)
 */
export async function calculatePitchTimbreToIntArray(pitchFeatures, timbreFeatures) {
    const size = pitchFeatures.length;
    const totalValues = (size * size + size) / 2; // Do count diagonal (for consistency)
    const ssm = new Uint8Array(totalValues * 2); // Times two because both pitch and timbre
    for (let i = 0; i < size; i++) {
        const iPitchFeatures = pitchFeatures[i];
        const iTimbreFeatures = timbreFeatures[i];
        const cellsBefore = i * i + i; // (i*i+i) / 2 * 2, cancels out since we have two values
        for (let j = 0; j < i + 1; j++) {
            ssm[cellsBefore + j * 2] = sim.cosine(iPitchFeatures, pitchFeatures[j]) * 255;
            ssm[cellsBefore + j * 2 + 1] = sim.cosine(iTimbreFeatures, timbreFeatures[j]) * 255;
        }
    }
    return ssm;
}

export async function calculateAllPitches(features, segmentStartDurations) {
    const size = segmentStartDurations.length;
    if (features.length != size) {
        // assume we have 2 features to calculate
    }
    const ssm = new Array(12);
    const pitchAmount = 12;
    for (let p = 0; p < pitchAmount; p++) {
        ssm[p] = new Array(size);
        for (let i = 0; i < size; i++) {
            const iFeatures = features[i];
            ssm[p][i] = new Array(size - i);
            for (let j = i; j < size; j++) {
                ssm[p][i][j - i] = new Array(2);
                ssm[p][i][j - i][0] = sim.cosine(features[i], features[j].pitchesTransposed[p]);
                ssm[p][i][j - i][1] = sim.cosine(features[i], features[j].timbresScaled);
            }
        }
    }

    return ssm;
}

export function enhance(segmentObjects, ssm, blurTime) {
    if (blurTime === 0) {
        return ssm;
    }
    //const tempoDifferences = [.66, .81, 1, 1.22, 1.5];
    const tempoDifferences = [1];
    const size = segmentObjects.length;
    const ssmCollection = [];
    for (const tempoDifference of tempoDifferences) {
        ssmCollection.push(enhanceOneDirection(segmentObjects, ssm, blurTime, 1, tempoDifference));
        ssmCollection.push(enhanceOneDirection(segmentObjects, ssm, blurTime, -1, tempoDifference));
    }

    const maxSSM = new Array(size);
    for (let i = 0; i < size; i++) {
        maxSSM[i] = new Array(size - i);
        for (let j = i; j < size; j++) {
            const ssmCollectionValuesPitch = [];
            const ssmCollectionValuesTimbre = [];
            ssmCollection.forEach((ssm) => {
                ssmCollectionValuesPitch.push(ssm[i][j - i][0]);
                ssmCollectionValuesTimbre.push(ssm[i][j - i][1]);
            });
            maxSSM[i][j - i] = new Array(2);
            maxSSM[i][j - i][0] = Math.max.apply(Math, ssmCollectionValuesPitch);
            maxSSM[i][j - i][1] = Math.max.apply(Math, ssmCollectionValuesTimbre);
        }
    }
    return maxSSM;
}

export function enhanceOneDirection(segmentObjects, ssm, blurTime, direction, tempoDifference) {
    const size = segmentObjects.length;
    const enhancedSSM = new Array(size);
    const iStart = direction > 0 ? 0 : size - 1;
    const iEnd = direction > 0 ? size : -1;
    for (let i = iStart; i !== iEnd; i += direction) {
        enhancedSSM[i] = new Array(size - i);
        const jStart = direction > 0 ? i : size - 1;
        const jEnd = direction > 0 ? size : i - 1;
        for (let j = jStart; j !== jEnd; j += direction) {
            enhancedSSM[i][j - i] = new Array(2);
            enhancedSSM[i][j - i][0] = 0;
            enhancedSSM[i][j - i][1] = 0;

            let timeLeft = blurTime;
            let scorePitch = 0;
            let scoreTimbre = 0;
            let offsetI = 0;
            let offsetJ = 0;
            let pathI = i;
            let pathJ = j;
            while (timeLeft > 0) {
                const iRemain = segmentObjects[pathI].duration - offsetI;
                const jRemain = segmentObjects[pathJ].duration * tempoDifference - offsetJ;
                const duration = Math.min(iRemain, jRemain);

                timeLeft -= duration;

                scorePitch += duration * ssm[pathI][pathJ - pathI][0];
                scoreTimbre += duration * ssm[pathI][pathJ - pathI][1];

                if (iRemain < jRemain) {
                    // Going to cell on right
                    pathI += direction;
                    if (pathI >= size || pathI < 0 || pathJ - pathI < 0) {
                        break;
                    }
                    offsetJ += iRemain;
                    offsetI = 0;
                } else if (jRemain < iRemain) {
                    // Going to cell on bottom
                    pathJ += direction;
                    if (pathJ >= size || pathJ < 0 || pathJ - pathI < 0) {
                        break;
                    }
                    offsetI += jRemain;
                    offsetJ = 0;
                } else {
                    // Going to bottom-right diagonal cell
                    pathI += direction;
                    pathJ += direction;
                    if (pathI >= size || pathJ >= size || pathI < 0 || pathJ < 0 || pathJ - pathI < 0) {
                        break;
                    }
                    offsetI = 0;
                    offsetJ = 0;
                }
            }
            enhancedSSM[i][j - i][0] = scorePitch / (blurTime - timeLeft);
            enhancedSSM[i][j - i][1] = scoreTimbre / (blurTime - timeLeft);
        }
    }
    return enhancedSSM;
}
/*
export function enhance(segmentObjects, ssm, blurTime){
    const enhancedSSMRev = new Array(size);
    for (let i = size-1; i >= 0; i--) {
        enhancedSSMRev[i] = new Array(size - i);
        for (let j = size-1; j >= i; j--) {
            enhancedSSMRev[i][j-i] = new Array(2);
            enhancedSSMRev[i][j-i][0] = 0;
            enhancedSSMRev[i][j-i][1] = 0;

            let timeLeft = blurTime 
            let scorePitch = 0
            let scoreTimbre = 0;
            let offsetI = 0
            let offsetJ = 0
            let pathI = i;
            let pathJ = j;
            while(timeLeft > 0){
                const iRemain = segmentObjects[pathI].duration - offsetI;
                const jRemain = segmentObjects[pathJ].duration - offsetJ;
                const duration = Math.min(iRemain, jRemain);

                timeLeft -= duration

                scorePitch +=  duration * ssm[pathI][pathJ-pathI][0]
                scoreTimbre +=  duration * ssm[pathI][pathJ-pathI][1]
                
                if(iRemain < jRemain){ // Going to cell on left
                    pathI--;
                    if(pathI < 0){
                        break;	
                    }
                    offsetJ += iRemain;
                    offsetI = 0;
                }else if(jRemain < iRemain){ // Going to cell on top
                    pathJ--;
                    if(pathJ < 0){
                        break;	
                    }
                    offsetI += jRemain;
                    offsetJ = 0;
                }else{ // Going to top-left diagonal cell
                    pathI+=direction; pathJ+=direction;
                    if(pathI < 0 || pathJ < 0){
                        break;	
                    }
                    offsetJ = 0;
                    offsetI = 0;
                }
            }
            enhancedSSMRev[i][j-i][0] = scorePitch / (blurTime-timeLeft)
            enhancedSSMRev[i][j-i][1] = scoreTimbre / (blurTime-timeLeft)
        }
    }

}*/

export function threshold(ssm, threshold) {
    const size = ssm.length;
    const thresholdSSM = new Array(size);
    for (let i = 0; i < size; i++) {
        thresholdSSM[i] = new Array(size - i);
        for (let j = i; j < size; j++) {
            thresholdSSM[i][j - i] = new Array(2);
            thresholdSSM[i][j - i][0] = audioUtil.logCompression(
                Math.max(ssm[i][j - i][0] - threshold, 0) / (1 - threshold),
                10
            );
            thresholdSSM[i][j - i][1] = audioUtil.logCompression(
                Math.max(ssm[i][j - i][1] - threshold, 0) / (1 - threshold),
                10
            );
        }
    }
    return thresholdSSM;
}
