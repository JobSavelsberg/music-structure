export let ssm;
export let cluster;
export let tsne;

export async function init() {
    ssm = new Worker("./ssmWorker.js", { type: "module" });
    tsne = new Worker("./tsneWorker.js", { type: "module" });
    cluster = new Worker("./clusterWorker.js", { type: "module" });
}

export async function startSSM(trackId, pitchFeatures, timbreFeatures, segmentStartDuration, options = {}) {
    return new Promise((resolve) => {
        const sampled = options.useSampled | false;
        const blurTime = options.blurTime | 4;
        const threshold = options.threshold | 0.5;
        const allPitches = options.allPitches | false;
        ssm.postMessage({
            pitchFeatures,
            timbreFeatures,
            segmentStartDuration,
            id: trackId,
            timestamp: new Date(),
            allPitches,
            sampled,
            blurTime,
            threshold,
        });
        ssm.onmessage = (event) => {
            const result = event.data;
            if (result.id === trackId) {
                result.ssm = new Uint8Array(result.ssm);
                resolve(result);
            }
        };
    });
}
