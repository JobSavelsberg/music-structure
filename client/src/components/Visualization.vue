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
    },
    mounted() {
        window.eventBus.$on("readyForPrototypeVis", () => {
            this.readyForPrototypeVis = true;
        });
    },

    methods: {
        visChanged(newVis, oldVis) {},
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
</style>
