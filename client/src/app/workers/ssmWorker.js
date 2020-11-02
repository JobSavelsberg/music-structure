import * as log from "../../dev/log";
import * as SSM from "../SSM";
import * as pathExtraction from "../pathExtraction";
import * as noveltyDetection from "../noveltyDetection";

import * as scapePlot from "../scapePlot";
import Matrix from "../dataStructures/Matrix";

addEventListener("message", (event) => {
    const data = event.data;
    const sampleAmount = data.segmentStartDuration.length;
    const allPitches = data.allPitches;

    // Calculate raw SSM: pitchSSM with 12 pitches, timbreSSM
    let startTime = performance.now();
    const ssmPitch = SSM.calculateSSM(data.pitchFeatures, data.sampleDuration, allPitches, 0.4);
    const ssmTimbre = SSM.calculateSSM(data.timbreFeatures, data.sampleDuration, false, 0.4);
    log.debug("SSM Time", performance.now() - startTime);

    const ssmPitchSinglePitch = ssmPitch.getFirstFeatureMatrix();

    const noveltySmall = noveltyDetection.detect(ssmPitchSinglePitch, 5);
    const noveltyMedium = noveltyDetection.detect(ssmPitchSinglePitch, 15);
    const noveltyLarge = noveltyDetection.detect(ssmPitchSinglePitch, 40);

    const ssmTimbrePitch = Matrix.combine(ssmPitch, ssmTimbre);

    // Enhance pitch SSM, diagonal smoothing, still contains 12 pitches
    startTime = performance.now();
    const enhancedSSM = SSM.enhanceSSM(ssmPitch, { blurLength: 10, tempoRatios: data.tempoRatios }, allPitches);
    log.debug("Enhance Time", performance.now() - startTime);

    // Make transposition invariant; take max of all pitches
    startTime = performance.now();
    let transpositionInvariant = SSM.makeTranspositionInvariant(enhancedSSM);
    log.debug("makeTranspositionInvariant Time", performance.now() - startTime);

    // Threshold the ssm to only show important paths
    startTime = performance.now();
    transpositionInvariant = SSM.rowColumnAutoThreshold(transpositionInvariant, data.thresholdPercentage);
    log.debug("autothreshold Time", performance.now() - startTime);

    const fullTranspositionInvariant = Matrix.fromHalfMatrix(transpositionInvariant);

    // Scorematrix of single segment purely for visualization
    const scoreMatrix = pathExtraction.visualizationMatrix(fullTranspositionInvariant, sampleAmount, 50, 100);

    // Scapeplot creation
    startTime = performance.now();
    const SP = scapePlot.create(fullTranspositionInvariant, sampleAmount, data.SPminSize, data.SPstepSize);
    log.debug("ScapePlot Time", performance.now() - startTime);

    // Anchorpoint selection for segment family similarity
    startTime = performance.now();
    const anchorNeighborhoodSize = 7 / data.SPstepSize;
    const anchorMinSize = Math.max(1, 7 - data.SPminSize);
    const { anchorPoints, anchorPointAmount } = scapePlot.sampleAnchorPointsMax(
        SP,
        250,
        anchorNeighborhoodSize,
        anchorMinSize,
        0.1
    );
    log.debug("anchorPoints Time", performance.now() - startTime);
    log.debug("AnchorPoint Amount: ", anchorPointAmount);

    // Optional visualization of anchorpoint locations
    //SP.multiply(0.9);
    for (let i = 0; i < anchorPointAmount; i++) {
        //SP.setValue(anchorPoints[i * 2], anchorPoints[i * 2 + 1], 1);
    }

    // Mapping colors by similarity to anchorpoints
    startTime = performance.now();
    const SPAnchorColor = scapePlot.mapColors(
        fullTranspositionInvariant,
        sampleAmount,
        data.SPminSize,
        data.SPstepSize,
        anchorPoints,
        anchorPointAmount
    );
    log.debug("colorMap Time", performance.now() - startTime);

    postMessage({
        rawSSM: ssmTimbrePitch.getBuffer(),
        enhancedSSM: enhancedSSM.getBuffer(),
        transpositionInvariantSSM: transpositionInvariant.getBuffer(),
        scoreMatrix: scoreMatrix.getBuffer(),
        scapePlot: SP.getBuffer(),
        scapePlotAnchorColor: SPAnchorColor.buffer,
        novelty: noveltyMedium.buffer,
        id: data.id,
        timestamp: new Date(),
    });
});
