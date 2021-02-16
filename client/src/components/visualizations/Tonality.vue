<template>
    <div>
        <v-row>
            <v-col>Tonality</v-col>
        </v-row>
        <Seeker
            v-if="hasTonality"
            class="seeker"
            :ref="'holisticSeeker'"
            :width="width"
            :height="height"
            :color="'rgb(255,255,255,0.3)'"
        />
        <!--<svg v-if="hasTonality" class="tonalitySVG" :width="width" :height="height"></svg>-->
        <canvas id="tonalityCanvas" class="tonalityCanvas" :width="width" :height="height"></canvas>
    </div>
</template>

<script>
import * as log from "../../dev/log";
import * as vis from "../../app/vis";
import * as keyDetection from "../../app/keyDetection";
import Seeker from "./Seeker";
import Section from "./Section";

import SeparatorBackground from "./SeparatorBackground";

import * as testing from "../../app/testing";
import ZoomCanvas from "../../app/visualization/ZoomCanvas";
import * as player from "../../app/player";
import Vue from "vue";

export default {
    props: ["width"],
    components: {
        Seeker,
    },
    data() {
        return {
            paddingTop: 10,
            sectionHeight: 15,
            showLoudness: true,
        };
    },
    computed: {
        height() {
            let height = 0;
            height += this.sectionHeight * 2;
            height += 2;
            return height;
        },
        track() {
            return this.$store.getters.selectedTrack;
        },
        scale() {
            return this.width / this.track.getAnalysisDuration();
        },
        hasTonality() {
            return this.track && this.track.tonalityFeature && this.track.tonalityFeature.length > 0;
        },
        tonality() {
            return this.hasTonality && this.track.tonalityFeature;
        },
        keyFeature() {
            return this.hasTonality && this.track.keyFeature;
        },
        sampleDuration() {
            return this.track.features.sampleDuration;
        },
    },
    watch: {
        hasTonality() {
            this.setupCanvas();
            this.drawTonality();
        },
    },
    mounted() {
        this.setupCanvas();
    },
    methods: {
        setupCanvas() {
            log.debug("Set up canvas");
            if (this.ctx) return;
            this.canvas = document.getElementById("tonalityCanvas");
            if (!this.canvas) {
                log.debug("No canvas");

                return;
            }

            this.canvas.width = this.width;
            this.ctx = this.canvas.getContext("2d");
            this.drawTonality();
        },
        drawTonality() {
            log.debug("Drawing Tonality");
            if (!this.ctx || !this.hasTonality) {
                log.debug("No drawing");
                return;
            }
            this.ctx.clearRect(0, 0, this.width, this.height);

            for (let i = 0; i < this.tonality.length; i++) {
                const x = i * this.sampleDuration * this.scale;
                this.ctx.fillStyle = vis.sinebowColorNormalizedRadius(1 - this.tonality[i][0], this.tonality[i][1], 1);
                this.ctx.fillRect(x, 0, this.sampleDuration * this.scale + 2, this.sectionHeight);
                this.ctx.fillStyle = vis.sinebowColorNormalizedRadius(
                    keyDetection.circleOfFifthsAngle(this.keyFeature[i]),
                    1,
                    1
                );
                this.ctx.fillRect(x, this.sectionHeight + 2, this.sampleDuration * this.scale + 2, this.sectionHeight);
            }
        },
    },
};
</script>

<style scoped>
.seeker {
    pointer-events: none;
}
</style>
