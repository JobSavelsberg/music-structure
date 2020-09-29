import * as sim from "./similarity"
import * as audioUtil from "./audioUtil";

export function calculate(segmentObjects){
    const size = segmentObjects.length;
    const ssm = new Array(size);

    for (let i = 0; i < size; i++) {
        const SegmentI = segmentObjects[i];
        ssm[i] = new Array(size - i);
        for (let j = i; j < size; j++) {
            ssm[i][j - i] = new Array(2);
            ssm[i][j - i][0] = sim.cosine(SegmentI.pitches, segmentObjects[j].pitches);
            ssm[i][j - i][1] = sim.cosine(SegmentI.timbresScaled, segmentObjects[j].timbresScaled);
        }
    }
    return ssm;
}

export function enhance(segmentObjects, ssm, blurTime){
    const size = segmentObjects.length;
    const enhancedSSM = new Array(size);
    for (let i = 0; i < size; i++) {
        enhancedSSM[i] = new Array(size - i);
        for (let j = i; j < size; j++) {
            enhancedSSM[i][j-i] = new Array(2);
            enhancedSSM[i][j-i][0] = 0;
            enhancedSSM[i][j-i][1] = 0;

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
                
                if(iRemain < jRemain){ // Going to cell on right
                    pathI++;
                    if(pathI >= size){
                        break;	
                    }
                    offsetJ += iRemain;
                    offsetI = 0;
                }else if(jRemain < iRemain){ // Going to cell on bottom
                    pathJ++;
                    if(pathJ >= size){
                        break;	
                    }
                    offsetI += jRemain;
                    offsetJ = 0;
                }else{ // Going to bottom-right diagonal cell
                    pathI++; pathJ++;
                    if(pathI >= size || pathJ >= size){
                        break;	
                    }
                    offsetI = 0;
                    offsetJ = 0;
                }
            }
            enhancedSSM[i][j-i][0] = scorePitch / (blurTime-timeLeft)
            enhancedSSM[i][j-i][1] = scoreTimbre / (blurTime-timeLeft)
        }
    }
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
                    pathI--; pathJ--;
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
    const maxSSM = new Array(size);
    for (let i = 0; i < size; i++) {
        maxSSM[i] = new Array(size - i);
        for (let j = i; j < size; j++) {
            maxSSM[i][j-i] = new Array(2);
            maxSSM[i][j-i][0] = Math.max(enhancedSSM[i][j-i][0], enhancedSSMRev[i][j-i][0]);
            maxSSM[i][j-i][1] = Math.max(enhancedSSM[i][j-i][1], enhancedSSMRev[i][j-i][1]);
        }
    }
    return maxSSM;
}

export function enhanceOld(segmentObjects, ssm, blurTime){
    const size = segmentObjects.length;
    const enhancedSSM = new Array(size);
    for (let i = 0; i < size; i++) {
        enhancedSSM[i] = new Array(size - i);
        for (let j = i; j < size; j++) {
            enhancedSSM[i][j-i] = new Array(2);
            enhancedSSM[i][j-i][0] = 0;
            enhancedSSM[i][j-i][1] = 0;
            let timeLeft = blurTime
            let offset = 0;
            while(timeLeft > 0){
                if(offset >= size-j) break;
                let duration = segmentObjects[j+offset].duration;
                if(duration > timeLeft){
                    duration = timeLeft;
                }
                enhancedSSM[i][j-i][0] += ssm[i+offset][j+offset-(i+offset)][0]*duration;
                enhancedSSM[i][j-i][1] += ssm[i+offset][j+offset-(i+offset)][1]*duration;
                offset++;
                timeLeft -= duration;
            }
            enhancedSSM[i][j-i][0] *= 1 / (blurTime - timeLeft);
            enhancedSSM[i][j-i][1] *= 1 / (blurTime - timeLeft);  
        }
    }
    return enhancedSSM;
}

export function enhanceNew(segmentObjects, ssm, blurTime){
    const size = segmentObjects.length;
    const enhancedSSM = new Array(size);
    for (let i = 0; i < size; i++) {
        enhancedSSM[i] = new Array(size - i);
        for (let j = i; j < size; j++) {
            enhancedSSM[i][j-i] = new Array(2);
            enhancedSSM[i][j-i][0] = 0;
            enhancedSSM[i][j-i][1] = 0;

            let timeLeft = blurTime 
            let scorePitch = 0
            let scoreTimbre = 0;
            let offsetI = 0
            let offsetJ = 0
            let pathI = i;
            let pathJ = j;
            while(timeLeft > 0){
                const width = segmentObjects[pathI].duration;
                const height = segmentObjects[pathJ].duration;
                const widthLeft = width - offsetI;
                const heightLeft = height - offsetJ;
                const duration = Math.min(widthLeft, heightLeft);

                if(duration >= timeLeft){
                    scorePitch += timeLeft * ssm[pathI][pathJ-pathI][0];
                    scoreTimbre += timeLeft * ssm[pathI][pathJ-pathI][1];
                    timeLeft = 0;
                    break;
                }

                scorePitch += duration * ssm[pathI][pathJ-pathI][0];
                scoreTimbre += duration * ssm[pathI][pathJ-pathI][1];
                timeLeft -= duration;

                if(heightLeft > widthLeft){ // go to right
                    pathI++;
                    if(pathI >= size){
                        break;
                    }
                    offsetI += widthLeft;
                    offsetJ = 0;
                }else if(widthLeft > heightLeft){ // go to bottom

                }else if(heightLeft === widthLeft){ // go diagonally

                }


            }
            enhancedSSM[i][j-i][0] = scorePitch / (blurTime-timeLeft)
            enhancedSSM[i][j-i][1] = scoreTimbre / (blurTime-timeLeft)
        }
    }
}

export function threshold(ssm, threshold){
    const size = ssm.length;
    const thresholdSSM = new Array(size);
    for (let i = 0; i < size; i++) {
        thresholdSSM[i] = new Array(size - i);
        for (let j = i; j < size; j++) {
            thresholdSSM[i][j-i] = new Array(2);
            thresholdSSM[i][j-i][0] = audioUtil.logCompression(Math.max(ssm[i][j-i][0] - threshold, 0) / (1-threshold), 10);
            thresholdSSM[i][j-i][1] = audioUtil.logCompression(Math.max(ssm[i][j-i][1] - threshold, 0) / (1-threshold), 10);
        }
    }
    return thresholdSSM;
}