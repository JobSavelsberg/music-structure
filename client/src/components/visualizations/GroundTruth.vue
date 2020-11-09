<template>
    <div>
        <p class="pa-0 ma-0">Spotify Sections</p>

        <Seeker :width="width" :height="height" />
        <canvas id="GTcanvas" ref="GTcanvas" class="GTcanvas pa-0 ma-0" :height="height" :width="width"></canvas>
        <div v-if="track">
            <p v-if="trackHasGroundTruth" class="pa-0 ma-0" :style="`transform: translate(0px, ${-height + 5}px);`">
                Ground Truth
            </p>
        </div>
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
            allowedNamespaces: [testing.namespaces.coarse],
            blockHeight: 20,
            titleHeight: 15,
            zoomCanvas: null,
        };
    },
    computed: {
        track() {
            return this.$store.getters.selectedTrack;
        },
        blockAndTitleHeight() {
            return this.blockHeight + this.titleHeight;
        },
        trackHasGroundTruth() {
            return this.track && this.track.groundTruth !== null;
        },
        height() {
            return (1 + (this.trackHasGroundTruth ? this.allowedNamespaces.length : 0)) * this.blockAndTitleHeight;
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
        this.zoomCanvas = new ZoomCanvas(document.getElementById("GTcanvas"));
        window.eventBus.$on("readyForVis", () => {
            this.zoomCanvas.setTrackDuration(this.track);
            this.zoomCanvas.setDrawFunction(this.drawGT);
        });
    },
    methods: {
        drawGT() {
            const allAllowedNamespaces = [].concat.apply([], this.allowedNamespaces);
            const trackDuration = this.track.getAnalysisDuration();

            let y = 0;
            const height = this.blockHeight;

            this.track.getAnalysis().sections.forEach((section, index) => {
                this.zoomCanvas.drawRect(section.start, y, section.duration, height, vis.categoryColor(index));
            });
            y += height;

            if (!this.track.groundTruth) return;
            const annotations = this.track.groundTruth.annotations;

            annotations.forEach((annotation) => {
                if (annotation && allAllowedNamespaces.includes(annotation.namespace)) {
                    y += this.titleHeight;
                    const uniqueValues = [];
                    annotation.data.forEach((segment) => {
                        const confidence = segment.confidence;
                        const duration = segment.duration;
                        const time = segment.time;
                        const value = segment.value;
                        if (!uniqueValues.includes(value)) {
                            uniqueValues.push(value);
                        }

                        this.zoomCanvas.drawRect(
                            time,
                            y,
                            duration,
                            height,
                            vis.categoryColor(uniqueValues.indexOf(value))
                        );
                        this.zoomCanvas.drawText(time, y + height / 2, value);
                    });
                    y += height;
                }
            });
        },
    },
};
</script>

<style>
.GTcanvas {
}
</style>
