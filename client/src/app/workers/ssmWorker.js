import * as log from "../../dev/log";
import * as SSM from "../SSM";
addEventListener("message", (event) => {
    const data = event.data;
    log.debug(data);
    const notifyTime = new Date() - data.timestamp;
    log.debug("Time it took to notify me", notifyTime);
    const ssmtime = performance.now();
    if (data.allPitches) {
        log.debug("Doing all pitches");
        const ssmAllPitches = SSM.calculateAllPitchTimbreSSM(data.pitchFeatures, data.timbreFeatures);
        const rawSSM0 = SSM.seePitchDifference(ssmAllPitches, 0);
        const ssmAllPitchesEnhanced = SSM.enhance(
            data.segmentStartDuration,
            ssmAllPitches,
            data.blurTime,
            data.tempoRatios,
            true
        );

        const { transpositionInvariantSSM, pitchValueSSM } = SSM.calculateTranspositionInvariant(ssmAllPitchesEnhanced);
        const thresholdSSM = SSM.threshold(transpositionInvariantSSM, data.threshold);
        postMessage({
            rawSSM: rawSSM0.buffer,
            enhancedSSM: thresholdSSM.buffer,
            id: data.id,
            timestamp: new Date(),
        });
    } else {
        const ssm = SSM.calculatePitchTimbreSSM(data.pitchFeatures, data.timbreFeatures);
        const diff = performance.now() - ssmtime;
        log.debug("SSM calculate time", diff);
        let time = performance.now();
        const enhancedSSM = SSM.enhance(data.segmentStartDuration, ssm, data.blurTime, data.tempoRatios);
        log.debug("SSM enhance time", performance.now() - time);
        const thresholdSSM = SSM.threshold(enhancedSSM, data.threshold);
        postMessage({ rawSSM: ssm.buffer, enhancedSSM: thresholdSSM.buffer, id: data.id, timestamp: new Date() });
    }
});
