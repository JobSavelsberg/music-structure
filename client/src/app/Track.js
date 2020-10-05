import Segment from "./Segment";
import * as sim from "./similarity";
import store from "../store";
import Features from "./Features";
import * as workers from "./workers/workers";
import * as SSM from "./SSM";
const GAMMA = 1.7;
const CLUSTERAMOUNT = 10;
const sampleRate = 1; // 1 sample per second
export default class Track {
    trackData = null;
    analysisData = null;
    segments = [];
    ssm = null;

    features;

    processed = false;

    clusters = new Array(CLUSTERAMOUNT).fill([]);

    process() {
        this.createSegmentObjects(); // create extended objects holding more info
        this.features = new Features(this.segments, 1, this.getAnalysisDuration());
        this.tsne();
        this.cluster();
        this.calculateSSM();
        this.processed = true;
    }

    createSegmentObjects() {
        console.log("Creating segmentObjects");
        this.analysisData.segments.forEach((segment) => {
            this.segments.push(new Segment(segment));
        });
        console.log("Created segmentObjects");
    }

    /**
     * Self similarity matrix, takes a few seconds so async is needed
     */
    calculateSSM() {
        const beforessmtime = new Date();
        const ssm = SSM.calculate(this.segments, false).then(() => {
            console.log(ssm);
            const finishTime = new Date() - beforessmtime;
            console.log("Time it took to finish JS", finishTime);
        });
        console.log("Ello");

        console.log("starting SSMWorker");
        store.commit("ssmReady", false);
        /* workers.startSSM(this, this.features.processed.pitchesFlat, 12, { useSampled: false }).then((result) => {
            console.log(result);
            this.ssm = ssm;
            store.commit("ssmReady", true);
            console.log("ssm Done");
        });*/
    }

    cluster() {
        console.log("starting Clusterworker");
        /*clusterWorker.terminate();
        clusterWorker.send({ features: this.features.clusterSelection, minK: 2, maxK: 10, tries: 4 }).then((result) => {
            this.updateClusters(result);
            console.log("clustering done");
        });*/
    }
    updateClusters(clusterIndexes) {
        store.commit("clusterReady", false);
        clusterIndexes.forEach((cluster, index) => {
            this.segments[index].setCluster(cluster);
            this.clusters[cluster].push(this.segments[index]);
        });
        window.setTimeout(store.commit("clusterReady", true), 1);
    }

    tsne() {
        console.log("starting tsneWorker");
        /*tsneWorker.terminate();
        tsneWorker.send({ features: this.features.tsneSelection }).then((result) => {
            this.updateTSNECoords(result);
        });

        tsneWorker.receive((result) => {
            this.updateTSNECoords(result);
        });*/
    }
    //updateAmountPer100ms = 100;
    updateTSNECoords(coords) {
        store.commit("tsneReady", false);
        for (let i = 0; i < this.segments.length; i++) {
            this.segments[i].setTSNECoord(coords[i]);
        }
        window.setTimeout(store.commit("tsneReady", true), 1);
    }

    getClosestSegment(coord) {
        let minDist = Infinity;
        let closestSegment = null;
        this.segments.forEach((segment) => {
            const dist = sim.euclidianDistance(coord, segment.tsneCoord);
            if (dist < minDist) {
                minDist = dist;
                closestSegment = segment;
            }
        });
        return closestSegment;
    }

    constructor(trackData) {
        this.trackData = trackData;
    }
    static createWithAnalysis(trackData, analysisData) {
        const track = new Track(trackData);
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
        };
    }

    getId() {
        return this.trackData.id;
    }
    hasAnalysis() {
        return this.analysisData !== null && this.segments.length > 0;
    }
    getAnalysis() {
        return this.analysisData;
    }
    setAnalysis(analysis) {
        if (!this.processed) {
            this.analysisData = analysis;
            console.log("processing");
            this.process();
            console.log("processed");
        }
    }
    getName() {
        return this.trackData.name;
    }
    getArtist() {
        return this.trackData.artist;
    }
    getUri() {
        return this.trackData.uri;
    }
    getSegments() {
        return this.segments;
    }
    getSegment(i) {
        return this.segments[i];
    }
    getSSM() {
        return this.ssm;
    }
    getSSMValue(i, j) {
        return this.ssm[i][i - j];
    }
    getBars() {
        return this.analysisData.bars;
    }
    getBeats() {
        return this.analysisData.beats;
    }
    getTatums() {
        return this.analysisData.tatums;
    }
    getProcessedPitch(i) {
        return this.segments[i].getPitches();
    }
    getProcessedPitches() {
        return this.segments.map((segment) => segment.getPitches());
    }
    getProcessedTimbre(i) {
        return this.segments[i].getTimbres();
    }
    getProcessedTimbres() {
        return this.segments.map((segment) => segment.getTimbres());
    }
    getAnalysisDuration() {
        return this.analysisData.track.duration;
    }
}
