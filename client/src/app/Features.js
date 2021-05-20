import * as log from "../dev/log";
import SpotifySegment from "./SpotifySegment";
import * as chordDetection from "./chordDetection";
import * as filter from "./filter";
import { lowerFirst } from "lodash";

const timbreNormalizationAmount = 0.2;

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
        noise: [],
        timbres: [],
        loudness: [],
        avgLoudness: [],
        dynamics: [],
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

    fastSampledPitch = [];
    fastSampleDuration = 0.1;

    downSampledTimbre = [];

    directLoudnessSampleDuration = 0.25;
    directLoudnessAmount;
    directLoudness;

    maxLoudness;
    averageLoudness;

    dynamicsBase = 0.12;

    constructor(analysisData, options = {}) {
        this.duration = analysisData.track.duration;
        analysisData.segments.forEach((segment) => {
            this.segments.push(new SpotifySegment(segment));
            this.segmentStartDuration.push([segment.start, segment.duration]);
        });
        this.length = this.segments.length;
        this.sampleAmount = Math.min(Math.ceil(this.duration / options.sampleDuration), options.samples);
        this.sampleDuration = analysisData.track.duration / this.sampleAmount;
        log.info("Sampling, Amount:", this.sampleAmount, "Duration: ", this.sampleDuration);
        this.sampleBlur = options.sampleBlur || 1;
        this.fillBeatsStartDuration(analysisData.beats);
        this.calculateMaxMin();
        log.debug(this.timbreBiggest);
        log.debug("total biggest timbre", this.timbreTotalBiggest);
        this.processSegments();
        if (this.segments.length) this.processDirectLoudness();
        this.sampleFeatures();
        this.processSamples();
        this.downSampledTimbre = this.downSampleTimbre(options.downsampleAmount);
        this.fastSampledPitch = this.sample("pitches", { sampleDuration: this.fastSampleDuration });
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

            this.processed.pitches.push(s.pitches);
            this.processed.noise.push(s.noise);

            this.processed.loudness.push(s.getLoudnessFeatures());
            const nextSegmentStartLoudness =
                i + 1 < this.segments.length ? this.segments[i + 1].getLoudnessFeatures()[0] : 0;
            this.processed.avgLoudness.push(s.getAverageLoudness(nextSegmentStartLoudness));
            this.processed.dynamics.push(s.getAverageLoudness(nextSegmentStartLoudness));

            s.processTimbre(this.timbreMin, this.timbreMax, this.timbreBiggest, this.timbreTotalBiggest);
            const timbres = [];
            for (let t = 0; t < 12; t++) {
                if (t === 0) {
                    // replace by loudnes
                    const timbre = this.processed.avgLoudness[this.processed.avgLoudness.length - 1] - 0.5;
                    timbres.push(timbre);
                } else {
                    const timbre =
                        (1 - timbreNormalizationAmount) * s.timbres[t] + timbreNormalizationAmount * s.timbresScaled[t];
                    timbres.push(timbre);
                }
            }
            this.processed.timbres.push(timbres);

            this.processed.tonalEnergy.push(s.tonalityEnergy);
            this.processed.tonalRadius.push(s.tonalityRadius);
            this.processed.tonalAngle.push(s.tonalityAngle);
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

    processDirectLoudness() {
        this.directLoudnessAmount = Math.floor(this.duration / this.directLoudnessSampleDuration);
        this.directLoudness = new Float32Array(this.directLoudnessAmount);

        log.info(
            "Process direct loudness",
            "duration",
            this.duration,
            "segmentAmount",
            this.segmentStartDuration.length,
            "amount",
            this.directLoudnessAmount
        );

        let segmentIndex = 0;
        for (let i = 0; i < this.directLoudnessAmount; i++) {
            const time = this.directLoudnessSampleDuration * i;
            while (!this.isTimeInSegment(segmentIndex, time)) {
                segmentIndex++;
            }
            this.directLoudness[i] = this.getExactLoudness(segmentIndex, time);
        }
    }

    isTimeInSegment(index, time) {
        const start = this.segmentStartDuration[index][0];
        const end = start + this.segmentStartDuration[index][1];
        return time >= start && time < end;
    }

    getExactLoudness(index, time) {
        const startLoudness = this.raw.loudness[index][0];
        const endLoudness = index + 1 < this.segmentStartDuration.length ? this.raw.loudness[index + 1][0] : 0;
        const startTime = this.segmentStartDuration[index][0];
        const fraction = (time - startTime) / this.segmentStartDuration[index][1];
        //return fraction * endLoudness + (1 - fraction) * startLoudness;
        return this.raw.loudness[index][1];
    }

    processSamples() {
        this.sampled.pitches;
        this.sampled.timbres;

        //this.sampled.pitches = filter.gaussianBlurFeatures(this.sampled.pitches, 4);

        this.sampled.chords = [];
        this.sampled.majorminor = [];
        for (let i = 0; i < this.sampleAmount; i++) {
            this.sampled.chords[i] = chordDetection.getPopChord(this.sampled.pitches[i]);
            this.sampled.majorminor[i] = chordDetection.getMajorMinorNess(this.sampled.pitches[i]);
        }

        this.sampled.smoothedAvgLoudness = filter.gaussianBlur1D(this.sampled.avgLoudness, 1);
        this.averageLoudness = 0;
        this.maxLoudness = 0;
        this.sampled.smoothedAvgLoudness.forEach((loudness) => {
            this.averageLoudness += loudness;
            if (loudness > this.maxLoudness) {
                this.maxLoudness = loudness;
            }
        });
        log.debug("Maxloudness", this.maxLoudness);
        log.debug(this.sampled.dynamics[0]);
        log.debug(this.sampled.dynamics[0] / this.maxLoudness);
        log.debug((this.sampled.dynamics[0] / this.maxLoudness) * (1 - this.dynamicsBase) + this.dynamicsBase);

        this.processed.dynamics = this.processed.dynamics.map((dynamic) => {
            return (dynamic / this.maxLoudness) * (1 - this.dynamicsBase) + this.dynamicsBase;
        });
        this.sampled.dynamics = this.sampled.dynamics.map((dynamic) => {
            return (dynamic / this.maxLoudness) * (1 - this.dynamicsBase) + this.dynamicsBase;
        });
        log.debug(this.sampled.dynamics[0]);

        this.averageLoudness /= this.sampled.smoothedAvgLoudness.length;
    }

    sample(feature, options) {
        const sampledFeature = [];

        let sampleAmount = 0;
        let sampleDuration = 0;
        if (options.sampleDuration) {
            // make sure the length of the track is divisble by sampleDuration
            sampleAmount = Math.round(this.duration / options.sampleDuration);
            sampleDuration = this.duration / sampleAmount;
        }
        if (options.sampleAmount) {
            sampleAmount = options.sampleAmount;
            sampleDuration = this.duration / sampleAmount;
        }

        let i = 0;
        for (let s = 0; s < sampleAmount; s++) {
            const averageFeature = new Float32Array(12).fill(0);

            const sampleStart = s * sampleDuration;
            const sampleEnd = (s + 1) * sampleDuration;

            // Sample is contained in segment, simply copy pitch from segment and go to next sample
            if (this.segments[i].getEnd() > sampleEnd) {
                averageFeature.forEach((val, f) => (averageFeature[f] = val + this.segments[i][feature][f]));
                sampledFeature.push(averageFeature);
                continue;
            }

            // add part of first segment
            if (this.segments[i].getEnd() > sampleStart) {
                const weight = (this.segments[i].getEnd() - sampleStart) / sampleDuration;
                averageFeature.forEach((val, f) => (averageFeature[f] = val + weight * this.segments[i][feature][f]));
                i++;
            }

            // while entire segment is contained in sample
            while (i < this.segments.length && this.segments[i].getEnd() < sampleEnd) {
                const weight = this.segments[i].duration / sampleDuration;
                averageFeature.forEach((val, f) => (averageFeature[f] = val + weight * this.segments[i][feature][f]));
                i++;
            }

            // add part of last segment
            if (i < this.segments.length) {
                const weight = (sampleEnd - this.segments[i].start) / sampleDuration;
                averageFeature.forEach((val, f) => (averageFeature[f] = val + weight * this.segments[i][feature][f]));
            }

            sampledFeature.push(averageFeature);
        }
        return sampledFeature;
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

    downSampleTimbre(amount) {
        const downSampleAmount = amount;
        const downSampleRatio = this.sampleAmount / (downSampleAmount + 1);
        const downSampledTimbre = [];
        for (let i = 0; i < downSampleAmount; i++) {
            const startIndex = i * downSampleRatio;
            const endIndex = (i + 1) * downSampleRatio;

            const startSample = Math.floor(startIndex);
            const startSampleWeight = 1 - (startIndex - startSample);
            const endSample = Math.floor(endIndex);
            const endSampleWeight = endIndex - endSample;

            let summedTimbre = new Float32Array(12).fill(0);

            for (let f = 0; f < 12; f++) {
                summedTimbre[f] += this.sampled.timbres[startSample][f] * startSampleWeight;
                summedTimbre[f] += this.sampled.timbres[endSample][f] * endSampleWeight;
            }

            for (let s = startSample + 1; s < endSample; s++) {
                for (let f = 0; f < 12; f++) {
                    summedTimbre[f] += this.sampled.timbres[s][f];
                }
            }

            for (let f = 0; f < 12; f++) {
                summedTimbre[f] /= downSampleRatio;
            }

            downSampledTimbre.push(summedTimbre);
        }
        return downSampledTimbre;
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

export function downSample(features, sampleAmount) {
    const ratio = features.length / sampleAmount;
    const newFeatures = [];
    for (let i = 0; i < sampleAmount; i++) {
        const average = new Float32Array(12);
        const firstIndex = Math.floor(i * ratio);
        const firstWeight = 1 - (i * ratio - firstIndex);
        const lastIndex = Math.floor((i + 1) * ratio);
        const lastWeight = (i + 1) * ratio - lastIndex;

        if (firstWeight > 0) {
            for (let f = 0; f < 12; f++) {
                average[f] += (features[firstIndex][f] * firstWeight) / ratio;
            }
        }
        if (lastWeight > 0) {
            for (let f = 0; f < 12; f++) {
                average[f] += (features[lastIndex][f] * lastWeight) / ratio;
            }
        }

        //middle
        for (let j = firstIndex + 1; j < lastIndex; j++) {
            for (let f = 0; f < 12; f++) {
                average[f] += features[j][f] / ratio;
            }
        }
        newFeatures.push(average);
    }
    return newFeatures;
}
