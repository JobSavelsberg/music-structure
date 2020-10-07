import * as log from "../dev/log";
import Segment from "./Segment";

export default class Features {
    timbreMax = new Array(12).fill(0);
    timbreMin = new Array(12).fill(0);
    timbreBiggest = new Array(12).fill(0);
    timbreTotalBiggest = 0;

    duration = 0;
    length = 0;
    segments = [];
    segmentStartDuration = [];
    raw = { pitches: [], timbres: [], loudness: [] };
    processed = { pitches: [], timbres: [], loudness: [], tonalEnergy: [], tonalRadius: [], tonalAngle: [] };

    clusterSelection = [];
    tsneSelection = [];

    sampleDuration = 0;
    sampleAmount = 0;
    sampled = {};

    constructor(analysisData, sampleRate) {
        analysisData.segments.forEach((segment) => {
            this.segments.push(new Segment(segment));
            this.segmentStartDuration.push([segment.start, segment.duration]);
        });
        this.length = this.segments.length;
        this.sampleDuration = 1 / sampleRate;
        this.duration = analysisData.track.duration;
        this.sampleAmount = Math.ceil(analysisData.track.duration / sampleRate);
        log.info("Reducing segments, sample amount:", this.sampleAmount);
        this.calculateMaxMin();
        this.processSegments();
        this.sampleFeatures();
    }

    /**
     * The values calculated in this function are used to scale the raw features
     */
    calculateMaxMin() {
        this.segments.forEach((segment, index) => {
            for (let i = 0; i < 12; i++) {
                this.timbreMax[i] = Math.max(this.timbreMax[i], segment.getOriginalTimbres()[i]);
                this.timbreMin[i] = Math.min(this.timbreMin[i], segment.getOriginalTimbres()[i]);
            }
        });
        for (let i = 0; i < 12; i++) {
            this.timbreBiggest[i] = Math.max(Math.abs(this.timbreMax[i]), Math.abs(this.timbreMin[i]));
            this.timbreTotalBiggest = Math.max(this.timbreTotalBiggest, this.timbreBiggest[i]);
        }
    }

    processSegments() {
        this.segments.forEach((s, i) => {
            this.raw.pitches = s.segment.pitches;
            this.raw.timbres = s.segment.timbres;
            this.raw.loudness = s.getLoudnessFeatures();
            s.processPitch();
            s.processTimbre(this.timbreMin, this.timbreMax, this.timbreBiggest, this.timbreTotalBiggest);
            this.processed.pitches.push(s.pitches);
            this.processed.timbres.push(s.timbres);
            this.processed.tonalEnergy.push(s.tonalityEnergy);
            this.processed.tonalRadius.push(s.tonalityRadius);
            this.processed.tonalAngle.push(s.tonalityAngle);
            this.processed.loudness.push(s.getLoudnessFeatures());
        });

        for (let i = 0; i < this.segments.length; i++) {
            // Try to remove percussion from pitch features
            if (i > 0 && i < this.segments.length - 1) {
                this.segments[i].processPitchSmooth(this.segments[i - 1], this.segments[i + 1]);
            }

            // Create feature selections
            this.clusterSelection.push([
                ...this.processed.timbres[i],
                this.processed.tonalEnergy[i],
                this.processed.tonalRadius[i],
                ...this.processed.loudness[i],
            ]);
            this.tsneSelection.push([
                ...this.processed.timbres[i],
                this.processed.tonalEnergy[i],
                this.processed.tonalRadius[i],
                ...this.processed.loudness[i],
            ]);
        }
    }

    /**
     * Turn processed features into evenly discretized features int
     */
    sampleFeatures() {
        let sample = 0;
        let timeLeft = this.sampleDuration;
        // moving to next sample
        this.initSampleFeatures();
        for (let i = 0; i < this.segments.length; i++) {
            const segment = this.segments[i];
            let duration = segment.duration;

            this.addFeaturesScaled(sample, i, duration);

            if (duration > timeLeft) {
                // Add remaining segment and divide
                this.addFeaturesScaled(sample, i, timeLeft);
                this.divideFeatures(sample, this.sampleDuration - timeLeft);

                // If we reached the end of all samples we quit
                if (sample + 1 >= this.sampleAmount) {
                    break;
                }
                // Start next sample with remaining segment, and subtract remaining segment duration from timeLeft

                sample++;
                const remainingSegmentDuration = duration - timeLeft;
                this.addFeaturesScaled(sample, i, remainingSegmentDuration);
                timeLeft = this.sampleDuration - remainingSegmentDuration;
            } else {
                // If the segment fits in the sample
                this.setFeaturesScaled(sample, i, duration);
                timeLeft -= duration;
            }
        }

        this.divideFeatures(sample, this.sampleDuration - timeLeft);
    }

    initSampleFeatures() {
        for (const featureName in this.processed) {
            this.sampled[featureName] = new Array(this.sampleAmount).fill(0);
            if (this.processed[featureName][0].length) {
                for (let s = 0; s < this.sampleAmount; s++) {
                    this.sampled[featureName][s] = new Array(this.processed[featureName][0].length).fill(0);
                }
            }
        }
    }

    setFeaturesScaled(sample, index, scalar) {
        for (const featureName in this.processed) {
            if (this.processed[featureName][sample].length) {
                for (let i = 0; i < this.processed[featureName][sample].length; i++) {
                    this.sampled[featureName][sample][i] = this.processed[featureName][index][i] * scalar;
                }
            } else {
                this.sampled[featureName][sample] = this.processed[featureName][index] * scalar;
            }
        }
    }

    addFeaturesScaled(sample, index, scalar) {
        for (const featureName in this.processed) {
            if (this.processed[featureName][sample].length) {
                for (let i = 0; i < this.processed[featureName][sample].length; i++) {
                    this.sampled[featureName][sample][i] += this.processed[featureName][index][i] * scalar;
                }
            } else {
                this.sampled[featureName][sample] += this.processed[featureName][index] * scalar;
            }
        }
    }

    divideFeatures(sample, divisor) {
        for (const featureName in this.sampled) {
            if (this.sampled[featureName][sample].length) {
                for (let i = 0; i < this.sampled[featureName][sample].length; i++) {
                    this.sampled[featureName][sample][i] /= divisor;
                }
            } else {
                this.sampled[featureName][sample] /= divisor;
            }
        }
    }
}
