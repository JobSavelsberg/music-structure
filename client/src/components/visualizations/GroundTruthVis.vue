<template>
    <canvas id="GTcanvas" ref="GTcanvas" class="GTcanvas pa-0 ma-0" :height="3 * blockHeight" :width="width"></canvas>
</template>

<script>
import * as log from "../../dev/log";
import * as vis from "../../app/vis";

export default {
    props: ["width"],
    data() {
        return {
            blockHeight: 30,
        };
    },
    computed: {
        track() {
            return this.$store.getters.selectedTrack;
        },
    },
    mounted() {
        window.eventBus.$on("readyForVis", () => {
            this.drawGT();
        });
    },
    methods: {
        drawGT() {
            const canvas = document.getElementById("GTcanvas");
            if (!canvas) {
                log.error("canvas not ready");
                return;
            }
            const ctx = canvas.getContext("2d");

            vis.drawGroundTruth(this.track, ctx, this.width, this.blockHeight);
        },
    },
};
</script>

<style>
.GTcanvas {
}
</style>
