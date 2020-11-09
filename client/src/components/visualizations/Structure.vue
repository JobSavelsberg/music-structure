<template>
    <div>
        <p class="pa-0 ma-0">
            Structure
        </p>
        <Seeker :width="width" :height="height" :useZoom="true" />
        <canvas
            id="StructureCanvas"
            ref="StructureCanvas"
            class="StructureCanvas pa-0 ma-0"
            :height="height"
            :width="width"
        ></canvas>
    </div>
</template>

<script>
import * as log from "../../dev/log";
import * as vis from "../../app/vis";
import Seeker from "./Seeker";
import * as testing from "../../app/testing";
import ZoomCanvas from "../../app/visualization/ZoomCanvas";

export default {
    props: ["width"],
    components: {
        Seeker,
    },
    data() {
        return {
            blockHeight: 20,
            zoomCanvas: null,
        };
    },
    computed: {
        track() {
            return this.$store.getters.selectedTrack;
        },
        height() {
            return this.blockHeight;
        },
        zoomed() {
            return this.$store.getters.isZoomed;
        },
    },
    watch: {
        width() {
            this.zoomCanvas.setWidth(this.width);
        },
        zoomed() {
            this.zoomCanvas.setZoomed(this.zoomed);
        },
    },
    mounted() {
        this.zoomCanvas = new ZoomCanvas(document.getElementById("StructureCanvas"));
        window.eventBus.$on("readyForVis", () => {
            this.zoomCanvas.setTrackDuration(this.track);
            this.zoomCanvas.setDrawFunction(this.drawStructure);
        });
    },
    methods: {
        drawStructure() {
            this.zoomCanvas.clear();
            this.track.structureSections.forEach((section, index) => {
                this.zoomCanvas.drawRect(
                    section.start,
                    0,
                    section.duration,
                    this.blockHeight,
                    vis.categoryColor(index)
                );
            });
        },
    },
};
</script>

<style>
.StructureCanvas {
}
</style>
