import { same } from "numeric";
import HalfMatrix from "./dataStructures/HalfMatrix";
import { NumberType } from "./dataStructures/NumberType";
import Track from "./Track";
import * as log from "../dev/log";
import Features from "./Features";
import * as workers from "./workers/workers";

const preset1 = "AABB";
const sampleAmount = 250;
const sampleDuration = 1;
const templateSegment = {
    start: 0,
    duration: 1,
    pitches: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    timbre: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    loudness_start: 0,
    loudness_max: 1,
    loudness_max_time: 0.5,
    loudness_end: 0,
};
const templateElement = {
    start: 0,
    duration: 1,
    confidence: 1,
};
export default class SynthesizedTrack extends Track {
    synthesizerString;
    constructor(trackData, synthesizerString) {
        trackData.name = synthesizerString;
        trackData.artist = "synthesizer";
        super(trackData);

        this.synthesizerString = synthesizerString;

        const track = {
            duration: sampleAmount,
        };
        this.analysisData = {
            track,
            segments: [templateSegment],
            beats: [templateElement],
            tatums: [templateElement],
            bars: [templateElement],
            sections: [templateElement],
        };

        this.features = new Features(this.analysisData, {
            samples: sampleAmount,
            sampleBlur: Track.sampleBlur,
        });
        this.process();
    }

    process() {
        log.debug("Processing synthesized track");
        const pitchSSM = synthesizeSSMPitch(sampleAmount, this.synthesizerString);
        const timbreSSM = synthesizeSSMTimbre(sampleAmount, this.synthesizerString);

        workers
            .startSSM(this.getID(), null, null, new Float32Array(sampleAmount).fill(1), sampleDuration, null, this.features.beatsStartDuration, {
                sampleAmount: sampleAmount,
                blurTime: Track.blurTime,
                enhanceBlurLength: Track.enhanceBlurLength,
                threshold: Track.threshold,
                thresholdPercentage: Track.thresholdPercentage,
                tempoRatios: Track.tempoRatios,
                allPitches: false,
                SPminSize: Track.SPminSize,
                SPstepSize: Track.SPstepSize,
                createScapePlot: Track.createScapePlot,
                synthesized: true,
                synthesizedSSMPitch: pitchSSM.getBuffer(),
                synthesizedSSMTimbre: timbreSSM.getBuffer(),
            })
            .then((result) => {
                log.debug("Done processing")
                this.matrixes = result.matrixes;
                this.graphFeatures = result.graphs;
                this.scapePlot = result.scapePlot;
                this.scapePlotAnchorColor = result.scapePlotAnchorColor;
                this.structureSections = result.structureSections;
                this.optimalStructure = result.optimalStructure;
                this.structures = result.structures;
                window.eventBus.$emit("readyForVis");
            });
    }
    hasAnalysis() {
        return true;
    }
}

export function synthesizeSSMPitch(sampleAmount, preset) {
    const ssm = new HalfMatrix({
        size: sampleAmount,
        numberType: HalfMatrix.NumberType.UINT8,
        sampleDuration: 1,
        featureAmount: 1,
    });

    const sections = preset.split("");
    const sectionLength = Math.floor(sampleAmount / sections.length);
    sections.forEach((ySection, yIndex) => {
        const yOffset = yIndex * sectionLength;
        sections.forEach((xSection, xIndex) => {
            if (ySection === xSection) {
                const xOffset = xIndex * sectionLength;
                for (let i = 0; i < sectionLength; i++) {
                    ssm.setValueNormalizedMirrored(xOffset + i, yOffset + i, 1);
                }
            }
        });
    });
    return ssm;
}
export function synthesizeSSMTimbre(sampleAmount, preset) {
    const ssm = new HalfMatrix({
        size: sampleAmount,
        numberType: HalfMatrix.NumberType.UINT8,
        sampleDuration: 1,
        featureAmount: 1,
    });

    const sections = preset.split("");
    const sectionLength = Math.floor(sampleAmount / sections.length);
    sections.forEach((ySection, yIndex) => {
        const yOffset = yIndex * sectionLength;
        sections.forEach((xSection, xIndex) => {
            if (ySection === xSection) {
                const xOffset = xIndex * sectionLength;
                for (let y = 0; y < sectionLength; y++) {
                    for (let x = 0; x <= y; x++) {
                        ssm.setValueNormalizedMirrored(xOffset + x, yOffset + y, 1);
                    }
                }
            }
        });
    });
    return ssm;
}
