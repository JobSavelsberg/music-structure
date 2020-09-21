import Segment from "./Segment"
import * as sim from "./similarity"
import * as clustering from "./clustering"
import * as skmeans from "skmeans";
import tsneWorker from './workers/tsneWorker'
import ssmWorker from './workers/ssmWorker'
import clusterWorker from './workers/clusterWorker'

import store from "../store";

const GAMMA = 1.7;
const CLUSTERAMOUNT = 10;

export default class Track {
    trackData = null;
    analysisData = null;
    segmentObjects = [];
    ssm = null;
    timbreMax = new Array(12).fill(0);
    timbreMin = new Array(12).fill(0);
    timbreBiggest = new Array(12).fill(0);
    timbreTotalBiggest = 0;

    pitchFeatures = [];
    timbreFeatures = [];
    loudnessFeatures = [];
    tonalEnergyFeatures = [];
    tonalRadiusFeatures = [];
    tonalAngleFeatures = [];
    features = []
    processed = false;

    clusters = new Array(CLUSTERAMOUNT).fill([])

    process() {
        this.createSegmentObjects(); // create extended objects holding more info
        this.calculateMaxMin(); // calculate scaling coeficcients
        this.preprocesSegments(); // use max min to scale
        this.tsne();
        this.cluster();
        this.calculateSSM();
        this.processed = true;
    }

    createSegmentObjects() {
        console.log("Creating segmentObjects")
        this.analysisData.segments.forEach((segment) => {
            this.segmentObjects.push(new Segment(segment));
        })
        console.log("Created segmentObjects")
    }

    calculateMaxMin() {
        this.getSegments().forEach((segment, index) => {
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

    preprocesSegments() {
        this.segmentObjects.forEach((s, i) => {
            s.processPitch(GAMMA);
            s.processTimbre(this.timbreMin, this.timbreMax, this.timbreBiggest, this.timbreTotalBiggest);
            this.pitchFeatures.push(s.pitches);
            this.timbreFeatures.push(s.timbres);
            this.tonalEnergyFeatures.push(s.tonalityEnergy);
            this.tonalRadiusFeatures.push(s.tonalityRadius);
            this.tonalAngleFeatures.push(s.tonalityAngle);
            this.loudnessFeatures.push(s.getLoudnessFeatures())
        });
        for (let i = 0; i < this.segmentObjects.length; i++) {
            if (i > 0 && i < this.segmentObjects.length - 1) {
                this.segmentObjects[i].processPitchSmooth(this.segmentObjects[i - 1], this.segmentObjects[i + 1])
            }
            this.features.push([...this.timbreFeatures[i], this.tonalEnergyFeatures[i], this.tonalRadiusFeatures[i], ...this.loudnessFeatures[i]]);
        }
    }


    /**
     * Self similarity matrix, takes a few seconds so async is needed
     */
    calculateSSM() {
        console.log("starting SSMWorker")
        store.commit('ssmReady', false);
        ssmWorker.terminate();
        const self = this;
        ssmWorker.send({ segmentObjects: this.segmentObjects}).then((result) => {
            self.ssm = result;
            store.commit('ssmReady', true);
            console.log("ssm Done")
        })

    }

    cluster() {
        console.log("starting Clusterworker");
        clusterWorker.terminate();
        clusterWorker.send({ features: this.features, minK: 2, maxK: 10, tries: 4 }).then((result) => {
            this.updateClusters(result);
            console.log("clustering done")
        })
    }
    updateClusters(clusterIndexes){
        store.commit('clusterReady', false);
        clusterIndexes.forEach((cluster, index) => {
            this.segmentObjects[index].setCluster(cluster);
            this.clusters[cluster].push(this.segmentObjects[index]);
        })
        window.setTimeout(store.commit('clusterReady', true), 1);
    }

    tsne() {
        console.log("starting tsneWorker");
        tsneWorker.terminate();
        tsneWorker.send({ features: this.features }).then((result) => {
            this.updateTSNECoords(result);
        })

        tsneWorker.receive((result) => {
            this.updateTSNECoords(result);
        });
    }
    //updateAmountPer100ms = 100;
    updateTSNECoords(coords) {
        store.commit('tsneReady', false);
        for (let i = 0; i < this.segmentObjects.length; i++) {
            this.segmentObjects[i].setTSNECoord(coords[i]);
        }
        window.setTimeout(store.commit('tsneReady', true), 1);
    }

    getClosestSegment(coord) {
        let minDist = Infinity;
        let closestSegment = null;
        this.segmentObjects.forEach((segment) => {
            const dist = sim.euclidianDistance(coord, segment.tsneCoord);
            if (dist < minDist) {
                minDist = dist;
                closestSegment = segment;
            }
        })
        return closestSegment;
    }

    constructor(trackData) {
        this.trackData = trackData;
    }
    static createWithAnalysis(trackData, analysisData) {
        const track = new Track(trackData)
        track.setAnalysis(analysisData);
        return track;
    }

    static fromJSON(json) {
        return this.createWithAnalysis(json.trackData, json.analysisData);
    }

    // Works with JSON.stringify!
    toJSON() {
        return {
            trackData: this.trackData,
            analysisData: this.analysisData,
        }
    }

    getId() { return this.trackData.id }
    hasAnalysis() { return this.analysisData !== null && this.segmentObjects.length > 0 }
    getAnalysis() { return this.analysisData; }
    setAnalysis(analysis) {
        if(!this.processed){
            this.analysisData = analysis;
            console.log("processing");
            this.process();
            console.log("processed");
        }
    }
    getName() { return this.trackData.name }
    getArtist() { return this.trackData.artist }
    getUri() { return this.trackData.uri }
    getSegments() { return this.segmentObjects }
    getSegment(i) { return this.segmentObjects[i] }
    getSSM() { return this.ssm }
    getSSMValue(i, j) { return this.ssm[i][j] }
    getBars() { return this.analysisData.bars }
    getBeats() { return this.analysisData.beats }
    getTatums() { return this.analysisData.tatums }
    getProcessedPitch(i) { return this.segmentObjects[i].getPitches() }
    getProcessedPitches() { return this.segmentObjects.map((segment) => segment.getPitches()) }
    getProcessedTimbre(i) { return this.segmentObjects[i].getTimbres() }
    getProcessedTimbres() { return this.segmentObjects.map((segment) => segment.getTimbres()) }
    getAnalysisDuration() { return this.analysisData.track.duration }


}