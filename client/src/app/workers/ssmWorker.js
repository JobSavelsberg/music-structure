import SSM from "../SSM";

addEventListener("message", (event) => {
    const data = event.data;
    console.log("Hi from ssmWorker");

    const notifyTime = new Date() - data.timestamp;
    console.log("Time it took to notify me", notifyTime);

    import("../wasm/pkg").then((rust) => {
        console.log("Time from calling worker to calculated", new Date() - data.timestamp);
        const beforewasmtime = new Date();
        const ssm = rust.calculate_ssm(data.featureLength, data.features);
        const finishTime = new Date() - beforewasmtime;
        console.log("Time it took to finish Rust", finishTime);
        console.log(ssm);

        postMessage({ ssm: ssm, id: data.id });
    });
});

/**
 *         const segmentObjects = message.message.segmentObjects;
        const timeStamp = message.message.timeStamp;
        const now = new Date();
        const timeDiff = (now - timeStamp) / 1000;
        console.log("Time diff", timeDiff);
        const blurTime = message.message.blurTime || 5; // in s

        console.log("SSM: Calculating");
        const ssm = SSM.calculate(segmentObjects, false);
        console.log("SSM: Enhancing");
        const enhancedSSM = SSM.enhance(segmentObjects, ssm[0], blurTime);
        console.log("SSM: Thresholding");
        const thresholdSSM = SSM.threshold(enhancedSSM, 0.6);
        console.log("SSM: Done!");
        return thresholdSSM;
 */
