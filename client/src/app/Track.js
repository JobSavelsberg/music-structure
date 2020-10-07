import Segment from "./Segment";
import * as sim from "./similarity";
import store from "../store";
import Features from "./Features";
import * as workers from "./workers/workers";
import * as log from "../dev/log";
import * as SSM from "./SSM";
const GAMMA = 1.7;
const CLUSTERAMOUNT = 10;
const sampleRate = 1; // 1 sample per second
export default class Track {
    trackData = null;
    analysisData = null;
    ssm = null;

    features;

    processed = false;

    clusters = new Array(CLUSTERAMOUNT).fill([]);

    process() {
        this.features = new Features(this.analysisData, 1);
        //this.tsne();
        //this.cluster();
        this.calculateSSM();
        this.processed = true;
    }

    /**
     * Self similarity matrix, takes a few seconds so async is needed
     */
    calculateSSM() {
        store.commit("ssmReady", false);
        const time = new Date();
        workers
            .startSSM(
                this.getID(),
                this.features.processed.pitches,
                this.features.processed.timbres,
                this.features.segmentStartDuration,
                {
                    blurTime: 4,
                    threshold: 0.3,
                }
            )
            .then((result) => {
                const diff = new Date() - time;
                const diffBack = new Date() - result.timestamp;
                log.info("workerSSM outside", diff);
                log.info("workerSSM sending back", diffBack);
                this.ssm = result.ssm;
                store.commit("ssmReady", true);
            });

        /*const nonworkerTime = performance.now();
        SSM.calculatePitchTimbre(this.features.processed.pitches, this.features.processed.timbres).then(() => {
            const diff = performance.now() - nonworkerTime;
            log.debug("Local SSM", diff);
        });*/
    }

    cluster() {
        /*clusterWorker.send({ features: this.features.clusterSelection, minK: 2, maxK: 10, tries: 4 }).then((result) => {
            this.updateClusters(result);
            log.debug("clustering done");
        });*/
    }
    updateClusters(clusterIndexes) {
        store.commit("clusterReady", false);
        clusterIndexes.forEach((cluster, index) => {
            this.features.segments[index].setCluster(cluster);
            this.clusters[cluster].push(this.features.segments[index]);
        });
        window.setTimeout(store.commit("clusterReady", true), 1);
    }

    tsne() {
        /*tsneWorker.send({ features: this.features.tsneSelection }).then((result) => {
            this.updateTSNECoords(result);
        });

        tsneWorker.receive((result) => {
            this.updateTSNECoords(result);
        });*/
    }
    //updateAmountPer100ms = 100;
    updateTSNECoords(coords) {
        store.commit("tsneReady", false);
        for (let i = 0; i < this.features.segments.length; i++) {
            this.features.segments[i].setTSNECoord(coords[i]);
        }
        window.setTimeout(store.commit("tsneReady", true), 1);
    }

    getClosestSegment(coord) {
        let minDist = Infinity;
        let closestSegment = null;
        this.features.segments.forEach((segment) => {
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

    getID() {
        return this.trackData.id;
    }
    hasAnalysis() {
        return this.analysisData !== null && this.features.segments.length > 0;
    }
    getAnalysis() {
        return this.analysisData;
    }
    reload() {
        log.debug("Reloading track");
        if (this.ssm) {
            window.setTimeout(() => store.commit("ssmReady", true), 0);
        }
    }
    setAnalysis(analysis) {
        if (!this.processed) {
            this.analysisData = analysis;
            this.process();
        }
    }
    getDuration() {
        return this.features.duration;
    }
    getName() {
        return this.trackData.name;
    }
    getArtist() {
        return this.trackData.artist;
    }
    getURI() {
        return this.trackData.uri;
    }
    getSegments() {
        return this.features.segments;
    }
    getSegment(i) {
        return this.features.segments[i];
    }
    getSSM() {
        return this.ssm;
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
        return this.features.processed.pitches[i];
    }
    getProcessedPitches() {
        return this.features.processed.pitches;
    }
    getProcessedTimbre(i) {
        return this.features.processed.timbres[i];
    }
    getProcessedTimbres() {
        return this.features.processed.timbres;
    }
    getAnalysisDuration() {
        return this.analysisData.track.duration;
    }
}
