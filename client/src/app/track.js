import Segment from "./Segment"
import * as sim from "./similarity"
import * as clustering from "./clustering"
import * as skmeans from "skmeans";
import tsneWorker from './workers'

const GAMMA = 1.7;

export default class Track{
    trackData = null;
    analysisData = null;
    segmentObjects = [];
    ssm = null;
    timbreMax = new Array(12).fill(0);
    timbreMin = new Array(12).fill(0);
    timbreBiggest = new Array(12).fill(0);

    preprocessed = false;

    features = []

    process(){
        this.createSegmentObjects(); // create extended objects holding more info
        this.calculateMaxMin(); // calculate scaling coeficcients
        this.preprocesSegments(); // use max min to scale
        this.preprocessed = true;
        this.calculateSSM();
        this.cluster();
        this.tsne();
    }

    createSegmentObjects(){
        console.log("Creating segmentObjects")
        this.analysisData.segments.forEach((segment) => {
            this.segmentObjects.push(new Segment(segment));
        })
        console.log("Created segmentObjects")
    }

    calculateMaxMin(){
        this.getSegments().forEach((segment, index) => {
            for(let i = 0; i < 12; i++){
                this.timbreMax[i] = Math.max(this.timbreMax[i], segment.getOriginalTimbres()[i]);
                this.timbreMin[i] = Math.min(this.timbreMin[i], segment.getOriginalTimbres()[i]);
            }
        });
        for(let i = 0; i < 12; i++){
            this.timbreBiggest[i] = Math.max(Math.abs(this.timbreMax[i]), Math.abs(this.timbreMin[i]));
        }
        console.log(this.timbreBiggest);
    }

    preprocesSegments(){
        this.segmentObjects.forEach((s, i) => {
            s.processPitch(GAMMA);
            s.processTimbre(this.timbreMin, this.timbreMax, this.timbreBiggest);
            this.features.push([...s.pitches, ...s.timbres]);
        });
    }


    /**
     * Self similarity matrix, takes a few seconds so async is needed
     */
    calculateSSM(){
        console.log("Calculating SSM");
        const size = this.segmentObjects.length;
        //const pitchRange = 1*12;
        //const timbreRange = 2*12;
        //const maxEuclidianPitchRange = sim.maxEuclidianDistance(12, 1);
        //const maxEuclidianRimbreRange = sim.maxEuclidianDistance(12, 2);
        this.ssm = new Array(size);
        for(let i = 0; i < size; i++){
            const SegmentI = this.segmentObjects[i];
            this.ssm[i] = new Array(size-i);
            for(let j = i; j < size; j++){
                this.ssm[i][j-i]  = new Array(2);
                this.ssm[i][j-i][0] = sim.cosine(SegmentI.getPitches(), this.segmentObjects[j].getPitches());
                this.ssm[i][j-i][1] = sim.cosine(SegmentI.getTimbres(), this.segmentObjects[j].getTimbres());
            }
        }
        console.log("Done calculating SSM!");

    }
    
    cluster(){
        //clustering.kMeans(this.segmentObjects, 10);
        console.log("kmeans processing...")
        const res = skmeans(this.features, 10);
        res.idxs.forEach((cluster, index) => {
            this.segmentObjects[index].setCluster(cluster);
        })
        console.log("kmeans done")

    }

    tsne(){
        console.log("sending worker message");
        tsneWorker.terminate();
        tsneWorker.send({features: this.features}).then((coords) => {
            console.log(`GOT TSNE RESULTS BACK FROM ${this.trackData.name}`);
            coords.forEach((coord, index)=>{
                this.segmentObjects[index].setTSNECoord(coord);
            });
            // TODO: Save tsne
        })
    }

    constructor(trackData){
        this.trackData = trackData;
    }
    static createWithAnalysis(trackData, analysisData){
        const track = new Track(trackData)
        this.setAnalysis(analysisData);
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
    hasAnalysis() { return this.analysisData !== null &&  this.segmentObjects.length > 0 && this.preprocessed }
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
    getSegments(){return this.segmentObjects}
    getSegment(i){return this.segmentObjects[i]}
    getSSM(){return this.ssm}
    getSSMValue(i,j){return this.ssm[i][j] }
    getBars(){return this.analysisData.bars}
    getBeats(){return this.analysisData.beats}
    getTatums(){return this.analysisData.tatums}
    getProcessedPitch(i){ return this.segmentObjects[i].getPitches()}
    getProcessedPitches(){ return this.segmentObjects.map((segment) => segment.getPitches())}
    getProcessedTimbre(i){ return this.segmentObjects[i].getTimbres()}
    getProcessedTimbres(){  return this.segmentObjects.map((segment) => segment.getTimbres())}
    getAnalysisDuration(){ return this.analysisData.track.duration}

}