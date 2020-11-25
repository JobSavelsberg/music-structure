import Segment from "./Segment";
import * as sim from "./similarity";
import store from "../store";
import Features from "./Features";
import * as workers from "./workers/workers";
import * as log from "../dev/log";
import * as SSM from "./SSM";
import Matrix from "./dataStructures/Matrix";
import * as pathExtraction from "./pathExtraction";

import * as scapePlot from "./scapePlot";

export const GAMMA = 1.7;
export const CLUSTERAMOUNT = 10;
export const samples = 500;
export const sampleDuration = 0.5;
export const sampleBlur = 1; // smaller than 1 => no blur, e.g. when 2 every sample is blurred over duration of 2 samples

export const enhanceBlurLength = 8;
export const threshold = 0.65;
export const thresholdPercentage = 0.35;
export const tempoRatios = [0.66, 0.81, 1, 1.22, 1.5];

export const SPminSize = 16; // Minimal size of segment in scape plot
export const SPstepSize = 4; // Size of the step between segment start and size in scape plot
export const createScapePlot = false;

const useSampled = true;
const allPitches = false;
export default class Track {
    trackData = null;
    analysisData = null;
    groundTruth = null;

    matrixes = []; // {name, matrix}
    scapePlot = null;
    scapePlotAnchorColor = null;
    graphFeatures = []; // {name, data};
    structures = []; // {name, data: [{start, duration, label}]}
    structureSections = [];
    optimalStructure = [];

    features;

    processed = false;

    clusters = new Array(CLUSTERAMOUNT).fill([]);

    constructor(trackData) {
        this.trackData = trackData;
        if (trackData.groundTruth) {
            this.groundTruth = trackData.groundTruth;
        }
    }

    process() {
        this.features = new Features(this.analysisData, {
            //samples: samples,
            sampleDuration: sampleDuration,
            sampleBlur: sampleBlur,
        });
        //this.tsne();
        //this.cluster();
        this.calculateSSM();
        this.processed = true;
    }

    /**
     * Self similarity matrix, takes a few seconds so async is needed
     */
    calculateSSM() {
        const time = new Date();

        let features = this.features.processed;
        if (useSampled) {
            features = this.features.sampled;
        }
        workers
            .startSSM(
                this.getID(),
                features.pitches,
                features.timbres,
                this.features.sampleDuration,
                this.getSegmentStartDuration(),
                this.features.beatsStartDuration,
                {
                    enhanceBlurLength,
                    threshold,
                    thresholdPercentage,
                    tempoRatios,
                    allPitches,
                    SPminSize,
                    SPstepSize,
                    createScapePlot,
                }
            )
            .then((result) => {
                const diff = new Date() - time;
                const diffBack = new Date() - result.timestamp;
                log.info("workerSSM outside", diff);
                log.info("workerSSM sending back", diffBack);
                this.matrixes = result.matrixes;
                this.graphFeatures = result.graphs;
                this.structures = result.structures;
                this.scapePlot = result.scapePlot;
                this.scapePlotAnchorColor = result.scapePlotAnchorColor;
                this.structureSections = result.structureSections;
                this.optimalStructure = result.optimalStructure;
                window.eventBus.$emit("readyForVis");
            });

        /*const nonworkerTime = performance.now();
        SSM.calculatePitchTimbre(this.features.processed.pitches, this.features.processed.timbres).then(() => {
            const diff = performance.now() - nonworkerTime;
            log.debug("Local SSM", diff);
        });*/
    }

    getMatrixByName(name) {
        for (const matrix of this.matrixes) {
            if (matrix.name === name) return matrix;
        }
    }

    updateScoreMatrix(size, start) {
        start = Math.max(0, Math.min(this.features.sampleAmount, start));
        log.debug("size", size, "start", start);
        for (var i = this.matrixes.length - 1; i >= 0; --i) {
            if (this.matrixes[i].name == "Score Matrix") {
                this.matrixes.splice(i, 1);
            }
        }

        const fullTranspositionInvariant = Matrix.fromHalfMatrix(
            this.getMatrixByName("Transposition Invariant SSM").matrix
        );
        const scoreMatrix = pathExtraction.visualizationMatrix(
            fullTranspositionInvariant,
            this.features.sampleAmount,
            start,
            start + size - 1
        );

        this.matrixes.push({ name: "Score Matrix", matrix: scoreMatrix });
        window.eventBus.$emit("readyForVis");
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
    hasVisualization() {
        return this.matrixes.length > 0;
    }
    getAnalysis() {
        return this.analysisData;
    }
    reload() {
        log.debug("Reloading track");
        if (this.hasVisualization()) {
            window.setTimeout(() => window.eventBus.$emit("readyForVis"), 0);
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
    getSegmentStartDuration() {
        if (useSampled) {
            return this.features.sampleStartDuration;
        } else {
            return this.features.segmentStartDuration;
        }
    }
    getSSM() {
        return this.matrixes.transpositionInvariantSSM;
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
