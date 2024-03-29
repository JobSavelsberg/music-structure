<template>
    <div>
        <v-row>
            <v-btn icon small @click="collapsed = !collapsed">
                <v-icon>
                    {{ collapsed ? "mdi-unfold-more-horizontal" : "mdi-unfold-less-horizontal" }}
                </v-icon>
            </v-btn>
            <p>
                Tonality
            </p>
            <v-spacer></v-spacer>
            <v-btn icon small @click="showHelp = !showHelp"> <v-icon color="#ccc" dark>mdi-help-box</v-icon> </v-btn>
            <Tooltip :show="showHelp">
                This visualization shows the song's tonality change over time. Similarly to the chords, the colours
                correspond to the circle of fifths. Click the
                <v-icon small color="#ccc">mdi-unfold-more-horizontal</v-icon> button to see the circle of fifths with their
                corresponding key names. A real-time, fast and slow pointer shows the detected key for that moment.
            </Tooltip>
        </v-row>
        <Seeker
            v-if="hasTonality"
            class="seeker"
            :ref="'holisticSeeker'"
            :width="width"
            :height="height"
            :color="'rgb(255,255,255,0.3)'"
        />

        <canvas
            id="tonalityCanvas"
            class="tonalityCanvas"
            :width="width"
            :height="height"
            @click="clickCanvas($event)"
        ></canvas>

        <div :style="`height: ${!collapsed * co5Size}px`" class="circleOfFifthsTonality">
            <svg v-if="hasTonality" class="tonalitySVG" :width="co5Size" :height="!collapsed * co5Size">
                <circle :cx="co5Size / 2" :cy="co5Size / 2" :r="co5Size / 2" fill="black"></circle>
                <g :transform="`translate(${co5Size / 2},${co5Size / 2})`" stroke="#000" stroke-width="2">
                    <!--<path  />-->
                    <path
                        v-for="(keyNumber, index) in circleOfFifths"
                        :key="'co5' + index"
                        :d="
                            `M 0 0 0 -${co5Size / 2} A ${co5Size / 2} ${co5Size / 2} 0 0 1 ${(Math.sin(
                                (1 / 12) * Math.PI * 2
                            ) *
                                co5Size) /
                                2} ${-(Math.cos((1 / 12) * Math.PI * 2) * co5Size) / 2} Z`
                        "
                        :transform="`rotate(${((-index - 0.5) / 12) * 360} 0 0)`"
                        :fill="color(1 - index / 12, 1, 0.7)"
                    />
                    <circle :r="(co5Size / 2) * 0.58" fill="#121212"></circle>
                    <circle :r="(co5Size / 2) * 0.8" fill="none" stroke="#121212" stroke-width="2"></circle>

                    <text
                        v-for="(keyNumber, index) in circleOfFifths"
                        :key="'co5text' + index"
                        :x="(Math.sin((index / 12) * Math.PI * 2) * co5Size * 0.9) / 2"
                        :y="-(Math.cos((index / 12) * Math.PI * 2) * co5Size * 0.9) / 2"
                        class="co5text"
                        text-anchor="middle"
                        alignment-baseline="middle"
                    >
                        {{ keyName(keyNumber) }}
                    </text>
                    <text
                        v-for="(keyNumber, index) in circleOfFifths"
                        :key="'co5textm' + index"
                        :x="(Math.sin(((index - 3) / 12) * Math.PI * 2) * co5Size * 0.7) / 2"
                        :y="-(Math.cos(((index - 3) / 12) * Math.PI * 2) * co5Size * 0.7) / 2"
                        class="co5textm"
                        text-anchor="middle"
                        alignment-baseline="middle"
                    >
                        {{ keyName(keyNumber + 12) }}
                    </text>
                </g>

                <path
                    class="tonalityPointerSlow"
                    :transform="`rotate(${currentAngleSlow * 360} ${co5Size / 2} ${co5Size / 2})`"
                    :d="tonalityPointerPath(tonalitySlow)"
                    stroke-width="4"
                    :stroke="color(currentAngleSlow, 0.6, 0.6)"
                />
                <path
                    class="tonalityPointer"
                    :transform="`rotate(${currentAngle * 360} ${co5Size / 2} ${co5Size / 2})`"
                    :d="tonalityPointerPath(tonality)"
                    stroke-width="4"
                    :stroke="color(currentAngle)"
                />
            </svg>
        </div>
    </div>
