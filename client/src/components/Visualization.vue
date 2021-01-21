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
                <ScapePlot :width="width" />
            </div>
            <div v-if="!showPrototype">
                <HolisticStructure :width="width" />
                <Chords :width="width" />
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
import Chords from "./visualizations/Chords";

import TimbreGraph from "./visualizations/TimbreGraph";

import * as log from "../dev/log";
import * as player from "../app/player";
import * as vis from "../app/vis";

export default {
    props: ["width", "showPrototype"],
    components: {
        Matrixes,
        GroundTruth,
        Beats,
        Graphs,
        ScapePlot,
        PitchTimbre,
        Structure,
        HolisticStructure,
        TimbreGraph,
        TimbreStructure,
        Chords,
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
    },
    mounted() {
        this._keyListener = function(e) {
            if (e.key === "z" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault(); // present "Save Page" from getting triggered.

                this.$store.commit("toggleZoomed");
            }
        };
        document.addEventListener("keydown", this._keyListener.bind(this));
        window.eventBus.$on("readyForPrototypeVis", () => {
            this.readyForPrototypeVis = true;
        });
    },
    beforeDestroy() {
        document.removeEventListener("keydown", this._keyListener);
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
