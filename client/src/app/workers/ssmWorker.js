import * as log from "../../dev/log";
import * as SSM from "../SSM";
import * as pathExtraction from "../pathExtraction";
import * as noveltyDetection from "../noveltyDetection";
import * as structure from "../structure";
import * as filter from "../filter";
import * as scapePlot from "../scapePlot";
import Matrix from "../dataStructures/Matrix";

addEventListener("message", (event) => {
    const data = event.data;
    const message = {};
    const sampleAmount = data.segmentStartDuration.length;
    const allPitches = data.allPitches;

    const matrixes = [];
    const graphs = [];

    // Calculate raw SSM: pitchSSM with 12 pitches, timbreSSM
    const ssmPitch = timed("ssmPitch", () =>
        SSM.calculateSSM(data.pitchFeatures, data.sampleDuration, allPitches, 0.4)
    );
    const ssmTimbre = timed("ssmTimbre", () => SSM.calculateSSM(data.timbreFeatures, data.sampleDuration, false, 0.4));

    const ssmPitchSinglePitch = ssmPitch.getFirstFeatureMatrix();

    const pitchNoveltySmall = noveltyDetection.detect(ssmPitchSinglePitch, 5);
    const pitchNoveltyMedium = noveltyDetection.detect(ssmPitchSinglePitch, 20);
    const pitchNoveltyLarge = noveltyDetection.detect(ssmPitchSinglePitch, 40);

    const timbreNoveltySmall = noveltyDetection.detect(ssmTimbre, 5);
    const timbreNoveltyMedium = noveltyDetection.detect(ssmTimbre, 20);
    const timbreNoveltyLarge = noveltyDetection.detect(ssmTimbre, 20);

    const blurredPitch = filter.gaussianBlur2DOptimized(ssmPitchSinglePitch, 12);
    matrixes.push({ name: "Blurred Pitch", buffer: blurredPitch.getBuffer() });
    const blurredPitchNovelty = noveltyDetection.absoluteEuclideanColumnDerivative(blurredPitch);
    graphs.push({ name: "Blur Pitch Column Novelty", buffer: blurredPitchNovelty.buffer });

    const blurredTimbre = filter.gaussianBlur2DOptimized(ssmTimbre, 12);
    matrixes.push({ name: "Blurred Timbre", buffer: blurredTimbre.getBuffer() });
    const blurredTimbreNovelty = noveltyDetection.absoluteEuclideanColumnDerivative(blurredTimbre);
    graphs.push({ name: "Blur Timbre Column Novelty", buffer: blurredTimbreNovelty.buffer });

    graphs.push({ name: "Pitch Novelty Medium", buffer: pitchNoveltyLarge.buffer });
    graphs.push({ name: "Timbre Novelty Medium", buffer: timbreNoveltyLarge.buffer });

    const ssmTimbrePitch = Matrix.combine(ssmPitch, ssmTimbre);
    matrixes.push({ name: "Raw Pitch/Timbre", buffer: ssmTimbrePitch.getBuffer() });

    // Enhance pitch SSM, diagonal smoothing, still contains 12 pitches
    let startTime = performance.now();
    const enhancedSSM = SSM.enhanceSSM(ssmPitch, { blurLength: 6, tempoRatios: data.tempoRatios }, allPitches);
    matrixes.push({ name: "Enhanced SSM", buffer: enhancedSSM.getBuffer() });
    log.debug("Enhance Time", performance.now() - startTime);

    // Make transposition invariant; take max of all pitches
    startTime = performance.now();
    let transpositionInvariant = SSM.makeTranspositionInvariant(enhancedSSM);
    log.debug("makeTranspositionInvariant Time", performance.now() - startTime);

    // Threshold the ssm to only show important paths
    startTime = performance.now();
    transpositionInvariant = SSM.rowColumnAutoThreshold(transpositionInvariant, data.thresholdPercentage);
    matrixes.push({ name: "Transposition Invariant", buffer: transpositionInvariant.getBuffer() });
    log.debug("autothreshold Time", performance.now() - startTime);

    const fullTranspositionInvariant = Matrix.fromHalfMatrix(transpositionInvariant);

    const longerDiagonalBlur = SSM.enhanceSSM(transpositionInvariant, {
        blurLength: 10,
        tempoRatios: data.tempoRatios,
    });
    const timeLagMatrix = Matrix.createTimeLagMatrix(longerDiagonalBlur);
    //const binaryTimeLagMatrix = SSM.binarize(timeLagMatrix, 0.4);
    const blurredBinaryTimeLagMatrix = filter.gaussianBlur2DOptimized(timeLagMatrix, 12);
    matrixes.push({ name: "Blurred Binary Time Lag Matrix", buffer: blurredBinaryTimeLagMatrix.getBuffer() });

    const structureFeatureNovelty = noveltyDetection.computeNoveltyFromTimeLag(blurredBinaryTimeLagMatrix);
    graphs.push({ name: "Structure Feature Novelty", buffer: structureFeatureNovelty.buffer });

    if (data.createScapePlot) {
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

        message.scapePlot = SP.getBuffer();
        message.scapePlotAnchorColor = SPAnchorColor.buffer;
    }

    const noveltyCombined = new Float32Array(timbreNoveltyMedium.length);
    for (let i = 0; i < noveltyCombined.length; i++) {
        noveltyCombined[i] =
            timbreNoveltyMedium[i] * 0.5 +
            pitchNoveltyMedium[i] +
            structureFeatureNovelty[i] +
            blurredPitchNovelty[i] * 0.5 +
            blurredTimbreNovelty[i] * 0.5;
    }
    graphs.push({ name: "Combined Novelty", buffer: noveltyCombined.buffer });

    const smoothedCombined = filter.gaussianBlur1D(noveltyCombined, 2);
    graphs.push({ name: "Smoothed Combined Novelty", buffer: smoothedCombined.buffer });

    const structureSections = structure.createSectionsFromNovelty(smoothedCombined, data.sampleDuration);

    message.matrixes = matrixes;
    message.graphs = graphs;
    message.structureSections = structureSections;
    message.id = data.id;
    message.timestamp = new Date();

    postMessage(message);
});

export function timed(name, f) {
    const startTime = performance.now();
    const result = f();
    log.info(`${name} \t took`, Math.round(performance.now() - startTime));
    return result;
}
