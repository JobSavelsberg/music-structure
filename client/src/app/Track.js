import * as sim from "./similarity";
import store from "../store";
import Features from "./Features";
import * as workers from "./workers/workers";
import * as log from "../dev/log";
import * as audioUtil from "./audioUtil";

import * as pathExtraction from "./pathExtraction";

export const GAMMA = 1.7;
export const CLUSTERAMOUNT = 10;
export const samples = 600;
export const sampleDuration = 0.33;
export const sampleBlur = 1; // smaller than 1 => no blur, e.g. when 2 every sample is blurred over duration of 2 samples

export const enhanceBlurLength = 6;
export const threshold = 0.65;
export const thresholdPercentage = 0.5;
export const tempoRatios = [0.66, 0.81, 1, 1.22, 1.5];

export const SPminSize = 2; // Minimal size of segment in scape plot
export const SPstepSize = 2; // Size of the step between segment start and size in scape plot
export const createScapePlot = false;

export const averageLoudnessBlur = 3;

export const maxTimbreDownSamples = 200;

const useSampled = true;
const allPitches = false;
export default class Track {
    eventListenerSet = false;

    trackData = null;
    analysisData = null;
    groundTruth = null;

    matrixes = []; // {name, matrix}
    scapePlot = null;
    scapePlotAnchorColor = null;
    graphFeatures = []; // {name, data};
    structures = []; // {name, data: [{start, duration, label}]}

    separators = [];
    courseStructure = [];
    fineStructure = [];

    harmonicStructureCourse = [];
    harmonicStructureFine = [];

    chordsVector = [];
    chords = [];
    tonalityFeatureSmall = [];
    tonalityFeatureLarge = [];

    keyFeature = [];

    events = [];
    timbreStructure = [];
    timbreFeatureGraph;
    segmentedTimbreGraph = [];

    features;

    processed = false;
    processing = false;

    clusters = new Array(CLUSTERAMOUNT).fill([]);

    constructor(trackData) {
        this.trackData = trackData;

        if (trackData.groundTruth) {
            this.groundTruth = trackData.groundTruth;
        }
    }

    process() {
        this.processing = true;
        log.info("Processing Track", this.getName());

        this.features = new Features(this.analysisData, {
            samples: samples,
            sampleDuration: sampleDuration,
            sampleBlur: sampleBlur,
            downsampleAmount: maxTimbreDownSamples,
        });
        log.debug("Emit features processed");

        window.eventBus.$emit("featuresProcessed");

        //this.tsne();
        //this.cluster();
        this.calculateSSM();
        this.computeChords();
        this.computeHarmonicStructure();
        this.computeTimbreStructure();

        this.processed = true;
        this.processing = false;
    }

    computeChords() {
        workers
            .computeChords(
                this.features.sampled.pitches,
                this.features.fastSampledPitch,
                this.features.sampleDuration,
                this.features.fastSampleDuration
            )
            .then((result) => {
                log.debug("Chords", result);
                this.chordsVector = result.chordsVector;
                this.chords = result.chords;
                this.key = result.key;
                this.tonalityFeatureSmall = result.tonalityFeatureSmall;
                this.tonalityFeatureLarge = result.tonalityFeatureLarge;

                this.keyFeature = result.keyFeature;
                log.debug(
                    "Key comparison: mine:",
                    result.key,
                    "spotify:",
                    audioUtil.keyNames[this.analysisData.track.key],
                    this.analysisData.track.mode === 1 ? "major" : "minor"
                );
            });
    }

    computeHarmonicStructure() {
        workers
            .computeHarmonicStructure({
                pitchFeatures: this.features.sampled.pitches,
                sampleDuration: this.features.sampleDuration,
                allPitches,
                enhanceBlurLength,
                tempoRatios,
            })
            .then((result) => {
                this.harmonicStructureCourse = result.harmonicStructure;
            });
        window.eventBus.$on("harmonicStructure", this.harmonicStructureListener);
        this.eventListenerSet = true;
    }

    harmonicStructureListener = (result) => {
        this.harmonicStructureCourse = result.harmonicStructure;
    };

    deselect() {
        if (this.eventListenerSet) {
            window.eventBus.$off("harmonicStructure", this.harmonicStructureListener);
            this.eventListenerSet = false;
        }
    }

    computeTimbreStructure() {
        workers.computeTimbreStructure(this.features.sampled.timbres, this.features.sampleDuration).then((result) => {
            log.debug("TimbreStructure", result);
            this.timbreStructure = result.timbreStructure;
            this.events = result.events;
            this.segmentedTimbreGraph = result.segmentedTimbreGraph;
        });
    }

    updatingTimbreGraphVis = false;
    updateTimbreVis(timbreSliders) {
        if (!this.processed) return;
        this.updatingTimbreGraphVis = true;
        workers
            .updateTimbreGraphVis(this.features.downSampledTimbre, timbreSliders, this.features.sampleDuration)
            .then((result) => {
                this.timbreFeatureGraph = result;
                this.updatingTimbreGraphVis = false;
            });
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
                features.avgLoudness,
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
                this.separators = result.separators;
                this.courseStructure = result.courseStructure;
                this.fineStructure = result.fineStructure;
                window.eventBus.$emit("readyForPrototypeVis");
            });
    }

    getMatrixByName(name) {
        for (const matrix of this.matrixes) {
            if (matrix.name === name) return matrix;
        }
        log.error("Could not find matrix with name", name);
    }

    updateDTW(start, end) {
        let index = -1;
        for (var i = this.matrixes.length - 1; i >= 0; --i) {
            if (this.matrixes[i].name == "DTW") {
                index = i;
            }
        }

        const strictpath = this.getMatrixByName("StrictPath").matrix;

        const scoreMatrix = pathExtraction.visualizationMatrix(strictpath, strictpath.getSampleAmount(), start, end);

        if (index < 0) {
            this.matrixes.push({ name: "DTW", matrix: scoreMatrix });
        } else {
            this.matrixes[index] = { name: "DTW", matrix: scoreMatrix };
        }
        window.eventBus.$emit("readyForPrototypeVis");
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
            window.setTimeout(() => window.eventBus.$emit("readyForPrototypeVis"), 0);
        }
    }
    setAnalysis(analysis) {
        if (!this.processed && !this.processing) {
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
