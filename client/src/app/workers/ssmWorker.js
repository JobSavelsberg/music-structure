import * as log from "../../dev/log";
import * as SSM from "../SSM";
import * as noveltyDetection from "../noveltyDetection";
import * as structure from "../structure";
import * as filter from "../filter";
import * as scapePlot from "../scapePlot";
import * as pathExtraction from "../pathExtraction";
import * as events from "../events";
import * as uniqueness from "../uniqueness";

import Matrix from "../dataStructures/Matrix";
import HalfMatrix from "../dataStructures/HalfMatrix";
import Section from "../Section";
addEventListener("message", (event) => {
    const data = event.data;
    const message = {};
    const matrixes = [];
    const graphs = [];
    const structures = [];

    const averageLoudness = new Float32Array(data.avgLoudness);
    const smoothedAverageLoudness = filter.gaussianBlur1D(averageLoudness, 3);
    graphs.push({ name: "Average Loudness " + 3, buffer: smoothedAverageLoudness.buffer });

    const anomalyFeature = uniqueness.computeFromFeaturesGMM(data.timbreFeatures);
    graphs.push({ name: "Timbre Anomalies", buffer: new Float32Array(anomalyFeature).buffer });

    const uniquenessF = uniqueness.computeFromFeatures(data.timbreFeatures, data.sampleDuration, 20);
    graphs.push({ name: "Timbre Uniqueness", buffer: new Float32Array(uniquenessF).buffer });

    const uniquenessSmooth = filter.gaussianBlur1D(uniquenessF, 2);
    graphs.push({ name: "Timbre Uniqueness Smooth", buffer: new Float32Array(uniquenessSmooth).buffer });

    const eventArray = events.detectAverageWindow(data.timbreFeatures, data.sampleDuration, 20, 0.2);
    const eventSections = [];
    eventArray.forEach((event) => {
        eventSections.push(
            new Section({
                start: event.time,
                end: event.time + 2,
                colorAngle: event.colorAngle,
                colorRadius: event.colorRadius,
                confidence: event.confidence,
                mdsFeature: event.mdsFeature,
            })
        );
    });
    log.debug("Event sections", eventSections);
    structures.push({ name: "Events", data: eventSections });

    //createBeatGraph(data, graphs);

    const { ssmPitch, ssmTimbre } = calculateSSM(data, 0.4);
    const ssmTimbrePitch = Matrix.combine(ssmPitch, ssmTimbre);
    matrixes.push({
        name: "Raw",
        buffer: ssmTimbrePitch.getBuffer(),
    });

    const uniquenessSSM = uniqueness.computeLocalUniqueness(ssmTimbre, 1, 20);
    graphs.push({ name: "Timbre SSM Subract Uniqueness", buffer: new Float32Array(uniquenessSSM).buffer });

    const ssmPitchSinglePitch = data.allPitches ? ssmPitch.getFirstFeatureMatrix() : ssmPitch;
    //const ssmPitchSinglePitchOffset1 = data.allPitches ? ssmPitch.getFeatureMatrix(1) : ssmPitch;

    //createBasicNoveltyFeatures(ssmPitchSinglePitch, ssmTimbre, graphs);

    // Enhance pitch SSM, diagonal smoothing, still contains 12 pitches
    let startTime = performance.now();
    const enhancedSSM = SSM.enhanceSSM(
        ssmPitch,
        { blurLength: data.enhanceBlurLength, tempoRatios: data.tempoRatios, strategy: "linmed" },
        data.allPitches
    );
    //matrixes.push({ name: "Enhanced", buffer: enhancedSSM.getBuffer() });
    log.debug("Enhance Time", performance.now() - startTime);

    // Make transposition invariant; take max of all pitches
    const transpositionInvariantPre = SSM.makeTranspositionInvariant(enhancedSSM);

    // Threshold the ssm to only show important paths
    const transpositionInvariant = SSM.rowColumnAutoThreshold(transpositionInvariantPre, data.thresholdPercentage);
    matrixes.push({ name: "Transinv", buffer: transpositionInvariant.getBuffer() });

    const fullTranspositionInvariant = Matrix.fromHalfMatrix(transpositionInvariant);

    /*const binaryTranspositionInvariant = SSM.binarize(transpositionInvariant, 0.2);
    matrixes.push({
        name: "Bin Transinv",
        buffer: binaryTranspositionInvariant.getBuffer(),
    });*/
    //showAllEnhancementMethods(ssmPitch, data, matrixes);

    // 15 15 for mazurka
    let strictPathMatrixHalf = SSM.rowColumnAutoThreshold(transpositionInvariantPre, 0.19);
    strictPathMatrixHalf = SSM.threshold(strictPathMatrixHalf, 0.1);

    const strictPathMatrix = Matrix.fromHalfMatrix(strictPathMatrixHalf);

    matrixes.push({
        name: "StrictPath",
        buffer: strictPathMatrix.getBuffer(),
    });

    //const simplePaths = pathExtraction.simplePathDetect(strictPathMatrix);
    //log.debug("Simple Paths", simplePaths)

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

    const courseStructureFeature = computeStructureFeature(fullTranspositionInvariant, matrixes, graphs, 8, [10, 2]);
    let courseSegments = structure.createSegmentsFromNovelty(courseStructureFeature, data.sampleDuration, 0.25);
    //structures.push({ name: "Course segments", data: courseSegments })

    const fineStructureFeature = computeStructureFeature(fullTranspositionInvariant, matrixes, graphs, 4, [6, 2]);
    let fineSegments = structure.createSegmentsFromNovelty(fineStructureFeature, data.sampleDuration, 0.05);
    //structures.push({ name: "Fine segments", data: fineSegments })

    if (!data.synthesized) {
        const courseSegmentColored = structure.MDSColorSegments(courseSegments, strictPathMatrix);
        structures.push({ name: "Course Segment MDS colored", data: courseSegmentColored });

        const fineSegmentColored = structure.MDSColorSegments(fineSegments, strictPathMatrix);
        structures.push({ name: "Fine Segment MDS colored", data: fineSegmentColored });

        message.separators = structure.createSeparators(courseSegmentColored, strictPathMatrix);
        log.debug("Separators", message.separators);
    }

    const duration = 3; // samples
    const sampledSegments = structure.createFixedDurationStructureSegments(
        data.sampleAmount,
        data.sampleDuration,
        duration
    );

    const fineSections = structure.findFittestSections(strictPathMatrix, fineSegments, "classic");
    structures.push({ name: "Fine segments Classic", data: fineSections });

    const squashedFineSections = structure.squash(
        "fill-gap",
        fineSections,
        fineSections[fineSections.length - 1].groupID + 1
    );

    const sortedSquashedFineSections = structure.sortGroupByCoverage(squashedFineSections);

    const squashedFineSectionsMDS = structure.MDSColorSegments(sortedSquashedFineSections, strictPathMatrix);
    structures.push({
        name: "Squashed Fine SegmentsMDS color",
        data: squashedFineSectionsMDS,
        verticalPosition: true,
    });

    postMessage({ messageType: "update", message: { say: "Helllo world" } });

    //const [greedyStructure, groupAmount, segments] = structure.findGreedyDecomposition(strictPathMatrix, fineSegments, data.sampleDuration, "classic");
    //structures.push({ name: "Greedy sections classic", data: greedyStructure, separateByGroup: true, groupAmount: groupAmount })

    //const [greedyStructureSampled, groupAmountSampled, segmentsSampled] = structure.findGreedyDecomposition(strictPathMatrix, sampledSegments, data.sampleDuration, "classic");
    //structures.push({ name: "Greedy sections classic sampled", data: greedyStructureSampled, separateByGroup: true, groupAmount: groupAmountSampled })

    const [mutorStructure, mutorGroupAmount, segmentsMutor] = structure.findMuteDecomposition(
        strictPathMatrix,
        sampledSegments,
        data.sampleDuration,
        "classic",
        "or"
    );
    structures.push({
        name: "Mute OR Sampled",
        data: mutorStructure,
        separateByGroup: true,
        groupAmount: mutorGroupAmount,
    });

    const [mutorSubStructure, mutorSubGroupAmount] = structure.findSubDecomposition(
        strictPathMatrix,
        mutorStructure,
        1.5,
        "fine"
    );
    structures.push({
        name: "Mute OR Sub Fine",
        data: mutorSubStructure,
        separateByGroup: true,
        groupAmount: mutorSubGroupAmount,
    });

    const [mutandFineStructure, mutandGroupAmountFine, segmentsMutand] = structure.findMuteDecomposition(
        strictPathMatrix,
        sampledSegments,
        data.sampleDuration,
        "fine",
        "and"
    );
    structures.push({ name: "Mute AND Sampled Fine", data: mutandFineStructure, separateByGroup: true });

    const group0 = mutorStructure.filter((section) => section.groupID === 0);
    const group0InSamples = group0.map((section) => {
        const clone = section.clone();
        clone.start = Math.floor(clone.start / data.sampleDuration);
        clone.end = Math.floor(clone.end / data.sampleDuration);
        return clone;
    });
    log.debug(group0InSamples);
    const solo0and = SSM.soloAnd(strictPathMatrix, group0InSamples);
    matrixes.push({ name: "S0&", buffer: solo0and.getBuffer() });
    const solo0or = SSM.soloOr(strictPathMatrix, group0InSamples);
    matrixes.push({ name: "S0||", buffer: solo0or.getBuffer() });
    const inner0 = SSM.showInner(strictPathMatrix, group0InSamples);
    matrixes.push({ name: "Inner0", buffer: inner0.getBuffer() });
    const inner0Half = HalfMatrix.fromMatrix(inner0);
    log.debug(inner0Half);
    const enhancedInner = SSM.enhanceSSM(inner0Half, {
        blurLength: data.enhanceBlurLength,
        tempoRatios: data.tempoRatios,
        strategy: "med",
    });
    log.debug(enhancedInner);
    const inner0FullEnhanced = Matrix.fromHalfMatrix(enhancedInner);
    matrixes.push({ name: "Inner0^", buffer: inner0FullEnhanced.getBuffer() });
    const mute0and = SSM.muteAnd(strictPathMatrix, group0InSamples);
    matrixes.push({ name: "M0&", buffer: mute0and.getBuffer() });
    const mute0or = SSM.muteOr(strictPathMatrix, group0InSamples);
    matrixes.push({ name: "M0||", buffer: mute0or.getBuffer() });
    //log.debug(greedyStructure)

    //const [greedyStructure1, groupAmount1, segments1] = structure.findGreedyDecomposition(strictPathMatrix, structureSegments, data.sampleDuration, "pruned");
    //structures.push({ name: "Greedy sections pruned", data: greedyStructure1, separateByGroup: true, groupAmount: groupAmount1 })

    //const [greedyStructureCustom, groupAmountCustom, segmentsCustom] = structure.findGreedyDecomposition(strictPathMatrix, fineSegments, data.sampleDuration, "custom");
    //structures.push({ name: "Greedy sections custom", data: greedyStructureCustom, separateByGroup: true, groupAmount: groupAmountCustom })

    //const [greedyStructureCustomSampled, groupAmountCustomSampled, segmentsCustomSampled] = structure.findGreedyDecomposition(strictPathMatrix, sampledSegments, data.sampleDuration, "custom");
    //structures.push({ name: "Greedy sections custom sampled", data: greedyStructureCustomSampled, separateByGroup: true, groupAmount: groupAmountCustomSampled })

    //const = structure.find(strictPathMatrix, fineSegments, data.sampleDuration, "custom");
    //structures.push({ name: "Best Structure Segment sections", data: greedyStructureCustom, separateByGroup: true, groupAmount: groupAmountCustom })

    //const [mutandStructure, mutandGroupAmount, segmentsMutand] = structure.findMuteDecomposition(strictPathMatrix, sampledSegments, data.sampleDuration, "custom", "and");
    //structures.push({ name: "Mute AND Sampled", data: mutandStructure, separateByGroup: true, groupAmount: mutandGroupAmount })

    /*
    const [greedyStructureCustom2Sampled, groupAmountCustom2Sampled, segmentsCustom2Sampled] = structure.findGreedyDecomposition(strictPathMatrix, sampledSegments, data.sampleDuration, "customPruned");
    structures.push({ name: "Greedy sections custom 2 sampled", data: greedyStructureCustom2Sampled, separateByGroup: true, groupAmount: groupAmountCustom2Sampled })

        
    const [greedyStructureCustom2, groupAmountCustom2, segmentsCustom2] = structure.findGreedyDecomposition(strictPathMatrix, fineSegments, data.sampleDuration, "customPruned");
    structures.push({ name: "Greedy sections custom 2 ", data: greedyStructureCustom2, separateByGroup: true, groupAmount: groupAmountCustom2 })*/
    //const sampleStart = Math.floor(greedyStructure[0].start/data.sampleDuration);
    //const sampleEnd = Math.floor(greedyStructure[0].end/data.sampleDuration);

    //const [allFit, groupAmount4] = structure.findAllFitSections(strictPathMatrix, structureSegments, data.sampleDuration, "classic");
    //structures.push({ name: "All fit sections", data: allFit, separateByGroup: true, groupAmount: groupAmount4 })

    //const classicSquashedStructureNoOverlap = structure.squash('no-overlap',greedyStructureSampled, groupAmountCustom2Sampled);
    //structures.push({ name: "Classic Squashed structure no-overlap", data: classicSquashedStructureNoOverlap})
    const squashedStructureFillGap = structure.squash("fill-gap", mutorStructure, mutorGroupAmount);
    structures.push({ name: "Squashed structure", data: squashedStructureFillGap });

    if (!data.synthesized) {
        const squashedStructureFillGapMDS = structure.MDSColorSegments(mutorStructure, strictPathMatrix);
        structures.push({
            name: "Squashed structure MDS color",
            data: squashedStructureFillGapMDS,
            verticalPosition: true,
        });
    }

    //const squashedStructureNoOverlap = structure.squash('no-overlap',greedyStructureCustom2Sampled, groupAmountCustom2Sampled);
    //structures.push({ name: "Custom2 Squashed structure no-overlap", data: squashedStructureNoOverlap})
    /*const squashedStructureFillGap2 = structure.squash('fill-gap',greedyStructureCustomSampled, groupAmountCustomSampled);
    structures.push({ name: "Custom2 Squashed structure fill-gap", data: squashedStructureFillGap2})
    const squashedStructureFillGap2MDS = structure.MDSColorSegments(squashedStructureFillGap2, strictPathMatrix);
    structures.push({ name: "Custom2 Squashed structure fill-gap MDS color", data: squashedStructureFillGap2MDS})*/

    visualizePathExtraction(strictPathMatrix, 20, 40, matrixes);

    const blurredTimbreSmall = filter.gaussianBlur2DOptimized(ssmTimbre, 2);
    matrixes.push({
        name: "BlurTimbre Small",
        buffer: blurredTimbreSmall.getBuffer(),
    });

    const blurredTimbreLarge = filter.gaussianBlur2DOptimized(ssmTimbre, 8);
    matrixes.push({
        name: "BlurTimbre Large",
        buffer: blurredTimbreLarge.getBuffer(),
    });

    //const timbreNovelty = noveltyDetection.detect(blurredTimbre, 10);
    /*graphs.push({
        name: "Timbre Novelty",
        buffer: timbreNovelty.buffer,
    });*/

    const ssmUniqueness = uniqueness.computeFromSSM(ssmTimbre);
    graphs.push({ name: "Timbre SSM Uniqueness", buffer: new Float32Array(ssmUniqueness).buffer });

    const ssmUniquenessSmall = uniqueness.computeFromSSM(blurredTimbreSmall);
    graphs.push({ name: "Timbre SSM Uniqueness Blur Small", buffer: new Float32Array(ssmUniquenessSmall).buffer });

    const timbreNoveltyColumnLarge = noveltyDetection.absoluteEuclideanColumnDerivative(blurredTimbreLarge);
    graphs.push({ name: "Timbre Column Novelty Large", buffer: timbreNoveltyColumnLarge.buffer });
    const smoothTimbreNoveltyColumnLarge = filter.gaussianBlur1D(timbreNoveltyColumnLarge, 3);
    graphs.push({ name: "Timbre Column Novelty Smooth Large", buffer: smoothTimbreNoveltyColumnLarge.buffer });

    const timbreNoveltyColumnSmall = noveltyDetection.absoluteEuclideanColumnDerivative(blurredTimbreSmall);
    graphs.push({ name: "Timbre Column Novelty Small", buffer: timbreNoveltyColumnSmall.buffer });
    const smoothTimbreNoveltyColumnSmall = filter.gaussianBlur1D(timbreNoveltyColumnSmall, 3);
    graphs.push({ name: "Timbre Column Novelty Smooth Small", buffer: smoothTimbreNoveltyColumnSmall.buffer });

    if (!data.synthesized) {
        const timbreSegmentsLarge = structure.createSegmentsFromNovelty(
            smoothTimbreNoveltyColumnLarge,
            data.sampleDuration,
            0.2
        );
        const processedTimbreSegmentsLarge = structure.processTimbreSegments(
            data.timbreFeatures,
            timbreSegmentsLarge,
            data.sampleDuration
        );
        structures.push({ name: "Timbre Large", data: processedTimbreSegmentsLarge, verticalPosition: true });
        const timbreSegmentsSmall = structure.createSegmentsFromNovelty(
            smoothTimbreNoveltyColumnSmall,
            data.sampleDuration,
            0.2
        );
        const processedTimbreSegmentsSmall = structure.processTimbreSegments(
            data.timbreFeatures,
            timbreSegmentsSmall,
            data.sampleDuration
        );
        structures.push({ name: "Timbre Small", data: processedTimbreSegmentsSmall, verticalPosition: true });
        const processedTimbreSegmentsSampled = structure.processTimbreSegments(
            data.timbreFeatures,
            sampledSegments,
            data.sampleDuration
        );
        structures.push({ name: "Timbre Sampled", data: processedTimbreSegmentsSampled, verticalPosition: true });
    }

    message.courseStructure = structure.MDSColorSegments(mutorStructure, strictPathMatrix);
    message.fineStructure = structure.MDSColorSegments(mutorSubStructure, strictPathMatrix);

    message.matrixes = matrixes;
    message.graphs = graphs;
    message.structures = structures;
    message.id = data.id;
    message.timestamp = new Date();

    postMessage({ messageType: "final", message });
});

