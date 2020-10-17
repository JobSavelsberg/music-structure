import * as log from "../../dev/log";
import * as SSM from "../SSM";
import * as pathExtraction from "../pathExtraction";
import * as scapePlot from "../scapePlot";

addEventListener("message", (event) => {
    const data = event.data;
    log.debug(data);
    const notifyTime = new Date() - data.timestamp;
    const sampleAmount = data.segmentStartDuration.length;
    log.debug("Time it took to notify me", notifyTime);
    const ssmtime = performance.now();
    if (data.allPitches) {
        log.debug("Doing all pitches");
        const ssmAllPitches = SSM.calculateAllPitchTimbreSSM(data.pitchFeatures, data.timbreFeatures);
        const rawSSM = SSM.seePitchDifference(ssmAllPitches, 0);
        const ssmAllPitchesEnhanced = SSM.enhance(
            data.segmentStartDuration,
            ssmAllPitches,
            data.blurTime,
            data.tempoRatios,
            true
        );
        const enhancedSSM = SSM.threshold(SSM.seePitchDifference(ssmAllPitchesEnhanced, 0), data.threshold);

        const { transpositionInvariantSSM, intervalSSM } = SSM.calculateTranspositionInvariant(ssmAllPitchesEnhanced);
        const thresholdTranspositionInvariantSSM = SSM.threshold(transpositionInvariantSSM, data.threshold);
        //const penalizedTranspositionInvariantSSM = SSM.penalizeThreshold(transpositionInvariantSSM, data.threshold);
        const pitchSSM = SSM.getFullPitchSSM(thresholdTranspositionInvariantSSM, sampleAmount);
        const dtwTime = performance.now();
        const scoreMatrix = pathExtraction.calculateAccumulatedScoreMatrix(pitchSSM, sampleAmount, 50, 100);
        const { paths, normalizedScore, normalizedCoverage, fitness } = pathExtraction.backtracking(
            scoreMatrix,
            sampleAmount
        );
        log.debug("Time it took to calculate dtw", performance.now() - dtwTime);
        const combinedDTWMatrix = pathExtraction.combine(pitchSSM, scoreMatrix, paths, sampleAmount, 50, 100);
        const SP = scapePlot.create(pitchSSM, sampleAmount, data.SPminSize, data.SPstepSize);

        postMessage({
            rawSSM: rawSSM.buffer,
            enhancedSSM: enhancedSSM.buffer,
            transpositionInvariantSSM: thresholdTranspositionInvariantSSM,
            intervalSSM: intervalSSM,
            scoreMatrix: combinedDTWMatrix.buffer,
            scapePlot: SP.buffer,
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
