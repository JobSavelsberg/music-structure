<template>
    <div class="visualization">
        <v-btn color="primary" fab dark small class="mr-2" @click="$store.commit('toggleZoomed')">
            <v-icon>mdi-magnify-plus-outline</v-icon>
        </v-btn>

        <Matrixes :width="width" />

        <Graphs :width="width" />
        <GroundTruthVis :width="width" />

        <ScapePlot :width="width" />
    </div>
</template>

<script>
import Matrixes from "./visualizations/Matrixes";
import GroundTruthVis from "./visualizations/GroundTruthVis";
import Graphs from "./visualizations/Graphs";
import ScapePlot from "./visualizations/ScapePlot";

import * as log from "../dev/log";
import * as webGL from "../app/webGL";
import * as player from "../app/player";
import * as vis from "../app/vis";

export default {
    props: ["width"],
    components: {
        Matrixes,
        GroundTruthVis,
        Graphs,
        ScapePlot,
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
    mounted() {},
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
