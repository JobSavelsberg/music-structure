import * as SSM from "../SSM";
import * as log from "../../dev/log";
import { debuglog } from "util";

addEventListener("message", (event) => {
    const data = event.data;
    log.debug(data);

    const notifyTime = new Date() - data.timestamp;
    log.debug("Time it took to notify me", notifyTime);
    const ssmtime = performance.now();
    SSM.calculatePitchTimbreToIntArray(data.pitchFeatures, data.timbreFeatures).then((ssm) => {
        const diff = performance.now() - ssmtime;
        log.debug("SSM calculate time", diff);
        let time = performance.now();
        const enhancedSSM = SSM.enhanceIntArray(data.segmentStartDuration, ssm, data.blurTime);
        log.debug("SSM enhance time", performance.now() - time);
        const thresholdSSM = SSM.thresholdIntArray(enhancedSSM, data.threshold);

        postMessage({ ssm: thresholdSSM.buffer, id: data.id, timestamp: new Date() });
    });
});
