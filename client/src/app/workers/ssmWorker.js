import * as log from "../../dev/log";
import * as SSM from "../SSM";
import * as pathExtraction from "../pathExtraction";
import * as scapePlot from "../scapePlot";
import Matrix from "../dataStructures/Matrix";

addEventListener("message", (event) => {
    const data = event.data;
    const sampleAmount = data.segmentStartDuration.length;
    const allPitches = data.allPitches;

    let startTime = performance.now();
    const ssm = SSM.calculateSSM(data.pitchFeatures, data.sampleDuration, allPitches, 0.4);
    log.debug("SSM Time", performance.now() - startTime);
    startTime = performance.now();
    const enhancedSSM = SSM.enhanceSSM(ssm, { blurLength: 10, tempoRatios: data.tempoRatios }, allPitches);
    log.debug("Enhance Time", performance.now() - startTime);

    startTime = performance.now();
    let transpositionInvariant = SSM.makeTranspositionInvariant(enhancedSSM);
    log.debug("makeTranspositionInvariant Time", performance.now() - startTime);

    startTime = performance.now();
    transpositionInvariant = SSM.autoThreshold(transpositionInvariant, data.thresholdPercentage);
    log.debug("autothreshold Time", performance.now() - startTime);

    const fullTranspositionInvariant = Matrix.fromHalfMatrix(transpositionInvariant);

    const scoreMatrix = pathExtraction.visualizationMatrix(fullTranspositionInvariant, sampleAmount, 50, 100);

    startTime = performance.now();
    const SP = scapePlot.create(fullTranspositionInvariant, sampleAmount, data.SPminSize, data.SPstepSize);
    log.debug("ScapePlot Time", performance.now() - startTime);

    scapePlot.sampleAnchorPoints(SP, 300, 0.1, 3);

    postMessage({
        rawSSM: ssm.getBuffer(),
        enhancedSSM: enhancedSSM.getBuffer(),
        transpositionInvariantSSM: transpositionInvariant.getBuffer(),
        scoreMatrix: scoreMatrix.getBuffer(),
        scapePlot: SP.getBuffer(),
        id: data.id,
        timestamp: new Date(),
    });
});
/*
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
        //const thresholdTranspositionInvariantSSM = SSM.threshold(transpositionInvariantSSM, data.threshold);
        const thresholdTranspositionInvariantSSM = SSM.autoThreshold(
            transpositionInvariantSSM,
            data.thresholdPercentage
        );

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
    }*/
