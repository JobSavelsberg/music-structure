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
    beatsStartDuration = [];
    raw = { pitches: [], timbres: [], loudness: [] };
    processed = {
        pitches: [],
        timbres: [],
        loudness: [],
        tonalEnergy: [],
        tonalRadius: [],
        tonalAngle: [],
    };

    clusterSelection = [];
    tsneSelection = [];

    sampleDuration = 0;
    sampleAmount = 0;
    sampled = {};
    sampleStartDuration = [];
    sampleBlur = 0; // in proportion to duration (<1 is no blur, 2 is blur of twice duration)

    constructor(analysisData, options = {}) {
        this.duration = analysisData.track.duration;
        log.debug("Segment Amount: ", analysisData.segments.length);
        analysisData.segments.forEach((segment) => {
            this.segments.push(new Segment(segment));
            this.segmentStartDuration.push([segment.start, segment.duration]);
        });
        this.length = this.segments.length;
        this.sampleAmount = options.samples || Math.ceil(this.duration / options.sampleDuration) || 200;
        this.sampleDuration = analysisData.track.duration / this.sampleAmount;
        this.sampleBlur = options.sampleBlur || 1;
        log.info("Reducing segments, sample amount:", this.sampleAmount);
        log.info("Amount of beats:", analysisData.beats.length);
        this.fillBeatsStartDuration(analysisData.beats);
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

    fillBeatsStartDuration(beats) {
        beats.forEach((beat) => {
            this.beatsStartDuration.push([beat.start, beat.duration]);
        });
    }

    processSegments() {
        this.segments.forEach((s, i) => {
            this.raw.pitches[i] = s.segment.pitches;
            this.raw.timbres[i] = s.segment.timbre;
            this.raw.loudness[i] = s.getLoudnessFeatures();
            s.processPitch();
            s.processTimbre(this.timbreMin, this.timbreMax, this.timbreBiggest, this.timbreTotalBiggest);
            this.processed.pitches.push(s.pitches);
            this.processed.timbres.push(s.timbres);
            //this.processed.timbres.push(s.timbresScaled);
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
        // Fill sample start duration
        for (let i = 0; i < this.sampleAmount - 1; i++) {
            this.sampleStartDuration.push([i * this.sampleDuration, this.sampleDuration]);
        }
        // Last sample is shorter
        const lastSampleStart = (this.sampleAmount - 1) * this.sampleDuration;
        this.sampleStartDuration.push([lastSampleStart, this.duration - lastSampleStart]);
        this.initSampleFeatures();

        const blurDuration = this.sampleBlur * this.sampleDuration;

        const blurOutsideSampleDuration = (blurDuration - this.sampleDuration) / 2;

        this.segments.forEach((segment, segmentIndex) => {
            const segmentEnd = segment.start + segment.duration;

            // calculate range of samples e.g. [2,6] clip by 0 and size
            const sampleRangeStartIndex = Math.max(
                0,
                Math.floor((segment.start - blurOutsideSampleDuration) / this.sampleDuration)
            );
            const sampleRangeEndIndex = Math.min(
                this.sampleAmount - 1,
                Math.floor((segmentEnd + blurOutsideSampleDuration) / this.sampleDuration)
            );

            const rangeSize = sampleRangeEndIndex - sampleRangeStartIndex;
            if (rangeSize >= 1) {
                // first sample in range
                const firstSample = this.sampleStartDuration[sampleRangeStartIndex];
                const sampleBlurEnd = firstSample[0] + firstSample[1] + blurOutsideSampleDuration;
                const firstSampleOverlap = sampleBlurEnd - segment.start;
                // firstSampleValue += firstSampleOverlap*segment.value;
                this.addFeaturesScaled(sampleRangeStartIndex, segmentIndex, firstSampleOverlap);
            }
            if (rangeSize >= 1) {
                // last sample in range
                const sampleBlurStart = this.sampleStartDuration[sampleRangeEndIndex][0] - blurOutsideSampleDuration;
                const lastSampleOverlap = segmentEnd - sampleBlurStart;
                //lastSampleValue += lastSampleOverlap*segment.value;
                this.addFeaturesScaled(sampleRangeEndIndex, segmentIndex, lastSampleOverlap);
            }
            if (rangeSize >= 2) {
                // every middle sample
                for (let i = sampleRangeStartIndex + 1; i < sampleRangeEndIndex; i++) {
                    //sampleValue += segment.duration*segment.value
                    this.addFeaturesScaled(i, segmentIndex, blurDuration);
                }
            }
            if (rangeSize === 0) {
                this.addFeaturesScaled(sampleRangeStartIndex, segmentIndex, segment.duration);
            }
        });

        // First sample has only blur on right
        //this.samples[0] /= this.sampleDuration + blurOutsideSampleDuration;
        this.divideFeatures(0, this.sampleDuration + blurOutsideSampleDuration);

        // Last sample has shorter duration and only blur on left
        //this.samples[this.sampleAmount-1] /= this.sampleStartDuration[this.sampleAmount-1].duration + blurOutsideSampleDuration;
        this.divideFeatures(
            this.sampleAmount - 1,
            this.sampleStartDuration[this.sampleAmount - 1][1] + blurOutsideSampleDuration
        );

        for (let i = 1; i < this.sampleAmount - 1; i++) {
            //this.samples[i] /= blurDuration
            this.divideFeatures(i, blurDuration);
        }
    }

    initSampleFeatures() {
        for (const featureName in this.processed) {
            this.sampled[featureName] = new Array(this.sampleAmount).fill(0);
            const featureSize = this.processed[featureName][0].length;

            if (featureSize) {
                for (let s = 0; s < this.sampleAmount; s++) {
                    this.sampled[featureName][s] = new Array(this.processed[featureName][0].length).fill(0);
                }
            } else {
                for (let s = 0; s < this.sampleAmount; s++) {
                    this.sampled[featureName][s] = 0;
                }
            }
        }
    }

    setFeaturesScaled(sampleIndex, segmentIndex, scalar) {
        for (const featureName in this.processed) {
            const featureSize = this.processed[featureName][0].length;
            if (featureSize) {
                for (let i = 0; i < featureSize; i++) {
                    this.sampled[featureName][sampleIndex][i] = this.processed[featureName][segmentIndex][i] * scalar;
                }
            } else {
                this.sampled[featureName][sampleIndex] = this.processed[featureName][segmentIndex] * scalar;
            }
        }
    }

    addFeaturesScaled(sampleIndex, segmentIndex, scalar) {
        for (const featureName in this.processed) {
            const featureSize = this.processed[featureName][0].length;
            if (featureSize) {
                for (let i = 0; i < featureSize; i++) {
                    this.sampled[featureName][sampleIndex][i] += this.processed[featureName][segmentIndex][i] * scalar;
                }
            } else {
                this.sampled[featureName][sampleIndex] += this.processed[featureName][segmentIndex] * scalar;
            }
        }
    }

    divideFeatures(sampleIndex, divisor) {
        for (const featureName in this.sampled) {
            const featureSize = this.processed[featureName][0].length;
            if (featureSize) {
                for (let i = 0; i < featureSize; i++) {
                    this.sampled[featureName][sampleIndex][i] /= divisor;
                }
            } else {
                this.sampled[featureName][sampleIndex] /= divisor;
            }
        }
    }
}
