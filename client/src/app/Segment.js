import * as audioUtil from "./audioUtil";

export default class Segment{
    segment = null;
    start = 0;
    duration = 0;
    loudness_max = 0;

    pitches = [];
    timbres = [];

    cluster = -1;
    tsneCoord = [0,0];

    tonalityAngle = 0; // [0,1] Angle of vector on circle of fifths 
    tonalityRadius = 0; // [0,1] Radius of vector on circle of fifths, low value means very dissonant or atonal
    tonalityEnergy = 0; // [0,1] Total energy of all the pitches, high energy means lots of notes played at the same time

    percussiony = 0; // [0,1] segments larger than .15

    constructor(segment){
        this.segment = segment;
        this.start = segment.start;
        this.duration = segment.duration;
        this.loudness_max = segment.loudness_max;
    }

    processPitch(GAMMA){
        this.segment.pitches.forEach((pitch, i) => {
            this.pitches.push(pitch);//audioUtil.logCompression(pitch, GAMMA));
        });
        [this.tonalityAngle, this.tonalityRadius, this.tonalityEnergy] = audioUtil.tonality(this.pitches);

        const minDuration = .2;
        const decay = .5;
        const shortness = this.duration < minDuration ? 1 : (decay-(this.duration-.15));
        this.percussiony = Math.min(1,(1-this.tonalityRadius)*this.tonalityEnergy*2)*shortness;
    }

    processPitchSmooth(prevSegment, nextSegment){
        for(let p = 0; p < this.pitches.length; p++){
            this.pitches[p] = (1-this.percussiony)*this.pitches[p] + this.percussiony*(prevSegment.pitches[p]+nextSegment.pitches[p])/2;
        }
    }

    processTimbre(min, max, biggest){
        this.segment.timbre.forEach((timbre, i) => {
            this.timbres.push(timbre/biggest[i]);
        });
    }

    getPitches(){return this.pitches}
    getTimbres(){return this.timbres}
    getDuration(){return this.duration_ms}
    getStart(){return this.start}
    getOriginalTimbres(){return this.segment.timbre}
    getFeatures(){return this.pitches.concat(this.timbres)}
    setCluster(i){this.cluster = i}
    setTSNECoord(coord){this.tsneCoord = coord}
    getTonalEnergy(){return this.tonalityEnergy}
    getTonalAngle(){return this.tonalityAngle}
}