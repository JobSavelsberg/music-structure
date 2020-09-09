const { spotify } = require("./app");

export default class Track{
    trackData = null;
    analysisData = null;

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
    setAnalysis(analysis) { this.analysisData = analysis}
    getName() {return this.trackData.name}
    getArtist() {return this.trackData.artist}
    getUri(){return this.trackData.uri}

}