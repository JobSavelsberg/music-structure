<template>
    <canvas id="SPcanvas" ref="SPcanvas" class="SPcanvas pa-0 ma-0" :height="width" :width="width"></canvas>
</template>

<script>
import * as log from "../../dev/log";
import * as vis from "../../app/vis";

export default {
    props: ["width"],
    computed: {
        track() {
            return this.$store.getters.selectedTrack;
        },
    },
    mounted() {
        window.eventBus.$on("readyForVis", () => {
            this.drawSP();
        });
    },
    methods: {
        drawSP() {
            const canvas = document.getElementById("SPcanvas");
            if (!canvas) {
                log.error("canvas not ready");
                return;
            }
            const ctx = canvas.getContext("2d");

            vis.drawScapePlot(this.track, ctx, this.width);
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
