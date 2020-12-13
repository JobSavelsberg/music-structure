import * as log from "../../dev/log";
import * as SSM from "../SSM";
import * as noveltyDetection from "../noveltyDetection";
import * as structure from "../structure";
import * as filter from "../filter";
import * as scapePlot from "../scapePlot";
import * as pathExtraction from "../pathExtraction";

import Matrix from "../dataStructures/Matrix";
import HalfMatrix from "../dataStructures/HalfMatrix";

addEventListener("message", (event) => {
    const data = event.data;
    const message = {};
    const matrixes = [];
    const graphs = [];
    const structures = [];

    //createBeatGraph(data, graphs);

    const { ssmPitch, ssmTimbre } = calculateSSM(data, 0.4);
    const ssmTimbrePitch = Matrix.combine(ssmPitch, ssmTimbre);
    matrixes.push({
        name: "Raw",
        buffer: ssmTimbrePitch.getBuffer(),
    });


    const ssmPitchSinglePitch = data.allPitches ? ssmPitch.getFirstFeatureMatrix() : ssmPitch;
    //const ssmPitchSinglePitchOffset1 = data.allPitches ? ssmPitch.getFeatureMatrix(1) : ssmPitch;

    //createBasicNoveltyFeatures(ssmPitchSinglePitch, ssmTimbre, graphs);


    // Enhance pitch SSM, diagonal smoothing, still contains 12 pitches
    let startTime = performance.now();
    const enhancedSSM = SSM.enhanceSSM(
        ssmPitch,
        { blurLength: data.enhanceBlurLength, tempoRatios: data.tempoRatios, strategy: 'linmed' },
        data.allPitches
    );
    matrixes.push({ name: "Enhanced", buffer: enhancedSSM.getBuffer() });
    log.debug("Enhance Time", performance.now() - startTime);




    // Make transposition invariant; take max of all pitches
    const transpositionInvariantPre = SSM.makeTranspositionInvariant(enhancedSSM);

    // Threshold the ssm to only show important paths
    const transpositionInvariant = SSM.rowColumnAutoThreshold(transpositionInvariantPre, data.thresholdPercentage);
    matrixes.push({
        name: "Transinv",
        buffer: transpositionInvariant.getBuffer(),
    });

    const fullTranspositionInvariant = Matrix.fromHalfMatrix(transpositionInvariant);


    /*const binaryTranspositionInvariant = SSM.binarize(transpositionInvariant, 0.2);
    matrixes.push({
        name: "Bin Transinv",
        buffer: binaryTranspositionInvariant.getBuffer(),
    });*/
    //showAllEnhancementMethods(ssmPitch, data, matrixes);


    let strictPathMatrixHalf = SSM.rowColumnAutoThreshold(transpositionInvariantPre, 0.2);
    //strictPathMatrixHalf = SSM.threshold(strictPathMatrixHalf, 0.1);

    const strictPathMatrix = Matrix.fromHalfMatrix(strictPathMatrixHalf);

    matrixes.push({
        name: "StrictPath",
        buffer: strictPathMatrix.getBuffer(),
    });

    const simplePaths = pathExtraction.simplePathDetect(strictPathMatrix);
    log.debug("Simple Paths", simplePaths)

    //const structureFeature = computeStructureFeature(fullTranspositionInvariant, matrixes, graphs, 4, [6,2]);

    //const binaryTimeLagMatrix = SSM.binarize(medianTimeLag, 0.1);
    //matrixes.push({ name: "Bin TL", buffer: binaryTimeLagMatrix.getBuffer() });


    if (data.createScapePlot) {
        createScapePlot(strictPathMatrix, data, message);
    }

    /*const noveltyCombined = new Float32Array(data.sampleAmount);
    for (let i = 0; i < noveltyCombined.length; i++) {
        noveltyCombined[i] = structureFeature[i]; //+ timbreNoveltyMedium[i] * 2 + pitchNoveltyMedium[i] * 2
        //blurredPitchNovelty[i] * 0.5 +
        //blurredTimbreNovelty[i] * 0.5;
    }*/
    //graphs.push({ name: "Combined Novelty", buffer: noveltyCombined.buffer });

    /*const smoothedCombined = filter.gaussianBlur1D(noveltyCombined, 1);
    graphs.push({
        name: "Smoothed Combined Novelty",
        buffer: smoothedCombined.buffer,
    });*/


    const courseStructureFeature = computeStructureFeature(fullTranspositionInvariant, matrixes, graphs, 8, [10,2]);
    let courseSegments = structure.createSegmentsFromNovelty(courseStructureFeature, data.sampleDuration, 0.25);
    //structures.push({ name: "Structure segments", data: courseSegments })

    const fineStructureFeature = computeStructureFeature(fullTranspositionInvariant, matrixes, graphs, 4, [6,2]);
    let fineSegments = structure.createSegmentsFromNovelty(fineStructureFeature, data.sampleDuration, 0.05);
    //structures.push({ name: "Fine segments", data: fineSegments })

    const duration = 2; // samples
    const sampledSegments = structure.createFixedDurationStructureSegments(data.sampleAmount, data.sampleDuration, duration)
    structures.push({ name: "Samled segments", data: sampledSegments })

    //const structureCandidates = structure.computeStructureCandidates(strictPathMatrix, structureSections)

    const courseSegmentLabeled = structure.labelSimilarSegments(courseSegments, strictPathMatrix);
    structures.push({ name: "Course Segment labels", data: courseSegmentLabeled})

    const fineSegmentLabeled = structure.labelSimilarSegments(fineSegments, strictPathMatrix);
    structures.push({ name: "Fine Segment labels", data: fineSegmentLabeled})

    const courseSegmentColored = structure.MDSColorSegments(courseSegments, strictPathMatrix);
    structures.push({ name: "Course Segment MDS colored", data: courseSegmentColored})

    const fineSegmentColored = structure.MDSColorSegments(fineSegments, strictPathMatrix);
    structures.push({ name: "Fine Segment MDS colored", data: fineSegmentColored})

    const [greedyStructure, labelAmount, segments] = structure.findGreedyDecomposition(strictPathMatrix, fineSegments, data.sampleDuration, "classic");
    structures.push({ name: "Greedy sections classic", data: greedyStructure, seperateByLabel: true, labelAmount: labelAmount })

    const [greedyStructure1, labelAmount1, segments1] = structure.findGreedyDecomposition(strictPathMatrix, sampledSegments, data.sampleDuration, "classic");
    structures.push({ name: "Greedy sections classic sampled", data: greedyStructure1, seperateByLabel: true, labelAmount: labelAmount1 })

    //log.debug(greedyStructure)

    //const [greedyStructure1, labelAmount1, segments1] = structure.findGreedyDecomposition(strictPathMatrix, structureSegments, data.sampleDuration, "pruned");
    //structures.push({ name: "Greedy sections pruned", data: greedyStructure1, seperateByLabel: true, labelAmount: labelAmount1 })

    const [greedyStructure2, labelAmount2, segments2] = structure.findGreedyDecomposition(strictPathMatrix, fineSegments, data.sampleDuration, "custom");
    structures.push({ name: "Greedy sections custom", data: greedyStructure2, seperateByLabel: true, labelAmount: labelAmount2 })

    const [greedyStructure3, labelAmount3, segments3] = structure.findGreedyDecomposition(strictPathMatrix, sampledSegments, data.sampleDuration, "custom");
    structures.push({ name: "Greedy sections custom sampled", data: greedyStructure3, seperateByLabel: true, labelAmount: labelAmount3 })
    //const sampleStart = Math.floor(greedyStructure[0].start/data.sampleDuration);
    //const sampleEnd = Math.floor(greedyStructure[0].end/data.sampleDuration);

    //const [allFit, labelAmount4] = structure.findAllFitSections(strictPathMatrix, structureSegments, data.sampleDuration, "classic");
    //structures.push({ name: "All fit sections", data: allFit, seperateByLabel: true, labelAmount: labelAmount4 })

    visualizePathExtraction(strictPathMatrix, 352, 388, matrixes)

    //visualizeKernel(data, matrixes);

    message.matrixes = matrixes;
    message.graphs = graphs;
    message.structures = structures;
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

export function calculateSSM(data, threshold) {
    if (data.synthesized) {
        const ssmPitch = new HalfMatrix(data.synthesizedSSMPitch);
        const ssmTimbre = new HalfMatrix(data.synthesizedSSMTimbre);
        return { ssmPitch, ssmTimbre };
    } else {
        // Calculate raw SSM: pitchSSM with 12 pitches, timbreSSM
        const ssmPitch = timed("ssmPitch", () =>
            SSM.calculateSSM(data.pitchFeatures, data.sampleDuration, data.allPitches, threshold)
        );
        const ssmTimbre = timed("ssmTimbre", () =>
            SSM.calculateSSM(data.timbreFeatures, data.sampleDuration, false, threshold)
        );
        return { ssmPitch, ssmTimbre };
    }
}

export function createBasicNoveltyFeatures(pitch, timbre, graphs) {
    const blurredTimbre = filter.gaussianBlur2DOptimized(timbre, 12);

    //matrixes.push({ name: "Blur T", buffer: blurredTimbre.getBuffer() });
    const blurredPitch = filter.gaussianBlur2DOptimized(pitch, 12);
    //matrixes.push({ name: "Blur P", buffer: blurredPitch.getBuffer() });

    const timbreNoveltySmall = noveltyDetection.detect(timbre, 5);
    const timbreNoveltyMedium = noveltyDetection.detect(timbre, 20);
    const timbreNoveltyLarge = noveltyDetection.detect(timbre, 40);
    const pitchNoveltySmall = noveltyDetection.detect(timbre, 5);
    const pitchNoveltyMedium = noveltyDetection.detect(timbre, 20);
    const pitchNoveltyLarge = noveltyDetection.detect(timbre, 40);
    graphs.push({
        name: "Timbre Novelty Blur Medium",
        buffer: timbreNoveltyMedium.buffer,
    });
    graphs.push({
        name: "Timbre Novelty Blur Large",
        buffer: timbreNoveltyLarge.buffer,
    });
    graphs.push({
        name: "Pitch Novelty Blur Medium",
        buffer: pitchNoveltyMedium.buffer,
    });
    graphs.push({
        name: "Pitch Novelty Blur Large",
        buffer: pitchNoveltyLarge.buffer,
    });

    const timbreNovelty = noveltyDetection.absoluteEuclideanColumnDerivative(timbre);
    graphs.push({ name: "Timbre Column Novelty", buffer: timbreNovelty.buffer });
    const blurredTimbreNovelty = noveltyDetection.absoluteEuclideanColumnDerivative(blurredTimbre);
    graphs.push({
        name: "Blur Timbre Column Novelty",
        buffer: blurredTimbreNovelty.buffer,
    });

    const pitchNovelty = noveltyDetection.absoluteEuclideanColumnDerivative(pitch);
    graphs.push({ name: "Pitch Column Novelty", buffer: pitchNovelty.buffer });
    const blurredPitchNovelty = noveltyDetection.absoluteEuclideanColumnDerivative(blurredPitch);
    graphs.push({
        name: "Blur Pitch Column Novelty",
        buffer: blurredPitchNovelty.buffer,
    });
}

export function createBeatGraph(data, graphs) {
    const beatAmount = data.beatsStartDuration.length;
    const beatDurationArray = new Float32Array(beatAmount);
    for (let i = 0; i < beatAmount; i++) {
        beatDurationArray[i] = data.beatsStartDuration[i][1];
    }
    const beatDurationGraph = {
        name: "Beat Duration",
        buffer: beatDurationArray.buffer,
        min: 0,
        max: 1,
    };
    graphs.push(beatDurationGraph);
    return beatDurationArray;
}

export function visualizeKernel(data, matrixes) {
    const kernel = noveltyDetection.createKernel(data.sampleAmount);
    const kernelMatrix = new HalfMatrix({
        size: data.sampleAmount,
        numberType: HalfMatrix.NumberType.FLOAT32,
    });
    kernelMatrix.data = kernel;
    kernelMatrix.normalize();
    matrixes.push({ name: "Kernel", buffer: kernelMatrix.getBuffer() });
}

export function showAllEnhancementMethods(ssmPitch, data, matrixes) {
    const enhancedSSMLin = SSM.enhanceSSM(
        ssmPitch,
        { blurLength: data.enhanceBlurLength, tempoRatios: data.tempoRatios, strategy: 'linear' },
        data.allPitches
    );
    let transpositionInvariantLin = SSM.makeTranspositionInvariant(enhancedSSMLin);
    transpositionInvariantLin = SSM.rowColumnAutoThreshold(transpositionInvariantLin, data.thresholdPercentage);
    matrixes.push({ name: "transinv Lin", buffer: transpositionInvariantLin.getBuffer() });

    const enhancedSSMGauss = SSM.enhanceSSM(
        ssmPitch,
        { blurLength: data.enhanceBlurLength, tempoRatios: data.tempoRatios, strategy: 'gauss' },
        data.allPitches
    );
    let transpositionInvariantGauss = SSM.makeTranspositionInvariant(enhancedSSMGauss);
    transpositionInvariantGauss = SSM.rowColumnAutoThreshold(transpositionInvariantGauss, data.thresholdPercentage);
    matrixes.push({ name: "transinv Gauss", buffer: transpositionInvariantGauss.getBuffer() });

    const enhancedSSMOnedir = SSM.enhanceSSM(
        ssmPitch,
        { blurLength: data.enhanceBlurLength, tempoRatios: data.tempoRatios, strategy: 'onedir' },
        data.allPitches
    );
    let transpositionInvariantOnedir = SSM.makeTranspositionInvariant(enhancedSSMOnedir);
    transpositionInvariantOnedir = SSM.rowColumnAutoThreshold(transpositionInvariantOnedir, data.thresholdPercentage);
    matrixes.push({ name: "transinv Onedir", buffer: transpositionInvariantOnedir.getBuffer() });

    const enhancedSSMOnedirmed = SSM.enhanceSSM(
        ssmPitch,
        { blurLength: data.enhanceBlurLength, tempoRatios: data.tempoRatios, strategy: 'onedirmed' },
        data.allPitches
    );
    let transpositionInvariantOnedirmed = SSM.makeTranspositionInvariant(enhancedSSMOnedirmed);
    transpositionInvariantOnedirmed = SSM.rowColumnAutoThreshold(transpositionInvariantOnedirmed, data.thresholdPercentage);
    matrixes.push({ name: "transinv Onedirmed", buffer: transpositionInvariantOnedirmed.getBuffer() });

}

export function computeStructureFeature(pathSSM, matrixes, graphs, blurLength, medianBlurDimensions = [16,2]) {
    const timeLagMatrix = Matrix.createTimeLagMatrix(pathSSM);
   //matrixes.push({ name: "TL", buffer: timeLagMatrix.getBuffer() });

    const medianTimeLag = filter.median2D(timeLagMatrix, 32, medianBlurDimensions[0], medianBlurDimensions[1]);
    //matrixes.push({ name: "Med TL", buffer: medianTimeLag.getBuffer() });

    /*const priorLag = noveltyDetection.computePriorLagHalf(timeLagMatrix, 10);
    graphs.push({
        name: "Prior Lag Feature",
        buffer: priorLag.buffer,
    });
    const columnDensity = noveltyDetection.columnDensity(medianTimeLag);
    graphs.push({
        name: "Column Density",
        buffer: columnDensity.buffer,
    });
    const blurredBinaryTimeLagMatrix = filter.gaussianBlur2DOptimized(medianTimeLag, blurLength);
    matrixes.push({
        name: "Blur TL",
        buffer: blurredBinaryTimeLagMatrix.getBuffer(),
    });

    const structureFeatureNovelty = noveltyDetection.computeNoveltyFromTimeLag(blurredBinaryTimeLagMatrix);
    graphs.push({
        name: "Structure Feature Novelty",
        buffer: structureFeatureNovelty.buffer,
    });*/

    const normalizedMedianTimeLag = noveltyDetection.normalizeByColumnDensity(medianTimeLag);
    /*matrixes.push({
        name: "Norm TL",
        buffer: normalizedMedianTimeLag.getBuffer(),
    });*/
    const blurredBinaryTimeLagMatrixNorm = filter.gaussianBlur2DOptimized(normalizedMedianTimeLag, blurLength);
    /*matrixes.push({
        name: "Blur Norm TL",
        buffer: blurredBinaryTimeLagMatrixNorm.getBuffer(),
    });*/

    const structureFeatureNoveltyNorm = noveltyDetection.computeNoveltyFromTimeLag(blurredBinaryTimeLagMatrixNorm);
    graphs.push({
        name: `Structure Feature Novelty (Norm) ${blurLength}`,
        buffer: structureFeatureNoveltyNorm.buffer,
    });

    return structureFeatureNoveltyNorm;
}

export function visualizePathExtraction(pathSSM, startSample, endSample, matrixes) {
    const pathExtractVis = pathExtraction.visualizationMatrix(pathSSM, pathSSM.getSampleAmount(), startSample, endSample);
    matrixes.push({ name: "DTW", buffer: pathExtractVis.getBuffer() });
}

export function createScapePlot(pathSSM, data, message) {
    let startTime = performance.now();
    const SP = scapePlot.create(pathSSM, data.sampleAmount, data.SPminSize, data.SPstepSize);
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
        pathSSM,
        data.sampleAmount,
        data.SPminSize,
        data.SPstepSize,
        anchorPoints,
        anchorPointAmount
    );
    log.debug("colorMap Time", performance.now() - startTime);

    message.scapePlot = SP.getBuffer();
    message.scapePlotAnchorColor = SPAnchorColor.buffer;
}