/* ===========================================================================================================================================
 *  ==========================================================================================================================================
 *  ==========================================================================================================================================
 */

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
        { blurLength: data.enhanceBlurLength, tempoRatios: data.tempoRatios, strategy: "linear" },
        data.allPitches
    );
    let transpositionInvariantLin = SSM.makeTranspositionInvariant(enhancedSSMLin);
    transpositionInvariantLin = SSM.rowColumnAutoThreshold(transpositionInvariantLin, data.thresholdPercentage);
    matrixes.push({ name: "transinv Lin", buffer: transpositionInvariantLin.getBuffer() });

    const enhancedSSMGauss = SSM.enhanceSSM(
        ssmPitch,
        { blurLength: data.enhanceBlurLength, tempoRatios: data.tempoRatios, strategy: "gauss" },
        data.allPitches
    );
    let transpositionInvariantGauss = SSM.makeTranspositionInvariant(enhancedSSMGauss);
    transpositionInvariantGauss = SSM.rowColumnAutoThreshold(transpositionInvariantGauss, data.thresholdPercentage);
    matrixes.push({ name: "transinv Gauss", buffer: transpositionInvariantGauss.getBuffer() });

    const enhancedSSMOnedir = SSM.enhanceSSM(
        ssmPitch,
        { blurLength: data.enhanceBlurLength, tempoRatios: data.tempoRatios, strategy: "onedir" },
        data.allPitches
    );
    let transpositionInvariantOnedir = SSM.makeTranspositionInvariant(enhancedSSMOnedir);
    transpositionInvariantOnedir = SSM.rowColumnAutoThreshold(transpositionInvariantOnedir, data.thresholdPercentage);
    matrixes.push({ name: "transinv Onedir", buffer: transpositionInvariantOnedir.getBuffer() });

    const enhancedSSMOnedirmed = SSM.enhanceSSM(
        ssmPitch,
        { blurLength: data.enhanceBlurLength, tempoRatios: data.tempoRatios, strategy: "onedirmed" },
        data.allPitches
    );
    let transpositionInvariantOnedirmed = SSM.makeTranspositionInvariant(enhancedSSMOnedirmed);
    transpositionInvariantOnedirmed = SSM.rowColumnAutoThreshold(
        transpositionInvariantOnedirmed,
        data.thresholdPercentage
    );
    matrixes.push({ name: "transinv Onedirmed", buffer: transpositionInvariantOnedirmed.getBuffer() });
}

export function computeStructureFeature(pathSSM, matrixes, graphs, blurLength, medianBlurDimensions = [16, 2]) {
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
    matrixes.push({
        name: `Blur Norm TL ${blurLength}`,
        buffer: blurredBinaryTimeLagMatrixNorm.getBuffer(),
    });

    const structureFeatureNoveltyNorm = noveltyDetection.computeNoveltyFromTimeLag(blurredBinaryTimeLagMatrixNorm);
    graphs.push({
        name: `Structure Feature Novelty (Norm) ${blurLength}`,
        buffer: structureFeatureNoveltyNorm.buffer,
    });

    return structureFeatureNoveltyNorm;
}

export function visualizePathExtraction(pathSSM, startSample, endSample, matrixes) {
    const pathExtractVis = pathExtraction.visualizationMatrix(
        pathSSM,
        pathSSM.getSampleAmount(),
        startSample,
        endSample
    );
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
