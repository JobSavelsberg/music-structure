import Matrix from "../dataStructures/Matrix";
import HalfMatrix from "../dataStructures/HalfMatrix";
import * as log from "../../dev/log";

export async function init() {
    //ssm = new Worker("./ssmWorker.js", { type: "module" });
    timbreGraphWorker = new Worker("./timbreGraphWorker.js", { type: "module" });
    timbreStructureWorker = new Worker("./timbreStructureWorker.js", { type: "module" });
    harmonicStructureWorker = new Worker("./harmonicStructureWorker.js", { type: "module" });
    chordWorker = new Worker("./chordWorker.js", { type: "module" });

    //tsneWorker = new Worker("./tsneWorker.js", { type: "module" });
    // clusterWorker = new Worker("./clusterWorker.js", { type: "module" });
}

let isCalculating = false;

let timbreGraphWorker;
let timbreGraphWorkerBusy = false;
export async function updateTimbreGraphVis(timbreFeatures, timbreSliders, sampleDuration) {
    return new Promise((resolve) => {
        if (timbreGraphWorkerBusy) {
            timbreGraphWorker.terminate();
            timbreGraphWorker = new Worker("./timbreGraphWorker.js", { type: "module" });
        }
        timbreGraphWorker.postMessage({
            timbreFeatures,
            timbreSliders,
            sampleDuration,
            timestamp: new Date(),
        });
        timbreGraphWorkerBusy = true;

        timbreGraphWorker.onmessage = (event) => {
            timbreGraphWorkerBusy = false;
            const sendBackTime = new Date() - event.data.timestamp;
            log.debug("Got back from timbreGraphworker", sendBackTime);
            resolve(event.data.result);
        };
    });
}

let timbreStructureWorker;
let timbreStructureWorkerBusy = false;
export async function computeTimbreStructure(timbreFeatures, sampleDuration) {
    return new Promise((resolve) => {
        if (timbreStructureWorkerBusy) {
            timbreStructureWorker.terminate();
            timbreStructureWorker = new Worker("./timbreStructureWorker.js", { type: "module" });
        }
        timbreStructureWorker.postMessage({
            timbreFeatures,
            sampleDuration,
        });
        timbreStructureWorkerBusy = true;

        timbreStructureWorker.onmessage = (event) => {
            timbreStructureWorkerBusy = false;
            log.debug("Got back from timbreStructureWorker", event.data);
            resolve(event.data);
        };
    });
}

let harmonicStructureWorker;
let harmonicStructureWorkerBusy = false;
export async function computeHarmonicStructure(options) {
    return new Promise((resolve) => {
        if (harmonicStructureWorkerBusy) {
            harmonicStructureWorker.terminate();
            harmonicStructureWorker = new Worker("./harmonicStructureWorker.js", { type: "module" });
        }
        harmonicStructureWorker.postMessage(options);
        harmonicStructureWorkerBusy = true;

        harmonicStructureWorker.onmessage = (event) => {
            if (event.data.state === "done") {
                harmonicStructureWorkerBusy = false;

                resolve(event.data);
            }
            if (event.data.state === "processing") {
                window.eventBus.$emit("harmonicStructure", event.data);
            }
            //resolve(event.data);
        };
    });
}

let chordWorker;
let chordWorkerBusy = false;
export async function computeChords(pitchFeatures, fastSampledPitch, sampleDuration, fastSampledPitchDuration) {
    return new Promise((resolve) => {
        if (chordWorkerBusy) {
            chordWorker.terminate();
            chordWorker = new Worker("./chordWorker.js", { type: "module" });
        }
        chordWorker.postMessage({
            pitchFeatures,
            fastSampledPitch,
            sampleDuration,
            fastSampledPitchDuration,
        });
        chordWorkerBusy = true;

        chordWorker.onmessage = (event) => {
            chordWorkerBusy = false;
            log.debug("Got back from chordWorker", event.data);
            resolve(event.data);
        };
    });
}

let ssm;
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

let tsneWorker;
let tsneWorkerBusy = false;
export async function tsne(features) {
    log.debug(features);
    return new Promise((resolve) => {
        if (tsneWorkerBusy) {
            tsneWorker.terminate();
            tsneWorker = new Worker("./tsneWorker.js", { type: "module" });
        }
        tsneWorker.postMessage(features);
        tsneWorkerBusy = true;

        tsneWorker.onmessage = (event) => {
            if (event.data.state === "done") {
                tsneWorkerBusy = false;
                window.eventBus.$emit("tsneReady", event.data.result);
                resolve(event.data.result);
            }
            if (event.data.state === "processing") {
                window.eventBus.$emit("tsneReady", event.data.result);
            }
        };
    });
}

let clusterWorker;
let clusterWorkerBusy = false;
export async function cluster(features) {
    return new Promise((resolve) => {
        if (clusterWorkerBusy) {
            clusterWorker.terminate();
            clusterWorker = new Worker("./clusterWorker.js", { type: "module" });
        }
        clusterWorker.postMessage(features);
        clusterWorkerBusy = true;

        clusterWorker.onmessage = (event) => {
            clusterWorkerBusy = false;
            log.debug("Got back from clusterWorker", event.data);
            resolve(event.data);
        };
    });
}
