import * as log from "../../dev/log";
import * as structure from "../structure";
import * as SSM from "../SSM";
import * as filter from "../filter";
import * as events from "../events";
import * as noveltyDetection from "../noveltyDetection";
import Matrix from "../dataStructures/Matrix";
import HalfMatrix from "../dataStructures/HalfMatrix";
import * as keyDetection from "../keyDetection";

addEventListener("message", (event) => {
    const data = event.data;
    const sampleAmount = data.pitchFeatures.length;

    const smoothedpitchFeatures = filter.gaussianBlurFeatures(data.pitchFeatures, 8);

    const pitchSSM = SSM.calculateSSM(data.pitchFeatures, data.sampleDuration, data.allPitches, 0.4);
    const enhancedSSM = SSM.enhanceSSM(
        pitchSSM,
        { blurLength: data.enhanceBlurLength, tempoRatios: data.tempoRatios, strategy: "linmed" },
        data.allPitches
    );
    const transpositionInvariantPre = SSM.makeTranspositionInvariant(enhancedSSM);
    let strictPathMatrixHalf = SSM.rowColumnAutoThreshold(transpositionInvariantPre, 0.19);
    strictPathMatrixHalf = SSM.threshold(strictPathMatrixHalf, 0.1);
    const strictPathMatrix = Matrix.fromHalfMatrix(strictPathMatrixHalf);

    const duration = 4; // samples
    const sampledSegments = structure.createFixedDurationStructureSegments(sampleAmount, data.sampleDuration, duration);

    const updateCallback = (harmonicStructure, state = "processing") => {
        const harmonicStructureMDS = structure.MDSColorSegments(harmonicStructure, strictPathMatrix);
        const sortedHarmonicStructureMDS = harmonicStructureMDS.sort((a, b) => {
            if (a.groupID < b.groupID) return -1;
            if (b.groupID < a.groupID) return 1;
            if (a.groupID === b.groupID) {
                return a.start - b.start;
            }
        });

        sortedHarmonicStructureMDS.forEach((section) => {
            const startInSamples = Math.floor(section.start / data.sampleDuration);
            const endInSamples = Math.floor(section.end / data.sampleDuration);
            const key = keyDetection.detect(data.pitchFeatures, startInSamples, endInSamples);
            section.key = key;
        });

        postMessage({ state, harmonicStructure: sortedHarmonicStructureMDS });
    };
    const [harmonicStructure, mutorGroupAmount, segmentsMutor] = structure.findMuteDecomposition(
        strictPathMatrix,
        sampledSegments,
        data.sampleDuration,
        "classic",
        "or",
        updateCallback
    );
    updateCallback(harmonicStructure, "done");
});
