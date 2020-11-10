<template>
    <div>
        <Seeker :width="width" :height="height" :useZoom="true" />
        <canvas id="Beatcanvas" ref="Beatcanvas" class="Beatcanvas pa-0 ma-0" :height="height" :width="width"></canvas>
    </div>
</template>

<script>
import * as log from "../../dev/log";
import * as vis from "../../app/vis";
import Seeker from "./Seeker";
import ZoomCanvas from "../../app/visualization/ZoomCanvas";

export default {
    props: ["width"],
    components: {
        Seeker,
    },
    data() {
        return {
            // possible elements: bars, beats, tatums
            elements: ["bars", "beats", "tatums"],
            elementHeight: 10,
            elementWidth: 1,
            zoomCanvas: null,
        };
    },
    computed: {
        track() {
            return this.$store.getters.selectedTrack;
        },
        height() {
            return this.elements.length * this.elementHeight;
        },
        scale() {
            return this.width;
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
        this.zoomCanvas = new ZoomCanvas(document.getElementById("Beatcanvas"));
        window.eventBus.$on("readyForVis", () => {
            this.zoomCanvas.setTrackDuration(this.track);
            this.zoomCanvas.setDrawFunction(this.draw);
        });
    },
    methods: {
        draw() {
            let y = 0;
            this.drawElements(this.track.getBars(), y);
            y += this.elementHeight;

            this.drawElements(this.track.getBeats(), y);
            y += this.elementHeight;

            this.drawElements(this.track.getTatums(), y);
        },
        drawElements(elements, y) {
            elements.forEach((element) => {
                this.zoomCanvas.drawVerticalLine(
                    element.start,
                    y,
                    this.elementWidth,
                    this.elementHeight,
                    vis.zeroOneColor(element.confidence)
                );
            });
        },
    },
};
</script>

<style>
.GTcanvas {
}
</style>
