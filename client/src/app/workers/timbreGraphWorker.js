import * as log from "../../dev/log";
import * as structure from "../structure";
import * as filter from "../filter";

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
        const timbreBlur5 = filter.gaussianBlurFeatures(data.timbreFeatures, 1);
        let coloredSamples = structure.MDSColorTimbreSamples(timbreBlur5);
        const mdsDuration = new Date() - mdsStart;
        log.debug("MDS duration samples", mdsDuration);
        ///coloredSamples = coloredSamples.map((value) => (value + 1) / 2);

        const duration1 = 1; // samples
        log.debug(sampleAmount, data.sampleDuration);
        const sampledSegments1 = structure.createFixedDurationStructureSegments(
            sampleAmount,
            data.sampleDuration,
            duration1
        );
        /*const processedTimbreBlur5 = structure.processTimbreSegments(
            timbreBlur5,
            sampledSegments1,
            data.sampleDuration,
            "Classic"
        );*/

        sampledSegments1.forEach((segment, index) => {
            segment.mdsFeature = coloredSamples[index];
        });

        result = sampledSegments1;
        postMessage({ result, timestamp: new Date() });
        return;
    } else {
        result = new Float32Array(sampleAmount).fill(0.5);
        postMessage({ result, timestamp: new Date() });
        return;
    }
});
