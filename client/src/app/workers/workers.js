let ssm;
let cluster;
let tsne;

export async function init() {
    ssm = new Worker("./ssmWorker.js", { type: "module" });
    tsne = new Worker("./tsneWorker.js", { type: "module" });
    cluster = new Worker("./clusterWorker.js", { type: "module" });
}

/**
 *
 * @param {*} trackId
 * @param {*} pitchFeatures
 * @param {*} timbreFeatures
 * @param {*} segmentStartDuration
 * @param {*} options {blurTime 4, threshold: 0.5, allPitches: false }
 */
export async function startSSM(trackId, pitchFeatures, timbreFeatures, segmentStartDuration, options = {}) {
    return new Promise((resolve) => {
        const blurTime = options.blurTime || 4;
        const threshold = options.threshold || 0.5;
        const allPitches = options.allPitches || false;
        const tempoRatios = options.tempoRatios || [1];
        const SPminSize = options.SPminSize || 4;
        const SPstepSize = options.SPstepSize || 1;

        ssm.postMessage({
            pitchFeatures,
            timbreFeatures,
            segmentStartDuration,
            id: trackId,
            timestamp: new Date(),
            allPitches,
            blurTime,
            tempoRatios,
            threshold,
            SPminSize,
            SPstepSize,
        });
        ssm.onmessage = (event) => {
            const result = event.data;
            if (result.id === trackId) {
                result.rawSSM = new Uint8Array(result.rawSSM);
                result.enhancedSSM = new Uint8Array(result.enhancedSSM);
                if (options.allPitches) {
                    result.transpositionInvariantSSM = new Uint8Array(result.transpositionInvariantSSM);
                    result.intervalSSM = new Uint8Array(result.intervalSSM);
                    result.scoreMatrix = new Float32Array(result.scoreMatrix);
                    result.scapePlot = new Uint8Array(result.scapePlot);
                }
                resolve(result);
            }
        };
    });
}
