<template>
    <div class="py-5">
        <Seeker
            class="seeker"
            :ref="'holisticSeeker'"
            :width="width"
            :height="height"
            :color="'rgb(255,255,255,0.5)'"
        />
        <svg class="timbreGraphSVG" :width="width" :height="height">
            <defs>
                <linearGradient id="pathGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop
                        v-for="gradientStep in gradientSteps"
                        :key="gradientStep"
                        :offset="`${gradientStep}`"
                        :style="`stop-color:${color(1 - gradientStep)};stop-opacity:1`"
                    />
                </linearGradient>
            </defs>
            <rect
                class="timbreGraphBackground"
                :width="width"
                :height="height"
                opacity="0"
                @click="clickBackground($event)"
            ></rect>
            <path
                v-if="timbreFeatureGraph && showPath"
                fill="none"
                :stroke="showPathGradient ? 'url(#pathGradient)' : 'white'"
                :opacity="showPathGradient ? '1' : '0.2'"
                stroke-width="2"
                stroke-linejoin="round"
                :d="timbreFeatureGraphPath"
                class="timbreGraph"
            />
            <g v-if="showPoints">
                <rect
                    v-for="(sample, index) in timbreFeatureGraph"
                    :key="index"
                    class="sample"
                    stroke="black"
                    stroke-width=".5"
                    rx="5"
                    :x="index * sampleWidth - sampleWidth / 2"
                    :y="height - sampleWidth * 2 - sample * (height - sampleWidth * 2)"
                    :width="sampleWidth"
                    :height="sampleWidth * 2"
                    :fill="color(sample)"
                ></rect>
            </g>
        </svg>
        <v-row>
            <v-col align="center" v-for="(sliderValue, index) in timbreSlider" :key="index">
                <v-img
                    class="timbreImage pa-0 ma-0"
                    max-width="40"
                    :src="require(`../../assets/timbres/${index}.png`)"
                ></v-img>
                <v-slider
                    dense
                    :disabled="disabled[index]"
                    v-model="timbreSlider[index]"
                    vertical
                    thumb-label
                    min="-1"
                    max="1"
                    step="0.05"
                    color="dark"
                    track-color="dark"
                    :thumb-color="disabled[index] ? '#414141' : 'primary'"
                    @click="click($event, index)"
                    @mousedown="mousedown = true"
                    @mouseup="mousedown = false"
                ></v-slider>

                <v-btn small icon :color="solod[index] ? 'primary' : '#414141'" @click="solo(index)">
                    <v-icon>mdi-headphones</v-icon>
                </v-btn>
                <v-btn small icon :color="muted[index] ? 'primary' : '#414141'" @click="mute(index)">
                    <v-icon>mdi-volume-off</v-icon>
                </v-btn>
            </v-col>
            <v-col>
                <v-btn icon color="primary" @click="resetSliders()">
                    <v-icon>mdi-cached</v-icon>
                </v-btn>
                <v-btn icon color="primary" @click="setPreset(presets.test)">
                    <v-icon>mdi-eye</v-icon>
                </v-btn>
                <v-btn icon color="primary" @click="setPreset(presets.all)">
                    <v-icon>mdi-arrow-up-bold</v-icon>
                </v-btn>
            </v-col>
        </v-row>
    </div>
</template>

<script>
import * as log from "../../dev/log";
import * as vis from "../../app/vis";
import Seeker from "./Seeker";
import Section from "./Section";
import * as d3 from "d3";

import * as testing from "../../app/testing";
import ZoomCanvas from "../../app/visualization/ZoomCanvas";
import * as player from "../../app/player";
import Vue from "vue";
import { updateTimbreGraphVis } from "../../app/workers/workers";

