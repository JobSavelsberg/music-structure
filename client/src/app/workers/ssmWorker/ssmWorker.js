import { PWBWorker } from "promise-worker-bi";
import * as sim from "../../similarity"

var promiseWorker = new PWBWorker();


promiseWorker.register((message) => {
    if (message.type === 'message') {
        const segmentObjects = message.message.segmentObjects;
        
        const size = segmentObjects.length;
        const ssm = new Array(size);
        for (let i = 0; i < size; i++) {
            const SegmentI = segmentObjects[i];
            ssm[i] = new Array(size - i);
            for (let j = i; j < size; j++) {
                ssm[i][j - i] = new Array(2);
                ssm[i][j - i][0] = sim.cosine(SegmentI.pitches, segmentObjects[j].pitches);
                ssm[i][j - i][1] = sim.cosine(SegmentI.timbres, segmentObjects[j].timbres);
            }
        }

        return ssm;
    }
});

