<template>
    <div class="visualization">
        <div>
            <v-row class="d-flex justify-center py-2"> </v-row>
            <div v-if="showPrototype">
                <Matrixes :width="width" />
                <Structure :width="width" />
                <GroundTruth :width="width" />
                <Graphs :width="width" />

                <Beats :width="width" />
                <PitchTimbre :width="width" />
                <!--<ScapePlot :width="width" />-->
            </div>
            <div v-if="!showPrototype">
                <HolisticStructure :width="width" />
                <!--div style="height: 200px"></div>-->
                <svg
                    v-if="!loadingTrack && tsneReady"
                    class="tsneContainer"
                    :style="`height: ${tsneSize + 8 * 20}px; width: ${width}px; left: ${10}`"
                >
                    <circle
                        v-for="(coord, index) in tsneCoords"
                        :key="index + 'clustercircle'"
                        :r="isPlayingSample(index) ? 8 : 2"
                        :cx="2 + ((coord[0] + 1) * tsneSize) / 2"
                        :cy="2 + ((coord[1] + 1) * tsneSize) / 2"
                        :class="isPlayingSample(index) ? 'segmentCirclePlaying' : 'segmentCircle'"
                        :fill="isPlayingSample(index) ? 'white' : clusterColor(clusters[index])"
                    />
                    <rect
                        v-for="(clusterSection, index) in clusterSections"
                        :key="index + 'clustersection'"
                        class="clusterRect"
                        :fill="clusterColor(clusterSection.cluster)"
                        :x="samplePosNormalized(clusterSection.start) * width"
                        :y="tsneSize + 20 * clusterSection.cluster"
                        :width="samplePosNormalized(clusterSection.end - clusterSection.start) * width"
                        :height="20"
                    ></rect>
                </svg>
                <TimbreSegmentedGraph :width="width" />
                <Chords :width="width" />
                <Tonality :width="width" />

                <div style="height: 600px"></div>
                <TimbreStructure :width="width" />
                <TimbreGraph :width="width" />
            </div>
        </div>

        <div class="floatingTime">
            {{ parseFloat(seekerTime).toFixed(2) }}
        </div>
    </div>
</template>

<script>
import Matrixes from "./visualizations/Matrixes";
import GroundTruth from "./visualizations/GroundTruth";
import Graphs from "./visualizations/Graphs";
import ScapePlot from "./visualizations/ScapePlot";
import Beats from "./visualizations/Beats";
import PitchTimbre from "./visualizations/PitchTimbre";
import Structure from "./visualizations/Structure";
import HolisticStructure from "./visualizations/HolisticStructure";
import TimbreStructure from "./visualizations/TimbreStructure";
import TimbreSegmentedGraph from "./visualizations/TimbreSegmentedGraph";
import Tonality from "./visualizations/Tonality";
import Chords from "./visualizations/Chords";

import TimbreGraph from "./visualizations/TimbreGraph";

import * as log from "../dev/log";
import * as player from "../app/player";
import * as vis from "../app/vis";
import * as d3 from "d3";

export default {
    props: ["width", "showPrototype"],
    components: {
        Matrixes,
        GroundTruth,
        Beats,
        Graphs,
        //ScapePlot,
        PitchTimbre,
        Structure,
        HolisticStructure,
        TimbreGraph,
        TimbreStructure,
        Chords,
        TimbreSegmentedGraph,
        Tonality,
    },
    data() {
        return {
            readyForPrototypeVis: false,
            tsneReady: false,
            tsneSize: 500,
        };
    },
    watch: {
        showPrototype() {
            if (this.showPrototype && this.readyForPrototypeVis) {
                setTimeout(() => window.eventBus.$emit("readyForPrototypeVis"), 0);
            }
        },
        track() {
            this.readyForPrototypeVis = false;
        },
    },
    computed: {
        loadingTrack() {
            return this.$store.state.loadingTrack;
        },
        seekerNormalized() {
            return this.$store.getters.seeker / (this.track.getAnalysisDuration() * 1000);
        },
        seekerTime() {
            return this.$store.getters.seeker / 1000;
        },
        track() {
            return this.$store.getters.selectedTrack;
        },
        height() {
            return this.width;
        },
        zoomed() {
            return this.$store.state.isZoomed;
        },
        playing() {
            return this.$store.getters.playing;
        },
        tsneCoords() {
            return this.track.tsneCoords;
        },
        clusters() {
            return this.track.clusters;
        },
        clusterSections() {
            return this.track.clusterSections;
        },
    },
    mounted() {
        window.eventBus.$on("readyForPrototypeVis", () => {
            this.readyForPrototypeVis = true;
        });
        window.eventBus.$on("tsneReady", () => {
            this.tsneReady = true;
        });
    },

    methods: {
        visChanged(newVis, oldVis) {},
        clusterColor(index) {
            return vis.goldenRatioCategoricalColor(index, 0, 1);
        },
        isPlayingSample(index) {
            return (
                index <= this.seekerTime / this.track.features.sampleDuration &&
                index + 1 > this.seekerTime / this.track.features.sampleDuration
            );
        },
        samplePosNormalized(sample) {
            return (sample * this.track.features.sampleDuration) / this.track.getAnalysisDuration();
        },
    },
};
</script>

<style>
.seekerSVGWrapper {
    position: relative;
}
.seekerSVG {
    position: absolute;
    z-index: 10;
}
.floatingTime {
    position: fixed;
    z-index: 1000;
    right: 5px;
    bottom: 0%;
}
.segmentCircle {
    transition: r 1.5s ease-out, fill 1.5s ease-out; /*, cx 1s ease, cy 1s ease;*/
}
.segmentCirclePlaying {
    transition: r 0.1s ease-in, fill 0.1s ease-in;
}
</style>
