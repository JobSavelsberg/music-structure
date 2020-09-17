import Segment from "./Segment"
import * as sim from "./similarity"
import * as clustering from "./clustering"
import * as skmeans from "skmeans";
import tsneWorker from './workers'
import store from "../store";

const GAMMA = 1.7;
const CLUSTERAMOUNT = 10;

export default class Track{
    trackData = null;
    analysisData = null;
    segmentObjects = [];
    ssm = null;
    timbreMax = new Array(12).fill(0);
    timbreMin = new Array(12).fill(0);
    timbreBiggest = new Array(12).fill(0);

    preprocessed = false;

    pitchFeatures = [];
    timbreFeatures = [];
    tonalEnergyFeatures = [];
    tonalRadiusFeatures = [];
    tonalAngleFeatures = [];
    features = []

    clusters = new Array(CLUSTERAMOUNT).fill([])

    process(){
        this.createSegmentObjects(); // create extended objects holding more info
        this.calculateMaxMin(); // calculate scaling coeficcients
        this.preprocesSegments(); // use max min to scale
        this.preprocessed = true;
        this.tsne();
        this.cluster();
        this.calculateSSM();
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
    }

    preprocesSegments(){
        this.segmentObjects.forEach((s, i) => {
            s.processPitch(GAMMA);
            s.processTimbre(this.timbreMin, this.timbreMax, this.timbreBiggest);
            this.pitchFeatures.push(s.pitches);
            this.timbreFeatures.push(s.timbres);
            this.tonalEnergyFeatures.push(s.tonalityEnergy);
            this.tonalRadiusFeatures.push(s.tonalityRadius);
            this.tonalAngleFeatures.push(s.tonalityAngle);
        });
        for(let i = 0; i < this.segmentObjects.length; i++){
            if(i>0 && i< this.segmentObjects.length-1){
                this.segmentObjects[i].processPitchSmooth(this.segmentObjects[i-1], this.segmentObjects[i+1])
            }
            this.features.push([...this.segmentObjects[i].pitches, ...this.segmentObjects[i].timbres, this.segmentObjects[i].tonalityEnergy, this.segmentObjects[i].tonalityRadius]);
        }
        console.log(this.features);
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
        const minK = 2;
        const maxK = 15;
        const tries = 8;
        const data = [];
        for (let i=0; i<this.segmentObjects.length; i++){
            data.push([...this.timbreFeatures[i], this.tonalEnergyFeatures[i], this.tonalRadiusFeatures[i]]);
        }
        const result = clustering.kMeansSearch(data, minK, maxK, tries);
        result.idxs.forEach((cluster, index) => {
            this.segmentObjects[index].setCluster(cluster);
            this.clusters[cluster].push(this.segmentObjects[index]);
        })
        console.log("kmeans done")
    }

    tsne(){
        console.log("sending worker message");
        tsneWorker.terminate();
        const data = [];
        for (let i=0; i<this.segmentObjects.length; i++){
            data.push([...this.timbreFeatures[i], this.tonalEnergyFeatures[i], this.tonalRadiusFeatures[i]]);
        }
        tsneWorker.send({features: data}).then((result) => {
            for(let i = 0; i < this.segmentObjects.length; i++){
                this.segmentObjects[i].setTSNECoord(result[i]);
            }
            store.commit('tsneReady', true);
            // TODO: Save tsne
        })

        tsneWorker.receive((result) => {
            const self = this;
            store.commit('tsneReady', false);
            for(let i = 0; i < self.segmentObjects.length; i++){
                self.segmentObjects[i].setTSNECoord(result[i]);
            }
            window.setTimeout(store.commit('tsneReady', true), 1);
            
          });
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