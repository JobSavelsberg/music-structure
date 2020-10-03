import { PWBWorker } from "promise-worker-bi";
import * as SSM from "../../SSM";

var promiseWorker = new PWBWorker();

promiseWorker.register((message) => {
    if (message.type === "message") {
        const segmentObjects = message.message.segmentObjects;
        const blurTime = message.message.blurTime || 5; // in s
        console.log("SSM: Calculating");
        const ssm = SSM.calculate(segmentObjects, false);
        console.log("SSM: Enhancing");
        const enhancedSSM = SSM.enhance(segmentObjects, ssm[0], blurTime);
        console.log("SSM: Thresholding");
        const thresholdSSM = SSM.threshold(enhancedSSM, 0.6);
        console.log("SSM: Done!");
        return thresholdSSM;
    }
});
