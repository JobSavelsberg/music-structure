<template>
    <div class="visualization">
        <v-btn color="primary" fab dark small class="mr-2" @click="$store.commit('toggleZoomed')">
            <v-icon>mdi-magnify-plus-outline</v-icon>
        </v-btn>

        <Matrixes :width="width" />
        <Structure :width="width" />
        <GroundTruth :width="width" />
        <Graphs :width="width" />

        <Beats :width="width" />
        <PitchTimbre :width="width" />
        <ScapePlot :width="width" />
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

import * as log from "../dev/log";
import * as player from "../app/player";
import * as vis from "../app/vis";

export default {
    props: ["width"],
    components: {
        Matrixes,
        GroundTruth,
        Beats,
        Graphs,
        ScapePlot,
        PitchTimbre,
        Structure,
    },
    data() {
        return {
            readyForVis: false,
        };
    },
    computed: {
        loadingTrack() {
            return this.$store.state.loadingTrack;
        },
        seekerNormalized() {
            return this.$store.getters.seeker / (this.track.getAnalysisDuration() * 1000);
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
</style>
