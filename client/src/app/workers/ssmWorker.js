import * as SSM from "../SSM";
import * as log from "../../dev/log";

addEventListener("message", (event) => {
    const data = event.data;
    const notifyTime = new Date() - data.timestamp;
    log.debug("Time it took to notify me", notifyTime);
    const time = performance.now();
    SSM.calculatePitchTimbreToIntArray(data.pitchFeatures, data.timbreFeatures).then((ssm) => {
        const diff = performance.now() - time;
        log.debug("workerSSM", diff);
        postMessage({ ssm: ssm.buffer, id: data.id, timestamp: new Date() });
    });
});

/**
 *         const segmentObjects = message.message.segmentObjects;
        const timeStamp = message.message.timeStamp;
        const now = new Date();
        const timeDiff = (now - timeStamp) / 1000;
        log.debug("Time diff", timeDiff);
        const blurTime = message.message.blurTime || 5; // in s

        log.debug("SSM: Calculating");
        const ssm = SSM.calculate(segmentObjects, false);
        log.debug("SSM: Enhancing");
        const enhancedSSM = SSM.enhance(segmentObjects, ssm[0], blurTime);
        log.debug("SSM: Thresholding");
        const thresholdSSM = SSM.threshold(enhancedSSM, 0.6);
        log.debug("SSM: Done!");
        return thresholdSSM;
 */
