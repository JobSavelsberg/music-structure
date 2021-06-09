import * as sim from "./similarity";
import store from "../store";
import Features from "./Features";
import * as workers from "./workers/workers";
import * as log from "../dev/log";
import * as audioUtil from "./audioUtil";
import * as vis from "./vis";
import * as filter from "./filter";

import * as pathExtraction from "./pathExtraction";
import * as d3 from "d3";

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

    markers = []; // {time, color, label}
    markersCreated = 0;

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

    smoothedTimbre = [];
    tsneCoords = [];
    clusters = [];
    clusterSections;

    constructor(trackData) {
        this.trackData = trackData;

        if (trackData.groundTruth) {
            log.debug("Ground truth for", this.getName());
            this.groundTruth = trackData.groundTruth;
        }
    }

    separatorGenerator() {
        log.debug("GENERATING SEPARATORS");
        const separators = [];
        if (!this.harmonicStructureCourse) return separators;
        for (const section of this.harmonicStructureCourse) {
            separators.push({
                start: section.start,
                end: section.end,
                colorAngle: section.colorAngle,
                confidence: 1,
                groupID: section.groupID,
            });
        }
        return separators;
    }

    process() {
        this.processing = true;
        log.info("Processing Track", this.getName());
        log.debug("Analysis File", this.analysisData);
        this.features = new Features(this.analysisData, {
            samples: samples,
            sampleDuration: sampleDuration,
            sampleBlur: sampleBlur,
            downsampleAmount: maxTimbreDownSamples,
        });
        this.smoothedTimbre = filter.gaussianBlurFeatures(this.features.sampled.timbres, 5);
        log.debug("Emit features processed");

        window.eventBus.$emit("featuresProcessed");

        //this.tsne();
        //this.cluster();
        //this.calculateSSM();
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
            window.eventBus.$off("tsneReady", this.harmonicStructureListener);

            this.eventListenerSet = false;
        }
    }

    computeTimbreStructure() {
        workers.computeTimbreStructure(this.features.sampled.timbres, this.features.sampleDuration).then((result) => {
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
        workers.cluster({ features: this.smoothedTimbre, minK: 2, maxK: 10, tries: 10 }).then((result) => {
            log.debug("Clustering Result", result);

            this.clusters = result;
            let prevCluster = result[0];

            this.clusterSections = [];
            this.clusterSections.push({ cluster: prevCluster, start: 0 });
            for (let i = 1; i < result.length; i++) {
                const cluster = result[i];
                if (cluster !== prevCluster) {
                    this.clusterSections[this.clusterSections.length - 1].end = i;
                    this.clusterSections.push({ cluster: cluster, start: i });
                    prevCluster = cluster;
                }
            }
            this.clusterSections[this.clusterSections.length - 1].end = result.length;
            log.debug(this.clusterSections);
        });
    }

    tsne() {
        workers.tsne({ features: this.smoothedTimbre }).then((result) => {
            this.tsneListener(result);
        });
        window.eventBus.$on("tsneReady", this.tsneListener);
        this.eventListenerSet = true;
    }
    tsneListener = (result) => {
        this.tsneCoords = result;
    };

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

    placeMarker(time) {
        log.debug("Placemarker", time);
        // Delete marker if it exists at that time
        const alreadyPlacedMarkerIndex = this.markers.findIndex((marker) => Math.abs(marker.time - time) < 1);
        if (alreadyPlacedMarkerIndex >= 0) {
            this.markers.splice(alreadyPlacedMarkerIndex, 1);
            return;
        }

        const color = d3.color(vis.goldenRatioCategoricalColor(this.markersCreated, 0)).formatHex();
        const label = String.fromCharCode(97 + this.markersCreated).toUpperCase();
        this.markers.push({ time, color, label });
        this.markersCreated++;
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
