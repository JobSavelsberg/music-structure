<template>
    <div>
        <p class="pa-0 ma-0">Spotify Sections</p>

        <Seeker :width="width" :height="height" useZoom="true" />
        <canvas id="GTcanvas" ref="GTcanvas" class="GTcanvas pa-0 ma-0" :height="height" :width="width"></canvas>
        <div v-if="track">
            <p v-if="trackHasGroundTruth" class="pa-0 ma-0" :style="`transform: translate(0px, ${-height + 15}px);`">
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
            allowedNamespaces: [testing.namespaces.coarse, testing.namespaces.fine],
            blockHeight: 20,
            innerSpacing: 3,
            zoomCanvas: null,
        };
    },
    computed: {
        track() {
            return this.$store.getters.selectedTrack;
        },
        trackHasGroundTruth() {
            log.debug("TESTING IF IT HAS GROUND TRUTH", this.track.groundTruth);
            return this.track && this.track.groundTruth !== null;
        },
        height() {
            return (
                (1 + (this.trackHasGroundTruth ? this.allowedNamespaces.length + 1 : 0)) *
                (this.blockHeight + this.innerSpacing)
            );
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
        window.eventBus.$on("readyForPrototypeVis", () => {
            this.zoomCanvas.setTrackDuration(this.track);
            this.zoomCanvas.setDrawFunction(this.drawGT);
        });
    },
    methods: {
        drawGT() {
            const allAllowedNamespaces = [].concat.apply([], this.allowedNamespaces);
            const trackDuration = this.track.getAnalysisDuration();

            let y = 0;
            const height = this.blockHeight + this.innerSpacing;

            this.track.getAnalysis().sections.forEach((section, index) => {
                this.zoomCanvas.drawRectWithBorder(
                    section.start,
                    y,
                    section.duration,
                    height,
                    vis.categoryColor(index),
                    1,
                    null
                );
            });
            y += height;

            if (!this.track.groundTruth) return;
            const annotations = this.track.groundTruth.annotations;

            allAllowedNamespaces.forEach((allowedNamespace) => {
                const annotation = annotations.find((a) => allowedNamespace.includes(a.namespace));
                if (!annotation) return;
                y += height;
                const uniqueValues = [];
                annotation.data.forEach((segment) => {
                    const confidence = segment.confidence;
                    const duration = segment.duration;
                    const time = segment.time;
                    const value = segment.value;
                    if (!uniqueValues.includes(value)) {
                        uniqueValues.push(value);
                    }

                    this.zoomCanvas.drawRectWithBorder(
                        time,
                        y + this.innerSpacing,
                        duration,
                        this.blockHeight,
                        vis.categoryColor(uniqueValues.indexOf(value)),
                        1,
                        null
                    );
                    //this.zoomCanvas.drawText(time + 0.5, y + this.innerSpacing + this.blockHeight * 0.75, value);
                });
            });
        },
    },
};
</script>

<style>
.GTcanvas {
}
</style>