</template>

<script>
import * as log from "../../dev/log";
import * as vis from "../../app/vis";
import * as audioUtil from "../../app/audioUtil";

import * as keyDetection from "../../app/keyDetection";
import Seeker from "./Seeker";
import Section from "./Section";

import ClickableBackground from "./ClickableBackground";
import SeparatorBackground from "./SeparatorBackground";
import Tooltip from "./Tooltip.vue";
import * as testing from "../../app/testing";
import ZoomCanvas from "../../app/visualization/ZoomCanvas";
import * as player from "../../app/player";
import Vue from "vue";

export default {
    props: ["width"],
    components: {
        Seeker,
        Tooltip,
    },
    data() {
        return {
            paddingTop: 10,
            sectionHeight: 20,
            showLoudness: true,
            accumulativeAngle: [],
            collapsed: true,
            co5Size: 300,
            showHelp: false,
        };
    },
    computed: {
        height() {
            let height = 0;
            height += this.sectionHeight * 2;
            height += 2 * 2;
            return height;
        },
        track() {
            return this.$store.getters.selectedTrack;
        },
        scale() {
            return this.width / this.track.getAnalysisDuration();
        },
        hasTonality() {
            return this.track && this.track.tonalityFeatureLarge && this.track.tonalityFeatureLarge.length > 0;
        },
        tonality() {
            return this.hasTonality && this.track.tonalityFeatureSmall;
        },
        tonalitySlow() {
            return this.hasTonality && this.track.tonalityFeatureLarge;
        },
        keyFeature() {
            return this.hasTonality && this.track.keyFeature;
        },
        sampleDuration() {
            return this.track.features.sampleDuration;
        },
        fastSampleDuration() {
            return this.track.features.fastSampleDuration;
        },
        currentFastSample() {
            return Math.floor(this.$store.getters.seeker / 1000 / this.fastSampleDuration);
        },
        currentSample() {
            return Math.floor(this.$store.getters.seeker / 1000 / this.sampleDuration);
        },
        currentAngle() {
            return this.accumulativeAngle[this.currentFastSample];
        },
        currentAngleSlow() {
            return this.accumulativeAngleSlow[this.currentFastSample];
        },
        circleOfFifths() {
            return audioUtil.circleOfFifths;
        },
        currentKey() {
            return this.keyFeature[this.currentFastSample];
        },
    },
    watch: {
        track() {
            if (this.hasTonality) {
                this.setupCanvas();
                this.accumulativeAngle = this.computeAccumulativeAngle(this.tonality);
                this.accumulativeAngleSlow = this.computeAccumulativeAngle(this.tonalitySlow);

                this.drawTonality();
            }
        },
        hasTonality() {
            if (this.hasTonality) {
                this.setupCanvas();
                this.accumulativeAngle = this.computeAccumulativeAngle(this.tonality);
                this.accumulativeAngleSlow = this.computeAccumulativeAngle(this.tonalitySlow);
                this.drawTonality();
            }
        },
    },
    mounted() {
        this.setupCanvas();
    },
    methods: {
        setupCanvas() {
            if (this.ctx) return;
            this.canvas = document.getElementById("tonalityCanvas");
            if (!this.canvas) {
                return;
            }

            this.canvas.width = this.width;
            this.ctx = this.canvas.getContext("2d");
            this.drawTonality();
        },
        tonalityPointerPath(tonality) {
            const scale = this.co5Size / 2;
            const radius = Math.tanh(tonality[this.currentFastSample][1] * 3) * 0.5;
            const x = 0; // Math.cos(this.tonality[this.currentSample][0] * Math.PI * 2);
            const y = -1; //Math.sin(this.tonality[this.currentSample][0] * Math.PI * 2);

            let path = "";
            path = path.concat(" M ", scale, " ", scale);
            path = path.concat(" L ", scale + x * scale * radius, " ", scale + y * scale * radius);
            path = path.concat(" Z");
            return path;
        },
        drawTonality() {
            if (!this.ctx || !this.hasTonality) {
                return;
            }
            this.ctx.clearRect(0, 0, this.width, this.height);

            for (let i = 0; i < this.tonality.length; i++) {
                const x = i * this.fastSampleDuration * this.scale;

                this.ctx.fillStyle = this.color(this.tonalitySlow[i][0], Math.sqrt(this.tonalitySlow[i][1] * 2), 1);
                this.ctx.fillRect(
                    x,
                    this.sectionHeight + 2,
                    this.fastSampleDuration * this.scale + 2,
                    this.sectionHeight
                );
                this.ctx.fillStyle = this.color(this.tonality[i][0], this.tonality[i][1] * 1.5, 1);
                this.ctx.fillRect(x, 0, this.fastSampleDuration * this.scale + 2, this.sectionHeight);
                /*
                this.ctx.fillStyle = this.color(keyDetection.circleOfFifthsAngle(this.keyFeature[i]), 1, 1);
                this.ctx.fillRect(
                    x,
                    (this.sectionHeight + 2) * 2,
                    this.fastSampleDuration * this.scale + 2,
                    this.sectionHeight
                );*/
                /*if (i === 0 || i === 200) {
                    this.ctx.fillStyle = "white";
                    this.ctx.fillRect(
                        x,
                        (this.sectionHeight + 2) * 2 - 4,
                        this.fastSampleDuration * this.scale + 6,
                        this.sectionHeight * 2
                    );
                }*/
            }
        },
        computeAccumulativeAngle(tonality) {
            const accumulativeAngle = [];
            let prevAngle = tonality[0][0];
            let windCounter = 0;
            for (let i = 0; i < tonality.length; i++) {
                const current = tonality[i][0];
                const passThrough0Pos = current < prevAngle && prevAngle - current > 1 + current - prevAngle;
                const passThrough0Neg = current > prevAngle && current - prevAngle > 1 + prevAngle - current;
                if (passThrough0Pos) windCounter++;
                if (passThrough0Neg) windCounter--;
                accumulativeAngle.push(windCounter + current);
                prevAngle = current;
            }
            return accumulativeAngle;
        },
        color(angle, saturation = 1.3, opacity = 1) {
            if (angle < 0) angle += Math.abs(Math.floor(angle));
            return vis.circleOfFifthsColor(angle % 1, saturation, opacity);
        },
        keyName(keyNumber) {
            return audioUtil.keyNames[keyNumber];
        },
        clickCanvas(event) {
            let xNormalized = 0;
            let yNormalized = 0;
            if (this.$store.state.browser === "Firefox") {
                xNormalized = event.layerX / this.width;
                yNormalized = event.layerY / this.height;
            } else {
                xNormalized = event.offsetX / this.width;
                yNormalized = event.layerY / this.height;
            }

            player.seekS(xNormalized * this.track.getAnalysisDuration());
        },
    },
};
</script>

<style scoped>
.seeker {
    pointer-events: none;
}
.circleOfFifthsTonality {
    position: relative;
    transition: 0.5s;
}
.tonalitySVG {
    position: absolute;
    transition: 0.5s;
    top: 0;
    left: 0;
    z-index: 20;
}
.tonalityPointer {
    transition: 0.15s;
    z-index: 20;
}
.tonalityPointerSlow {
    transition: 0.15s;
    z-index: 20;
}
.CO5 {
    transition: 0.5s;
    overflow: hidden;
    z-index: 1;
    object-position: 0 0;
    position: absolute;
    top: 0;
    left: 0;
    opacity: 0.5;
}
.co5text {
    font: 14px Roboto;
    fill: white;
    stroke: transparent;
}
.co5textm {
    font: 12px Roboto;
    fill: white;
    stroke: transparent;
}
</style>
