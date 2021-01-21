import * as log from "../../dev/log";
import * as structure from "../structure";

addEventListener("message", (event) => {
    const data = event.data;
    const messageTimeToWorker = new Date() - data.timestamp;
    log.debug("MessageTimeToWorker", messageTimeToWorker);
    const sampleAmount = data.timbreFeatures.length;
    let result = [];

    let slidersOn = 0;
    data.timbreSliders.forEach((sliderValue) => {
        if (sliderValue !== 0) slidersOn++;
    });

    if (slidersOn === 1) {
        const onSlider = data.timbreSliders.findIndex((slider) => slider !== 0);
        let minValue = 0;
        let maxValue = 0;
        data.timbreFeatures.forEach((sample) => {
            if (sample[onSlider] < minValue) minValue = sample[onSlider];
            if (sample[onSlider] > maxValue) maxValue = sample[onSlider];
        });

        const sliderSign = Math.sign(data.timbreSliders[onSlider]);
        data.timbreFeatures.forEach((sample) => {
            const normalizedValue = (sample[onSlider] - minValue) / (maxValue - minValue);
            result.push(sliderSign > 0 ? normalizedValue : 1 - normalizedValue);
        });
        postMessage({ result, timestamp: new Date() });
        return;
    }
    if (slidersOn > 1) {
        data.timbreFeatures.forEach((sample) => {
            for (let f = 0; f < 12; f++) {
                sample[f] *= data.timbreSliders[f];
            }
        });

        const mdsStart = new Date();
        let coloredSamples = structure.MDSColorTimbreSamples(data.timbreFeatures);
        const mdsDuration = new Date() - mdsStart;
        log.debug("MDS duration samples", mdsDuration);
        ///coloredSamples = coloredSamples.map((value) => (value + 1) / 2);

        result = coloredSamples;
        postMessage({ result, timestamp: new Date() });
        return;
    } else {
        result = new Float32Array(sampleAmount).fill(0.5);
        postMessage({ result, timestamp: new Date() });
        return;
    }
});