export default {
    props: ["width"],
    components: {
        Seeker,
    },
    data() {
        return {
            timbreSlider: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            presets: {
                all: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                bass: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                test: [0.5, 1, -0.3, 0.4, 0.1, -0.8, 0.7, 0.2, 0.1, -0.1, 0.75, -0.75],
            },
            disabled: [false, false, false, false, false, false, false, false, false, false, false, false],
            solod: [false, false, false, false, false, false, false, false, false, false, false, false],
            muted: [false, false, false, false, false, false, false, false, false, false, false, false],
            clicks: 0,
            timer: null,
            mousedown: false,
            showPoints: false,
            gradientStepAmount: 8,
            showPathGradient: true,
            showPath: true,
        };
    },
    computed: {
        height() {
            return 100;
        },
        track() {
            return this.$store.getters.selectedTrack;
        },
        scale() {
            return this.width / this.track.getAnalysisDuration();
        },
        timbreFeatureGraph() {
            return this.track ? this.track.timbreFeatureGraph : null;
        },
        sampleAmount() {
            return this.timbreFeatureGraph.length;
        },
        sampleWidth() {
            return this.width / this.sampleAmount;
        },
        timbreFeatureGraphPath() {
            let path = `M 0 ${this.timbreFeatureGraph[0] * this.height}`;
            for (let i = 1; i < this.sampleAmount; i++) {
                path = path.concat(
                    ` L ${i * this.sampleWidth} ${this.height - this.timbreFeatureGraph[i] * this.height}`
                );
            }

            return path;
        },
        gradientSteps() {
            let steps = [];
            for (let i = 0; i < this.gradientStepAmount; i++) {
                steps.push(i / this.gradientStepAmount);
            }
            return steps;
        },
    },
    watch: {
        timbreSlider: {
            deep: true,

            handler() {
                if (!this.mousedown) {
                    this.sendUpdate();
                }
            },
        },
        track() {
            this.sendUpdate();
        },
    },
    mounted() {
        const self = this;
        window.eventBus.$on("featuresProcessed", () => {
            self.sendUpdate();
        });
    },
    methods: {
        setPreset(preset) {
            this.timbreSlider = preset;
        },
        resetSliders() {
            this.timbreSlider = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        },
        click(event, index) {
            this.clicks++;
            log.debug("Click");
            if (this.clicks === 1) {
                var self = this;
                this.timer = setTimeout(() => {
                    self.clicks = 0;
                }, 300);
            } else {
                clearTimeout(this.timer);
                Vue.set(this.timbreSlider, index, 0);
                this.clicks = 0;
            }
        },
        clickBackground(event) {
            this.$refs["holisticSeeker"].clickedSVG(event);
        },
        solo(index) {
            Vue.set(this.solod, index, !this.solod[index]);
            if (this.solod[index]) {
                Vue.set(this.muted, index, false);
            }
            this.updateDisabled();
        },
        mute(index) {
            Vue.set(this.muted, index, !this.muted[index]);
            if (this.muted[index]) {
                Vue.set(this.solod, index, false);
            }
            this.updateDisabled();
        },
        updateDisabled() {
            const thereIsASolodSlider = this.solod.some((val) => val);
            this.disabled.forEach((slider, index) => {
                if (thereIsASolodSlider) {
                    Vue.set(this.disabled, index, !this.solod[index]);
                } else {
                    Vue.set(this.disabled, index, this.muted[index]);
                }
            });
            this.sendUpdate();
        },
        getSliderValues() {
            const slidersWithDisabled = [];
            this.timbreSlider.forEach((value, index) => {
                slidersWithDisabled.push(this.disabled[index] ? 0 : value);
            });
            return slidersWithDisabled;
        },
        sendUpdate() {
            if (!this.track.updatingTimbreVis) {
                this.track.updateTimbreVis(this.getSliderValues());
            }
        },
        color(mdsFeature) {
            return vis.sinebowColorNormalizedRadius(mdsFeature, 1, 1);
        },
    },
};
</script>

<style scoped>
.timbreSVG {
}
.seeker {
    pointer-events: none;
}
.timbreGraph {
    transition: all 0.3s;
}
.sample {
    transition: all 0.3s;
}
.sample:hover {
    fill: white !important;
    cursor: pointer;
}
.timbreImage {
    /*filter: sepia(100%) saturate(250%) hue-rotate(80deg) contrast(80%);*/
    filter: brightness(1.1) contrast(80%);
}
</style>
