import Matrix from "../dataStructures/Matrix";
import HalfMatrix from "../dataStructures/HalfMatrix";

let ssm;
let cluster;
let tsne;

export async function init() {
    ssm = new Worker("./ssmWorker.js", { type: "module" });
    //tsne = new Worker("./tsneWorker.js", { type: "module" });
    //cluster = new Worker("./clusterWorker.js", { type: "module" });
}

let isCalculating = false;

/**
 *
 * @param {*} trackId
 * @param {*} pitchFeatures
 * @param {*} timbreFeatures
 * @param {*} segmentStartDuration
 * @param {*} options {blurTime 4, threshold: 0.5, allPitches: false }
 */
export async function startSSM(
    trackId,
    pitchFeatures,
    timbreFeatures,
    avgLoudness,
    sampleDuration,
    segmentStartDuration,
    beatsStartDuration,
    options = {}
) {
    return new Promise((resolve) => {
        const enhanceBlurLength = options.enhanceBlurLength || 4;
        const threshold = options.threshold || 0.5;
        const thresholdPercentage = options.thresholdPercentage || 0.05;
        const allPitches = options.allPitches || false;
        const tempoRatios = options.tempoRatios || [1];
        const SPminSize = options.SPminSize || 4;
        const SPstepSize = options.SPstepSize || 1;
        const createScapePlot = options.createScapePlot || false;
        const synthesized = options.synthesized || false;
        const synthesizedSSMPitch = options.synthesizedSSMPitch || null;
        const synthesizedSSMTimbre = options.synthesizedSSMTimbre || null;
        const sampleAmount = options.sampleAmount || segmentStartDuration.length;
        if (isCalculating) {
            ssm.terminate();
            ssm = new Worker("./ssmWorker.js", { type: "module" });
        }

        ssm.postMessage({
            pitchFeatures,
            timbreFeatures,
            avgLoudness,
            sampleDuration,
            sampleAmount,
            segmentStartDuration,
            beatsStartDuration,
            id: trackId,
            timestamp: new Date(),
            allPitches,
            enhanceBlurLength,
            tempoRatios,
            threshold,
            thresholdPercentage,
            SPminSize,
            SPstepSize,
            createScapePlot,
            synthesized,
            synthesizedSSMPitch,
            synthesizedSSMTimbre,
        });
        isCalculating = true;

        ssm.onmessage = (event) => {
            if (event.data.messageType === "update") {
                window.eventBus.$emit("update", event.data.message);
            }
            if (event.data.messageType === "final") {
                isCalculating = false;
                const result = event.data.message;
                if (result.id === trackId) {
                    if (createScapePlot) {
                        result.scapePlot = new HalfMatrix(result.scapePlot);
                        result.scapePlotAnchorColor = new Float32Array(result.scapePlotAnchorColor);
                    }

                    result.matrixes.forEach((matrix) => {
                        if (matrix.buffer.type === "Matrix") {
                            matrix.matrix = new Matrix(matrix.buffer);
                        } else if (matrix.buffer.type === "HalfMatrix") {
                            matrix.matrix = new HalfMatrix(matrix.buffer);
                        }
                        delete matrix.buffer;
                    });

                    result.graphs.forEach((graph) => {
                        graph.data = new Float32Array(graph.buffer);
                        delete graph.buffer;
                    });

                    resolve(result);
                }
            }
        };
    });
}
