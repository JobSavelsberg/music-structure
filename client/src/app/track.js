export default class Track{
    trackData = null;
    analysisData = null;
    ssm = null;

    process(){
        this.calculateSSM();
    }

    calculateSSM(){
        const size = this.getSegments().length;
        this.ssm = new Array(size);
        for(let i = 0; i < size; i++){
            const SegmentI = this.getSegments()[i];
            this.ssm[i] = new Array(size-i);
            for(let j = i; j < size; j++){
                this.ssm[i][j-i]  = new Array(2);
                this.ssm[i][j-i][0] = this.pitchSimilarity(SegmentI, this.getSegment(j));
                this.ssm[i][j-i][1] = this.timbreSimilarity(SegmentI, this.getSegment(j));
            }
        }
    }

    // TODO: create good similarity measure
    segmentSimilarity(a, b){
        return  this.pitchSimilarity(a,b) * this.timbreSimilarity(a,b);
    }

    /**
     *  Pitch defined as [0,1]
     *  Low summed difference between pitches means high score
     *  Completely opposite pitches means lowest score
     * @param {*} a 
     * @param {*} b 
     */
    pitchSimilarity(a, b){
        let score = 12;
        for(let i = 0; i < 12; i++){
            score -= Math.abs(a.pitches[i] - b.pitches[i]);
        }
        return score / 12;
    }

    /**
     *  Timbre defined as [-100,100]
     *  Mapped to [0,1]
     *  Low summed difference between timbre means high score
     *  Completely opposite timbres means lowest score
     * @param {*} a 
     * @param {*} b 
     */
    timbreSimilarity(a, b){
        let score = 12;
        for(let i = 0; i < 12; i++){
            score -= Math.abs(a.timbre[i] - b.timbre[i])/200;
        }
        return score / 12;
    }



    constructor(trackData){
        this.trackData = trackData;
    }
    static createWithAnalysis(trackData, analysisData){
        const track = new Track(trackData)
        track.analysisData = analysisData;
    }

    static fromJSON(json){
        return this.createWithAnalysis(json.trackData, json.analysisData);
    }

    // Works with JSON.stringify!
    toJSON(){
        return {
            trackData: this.trackData,
            analysisData: this.analysisData,
        }
    }

    getId() { return this.trackData.id }
    hasAnalysis() { return this.analysisData !== null }
    getAnalysis(){ return this.analysisData; }
    setAnalysis(analysis) { 
        if(this.hasAnalysis && this.ssm !== null) return;
        this.analysisData = analysis; 
        console.log("processing");
        this.process();
        console.log("processed");
    }
    getName() {return this.trackData.name}
    getArtist() {return this.trackData.artist}
    getUri(){return this.trackData.uri}
    getSegments(){return this.analysisData.segments}
    getSegment(i){return this.analysisData.segments[i]}
    getSSM(){return this.ssm}
    getSSMValue(i,j){return this.ssm[i][j] }
    getBars(){return this.analysisData.bars}
    getBeats(){return this.analysisData.beats}
    getTatums(){return this.analysisData.tatums}

}