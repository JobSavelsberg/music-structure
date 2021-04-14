<template>
    <div>
        <Seeker :width="width" :height="height" :useZoom="true" />
        <canvas id="PTcanvas" ref="PTcanvas" class="PTcanvas pa-0 ma-0" :height="height" :width="width"></canvas>
        <div v-if="selectedFeatures">
            <p
                v-for="(feature, index) in selectedFeatures"
                :key="feature.name"
                :style="`transform: translate(0px, ${-height - 10 + index * (featureHeight - 40)}px);`"
            >
                {{ feature.name }}
            </p>
        </div>
    </div>
</template>

<script>
import * as log from "../../dev/log";
import * as vis from "../../app/vis";
import Seeker from "./Seeker";
import WebGLPitchTimbre from "../../app/webgl/WebGLPitchTimbre";

export default {
    props: ["width"],
    components: {
        Seeker,
    },
    data() {
        return {
            webGLPitchTimbre: null,
            selectedFeatures: null,
            featureHeight: 200,
        };
    },
    watch: {
        zoomed() {
            this.applyRenderMode();
        },
        track() {
            this.webGLPitchTimbre.clear();
        },
        seekerNormalized() {
            this.draw();
        },
    },
    computed: {
        track() {
            return this.$store.getters.selectedTrack;
        },
        scale() {
            return this.width / this.track.getAnalysisDuration();
        },
        zoomed() {
            return this.$store.getters.isZoomed;
        },
        zoomScale() {
            return this.$store.getters.zoomScale;
        },
        seekerNormalized() {
            return this.$store.getters.seeker / (this.track.getAnalysisDuration() * 1000);
        },
        xCenterPositionNormalized() {
            if (this.zoomed) {
                return this.seekerNormalized;
            } else {
                return 0.5;
            }
        },
        height() {
            if (!this.selectedFeatures) return 100;
            return this.selectedFeatures.length * this.featureHeight;
        },
    },
    mounted() {
        this.webGLPitchTimbre = new WebGLPitchTimbre(document.getElementById("PTcanvas"));
        window.eventBus.$on("readyForPrototypeVis", () => {
            if (!this.track) log.error("Processing done but track does not exist");

            this.selectedFeatures = [
                { name: "Pitch raw", data: this.track.features.raw.pitches, sampled: false, featureAmount: 12 },
                { name: "Pitch Noise", data: this.track.features.processed.noise, sampled: false, featureAmount: 12 },

                {
                    name: "Pitch processed",
                    data: this.track.features.processed.pitches,
                    sampled: false,
                    featureAmount: 12,
                },
                /*{ name: "Pitch sampled", data: this.track.features.sampled.pitches, sampled: true, featureAmount: 12 },
                {
                    name: "Major / Minor",
                    data: this.track.features.sampled.majorminor,
                    sampled: true,
                    featureAmount: 1,
                    range: [-1, 1],
                },
                {
                    name: "Chords",
                    data: this.track.chordsVector,
                    sampled: true,
                    featureAmount: 24,
                    range: [0, 1],
                },
                {
                    name: "Timbre raw",
                    data: this.track.features.raw.timbres,
                    sampled: false,
                    range: [-300, 300],
                    featureAmount: 12,
                },
                {
                    name: "Timbre processed",
                    data: this.track.features.processed.timbres,
                    sampled: false,
                    range: [-1, 1],
                    featureAmount: 12,
                },
                {
                    name: "Timbre Sampled",
                    data: this.track.features.sampled.timbres,
                    sampled: true,
                    range: [-1, 1],
                    featureAmount: 12,
                },*/
            ];
            this.webGLPitchTimbre.setHeight(this.height);
            this.webGLPitchTimbre.fillpitchTimbreBufferPool(this.track, this.selectedFeatures);
            this.applyRenderMode();
        });
    },
    methods: {
        draw() {
            log.debug("Redraw");
            this.webGLPitchTimbre.clear();
            this.webGLPitchTimbre.draw(this.xCenterPositionNormalized, this.zoomed ? this.zoomScale : 1, 1);
        },
        applyRenderMode() {
            clearInterval(this.drawLoop);
            if (this.zoomed) {
                this.draw();
                //this.drawLoop = setInterval(this.draw, this.$store.getters.seekerUpdateSpeed*5);
            } else {
                this.draw();
            }
        },
    },
};
</script>

<style>
.GTcanvas {
}
</style>
