<template>
    <canvas
        v-if="track && createScapePlot"
        id="SPcanvas"
        ref="SPcanvas"
        class="SPcanvas pa-0 ma-0"
        :height="width"
        :width="width"
    ></canvas>
</template>

<script>
import * as log from "../../dev/log";
import * as vis from "../../app/vis";
import * as Track from "../../app/Track";
export default {
    props: ["width"],
    computed: {
        track() {
            return this.$store.getters.selectedTrack;
        },
        createScapePlot() {
            return Track.createScapePlot;
        },
    },
    mounted() {
        window.eventBus.$on("readyForPrototypeVis", () => {
            if (this.createScapePlot) {
                this.drawSP();
            }
        });
    },
    methods: {
        drawSP() {
            if (!this.createScapePlot) return;
            const canvas = document.getElementById("SPcanvas");
            if (!canvas) {
                log.error("canvas not ready");
                return;
            }
            const ctx = canvas.getContext("2d");

            //vis.drawScapePlot(this.track, ctx, this.width);
            vis.drawScapePlot(this.track, ctx, this.width, false);
        },
    },
};
</script>

<style>
.SPcanvas {
    background-color: "white";
    width: 100%;
    height: 100%;
}
</style>
