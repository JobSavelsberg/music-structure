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

    constructor(segment){
        this.segment = segment;
        this.start = segment.start;
        this.duration = segment.duration;
        this.loudness_max = segment.loudness_max;
    }

    processPitch(GAMMA){
        this.segment.pitches.forEach((pitch, i) => {
            this.pitches.push(audioUtil.logCompression(pitch, GAMMA));
        });
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
}