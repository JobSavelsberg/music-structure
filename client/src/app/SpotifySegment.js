import * as log from "../dev/log";
import * as audioUtil from "./audioUtil";

const tryRemovePercussion = true;

export default class SpotifySegment {
    segment = null;
    start = 0;
    duration = 0;
    loudness_start = 0;
    loudness_max_time = 0;
    loudness_max = 0;
    loudness_end = 0;

    pitches = [];
    timbres = [];
    timbresScaled = [];

    cluster = -1;
    tsneCoord = [0, 0];

    tonalityAngle = 0; // [0,1] Angle of vector on circle of fifths
    tonalityRadius = 0; // [0,1] Radius of vector on circle of fifths, low value means very dissonant or atonal
    tonalityEnergy = 0; // [0,1] Total energy of all the pitches, high energy means lots of notes played at the same time

    percussiony = 0; // [0,1] segments larger than .15

    constructor(segment) {
        this.segment = segment;
        this.start = segment.start;
        this.duration = segment.duration;
        this.loudness_start = segment.loudness_start;
        this.loudness_max = segment.loudness_max;
        this.loudness_max_time = segment.loudness_max_time;
        this.loudness_end = segment.loudness_end;
        this.processPitch();
        this.processPitchEqualizeBass();
    }

    processedPitch = false;
    processPitch() {
        if (this.processedPitch) return;
        if (this.processedPitchSmooth) throw Error("processed pitchSmooth before setting initial pitch");
        this.segment.pitches.forEach((pitch, i) => {
            this.pitches.push(pitch); //audioUtil.logCompression(pitch, GAMMA));
        });
        [this.tonalityAngle, this.tonalityRadius, this.tonalityEnergy] = audioUtil.tonality(this.pitches);

        const minDuration = 0.2;
        const decay = 0.5;
        const shortness = this.duration < minDuration ? 1 : decay - (this.duration - 0.15);
        this.percussiony = Math.max(Math.min(1, (1 - this.tonalityRadius) * this.tonalityEnergy * 2) * shortness, 0);
        this.processedPitch = true;
    }

    processedPitchSmooth = false;
    processPitchSmooth(prevSegment, nextSegment) {
        if (!tryRemovePercussion) return;
        if (this.processedPitchSmooth) return;
        if (!this.processedPitch) throw Error("processed pitchSmooth called before setting initial pitch");

        for (let p = 0; p < this.pitches.length; p++) {
            this.pitches[p] =
                (1 - this.percussiony) * this.pitches[p] +
                this.percussiony * prevSegment.pitches[p] * this.pitches[p] +
                (nextSegment.pitches[p] * this.pitches[p]) / 2;
        }

        this.processedPitchSmooth = true;
    }

    processPitchEqualizeBass() {
        let maxPitch = 0;
        this.pitches.forEach((pitch) => {
            if (pitch > maxPitch) {
                maxPitch = pitch;
            }
        });

        let secondMaxPitch = 0;
        this.pitches.forEach((pitch) => {
            if (pitch < maxPitch && pitch > secondMaxPitch) {
                secondMaxPitch = pitch;
            }
        });

        const equalizeAmount = 0; // 1 is full equalize: loudest is same as second loudest, 0 is none
        const scale = 1 / (1 - (maxPitch - secondMaxPitch) * equalizeAmount);
        for (let p = 0; p < this.pitches.length; p++) {
            this.pitches[p] = Math.min(1, this.pitches[p] * scale);
        }
    }

    processedTimbre = false;
    processTimbre(min, max, biggest, totalBiggest) {
        if (this.processedTimbre) return;
        this.segment.timbre.forEach((timbre, i) => {
            this.timbres.push(timbre / totalBiggest);
        });
        this.segment.timbre.forEach((timbre, i) => {
            this.timbresScaled.push(timbre / biggest[i]);
        });
        this.processedTimbre = true;
    }

    getPitches() {
        return this.pitches;
    }
    getTimbres() {
        return this.timbres;
    }
    getDuration() {
        return this.duration_ms;
    }
    getStart() {
        return this.start;
    }
    getEnd() {
        return this.start + this.duration;
    }
    getOriginalTimbres() {
        return this.segment.timbre;
    }
    getFeatures() {
        return this.pitches.concat(this.timbres);
    }
    setCluster(i) {
        this.cluster = i;
    }
    setTSNECoord(coord) {
        this.tsneCoord = coord;
    }
    getTonalEnergy() {
        return this.tonalityEnergy;
    }
    getTonalAngle() {
        return this.tonalityAngle;
    }
    getLoudnessFeatures() {
        return [
            audioUtil.loudness(this.loudness_start),
            audioUtil.loudness(this.loudness_max),
            this.loudness_max_time,
            audioUtil.loudness(this.loudness_end),
        ];
    }
    getAverageLoudness(nextSegmentLoudness) {
        const loudnessFeatures = this.getLoudnessFeatures();
        const start = loudnessFeatures[0];
        const end = nextSegmentLoudness;
        const max = loudnessFeatures[1];
        const maxTime = loudnessFeatures[2];

        const avgFirst = (max + start) / 2;
        const avgSecond = (max + end) / 2;
        const avg = avgFirst * maxTime + avgSecond * (1 - maxTime);
        return avg;
    }
}
