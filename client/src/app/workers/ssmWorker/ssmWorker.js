import { PWBWorker } from "promise-worker-bi";
import * as sim from "../../similarity"
import * as audioUtil from "../../audioUtil";

var promiseWorker = new PWBWorker();


promiseWorker.register((message) => {
    if (message.type === 'message') {
        const segmentObjects = message.message.segmentObjects;
        const blurTime = message.message.blurTime || 4; // in s

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

        console.log("Ehnancing SSM")
        //Forward smoothing
        const scale = 1;
        const threshold = .6;
        const hard = false;
        const processedSSM = new Array(size);
        for (let i = 0; i < size; i++) {
            processedSSM[i] = new Array(size - i);
            for (let j = i; j < size; j++) {
                processedSSM[i][j-i] = new Array(2);
                processedSSM[i][j-i][0] = 0;
                processedSSM[i][j-i][1] = 0;

                let timeLeft = blurTime
                let offset = 0;
                while(timeLeft > 0){
                    if(offset >= size-j) break;
                    let duration = segmentObjects[i+offset].duration;
                    if(duration > timeLeft){
                        duration = timeLeft;
                    }
                    processedSSM[i][j-i][0] += ssm[i+offset][j-i][0]*duration;
                    processedSSM[i][j-i][1] += ssm[i+offset][j-i][1]*duration;
                    offset++;
                    timeLeft -= duration;
                }
                processedSSM[i][j-i][0] *= scale / (blurTime - timeLeft);
                processedSSM[i][j-i][1] *= scale / (blurTime - timeLeft);
                //processedSSM[i][j-i][0] = audioUtil.logCompression(processedSSM[i][j-i][0], 10);
                //processedSSM[i][j-i][1] = audioUtil.logCompression(processedSSM[i][j-i][1], 10);
                processedSSM[i][j-i][0] = audioUtil.logCompression(Math.max(processedSSM[i][j-i][0] - threshold, 0) / (1-threshold), 10);
                processedSSM[i][j-i][1] = audioUtil.logCompression(Math.max(processedSSM[i][j-i][1] - threshold, 0) / (1-threshold), 10);
                //processedSSM[i][j-i][0] = Math.max(processedSSM[i][j-i][0] - threshold, 0) / (1-threshold);
                //processedSSM[i][j-i][1] = Math.max(processedSSM[i][j-i][1] - threshold, 0) / (1-threshold);

            }
        }

        return processedSSM;
    }
});

