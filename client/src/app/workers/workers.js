export let ssm;
export let cluster;
export let tsne;

export async function init() {
    ssm = new Worker("./ssmWorker.js", { type: "module" });
    cluster = new Worker("./tsneWorker", { type: "module" });
    tsne = new Worker("./clusterWorker.js", { type: "module" });
}

export async function startSSM(track, features, featureLength, options) {
    return new Promise((resolve, reject) => {
        const sampled = options.useSampled | false;
        const blurTime = options.blurTime | 4;
        const threshold = options.threshold | 0.5;
        const id = track.getId();
        ssm.postMessage({
            features: features,
            featureLength: featureLength,
            segmentObjects: track.segments,
            id,
            timestamp: new Date(),
            sampled,
            blurTime,
            threshold,
        });
        ssm.onmessage = (event) => {
            const result = event.data;
            if (result.id === id) {
                resolve(result);
            }
        };
    });
}
