import * as log from "../../dev/log";
import * as structure from "../structure";
import * as SSM from "../SSM";
import * as filter from "../filter";
import * as events from "../events";
import * as noveltyDetection from "../noveltyDetection";
import * as Features from "../Features";
import Section from "../Section";

addEventListener("message", (event) => {
    const data = event.data;

    const smoothingLength = 5;
    const confidenceThreshold = 0.4;
    const smoothedFeatures = filter.gaussianBlurFeatures(data.timbreFeatures, smoothingLength);
    const downSampleAmount = 300;
    const downSampledFeatures = Features.downSample(smoothedFeatures, downSampleAmount);
    const downSampleDuration = (data.sampleDuration * data.timbreFeatures.length) / downSampleAmount;
    let coloredSamples = structure.MDSColorTimbreSamples(downSampledFeatures);
    coloredSamples = structure.MDSIntuitionFlip(coloredSamples, downSampledFeatures);
    const derivative = [Math.abs(coloredSamples[0] - coloredSamples[2])];
    for (let i = 1; i < coloredSamples.length - 1; i++) {
        derivative.push(Math.abs(coloredSamples[i + 1] - coloredSamples[i - 1]));
    }
    derivative.push(0);
    const peaks = noveltyDetection.findPeaks(derivative);
    const segmentedTimbreGraph = [];
    let prevPeakSample = 0;
    for (let p = 1; p <= peaks.length; p++) {
        const peak = p < peaks.length ? peaks[p] : { sample: coloredSamples.length, confidence: 1 };
        const segment = [];
        if (peak.confidence > confidenceThreshold) {
            for (let i = prevPeakSample + 1; i < peak.sample + 1; i++) {
                if (i < coloredSamples.length) segment.push(coloredSamples[i]);
            }

            const start = prevPeakSample * downSampleDuration;
            const end = start + segment.length * downSampleDuration;
            const section = new Section({ start, end });
            const smoothedSegment = filter.gaussianBlur1D(segment, 3, "mirror");
            section.graph = smoothedSegment;
            section.mdsFeature = segment.reduce((a, v, i) => (a * i + v) / (i + 1));
            segmentedTimbreGraph.push(section);
            prevPeakSample = peak.sample;
        }
    }

    const ssmTimbre = SSM.calculateSSM(data.timbreFeatures, data.sampleDuration);
    const blurredTimbreLarge = filter.gaussianBlur2DOptimized(ssmTimbre, 5);
    const timbreNoveltyColumn = noveltyDetection.absoluteEuclideanColumnDerivative(blurredTimbreLarge);
    const smoothTimbreNoveltyColumn = filter.gaussianBlur1D(timbreNoveltyColumn, 5);
    const timbreSegments = structure.createSegmentsFromNovelty(smoothTimbreNoveltyColumn, data.sampleDuration, 0.2);
    const processedTimbreSegments = structure.processTimbreSegments(
        data.timbreFeatures,
        timbreSegments,
        data.sampleDuration
    );

    const smoothedTimbreFeatures = filter.gaussianBlurFeatures(data.timbreFeatures, 2);
    const eventArray = events.detectAverageWindow(smoothedTimbreFeatures, data.sampleDuration, 20, 0.4);

    postMessage({
        timbreStructure: processedTimbreSegments,
        events: eventArray,
        segmentedTimbreGraph: segmentedTimbreGraph,
    });
});
