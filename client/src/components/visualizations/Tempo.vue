<template>
    <div v-if="track && hasFeatures">
        <v-row>
            <v-btn icon small class="pa-0 ma-0" @click="expanded = !expanded"
                ><v-icon>{{ expanded ? "mdi-chevron-up" : "mdi-chevron-down" }}</v-icon>
            </v-btn>
            <p @click="expanded = !expanded" class="pa-0 ma-0">{{ feature.name }}</p>
        </v-row>
        <v-expand-transition>
            <div v-show="expanded">
                <Seeker :width="width" :height="height" />
                <svg :width="width + 25" :height="height">
                    <rect
                        x="0"
                        :width="width"
                        :y="
                            height -
                                (height * this.offsetHeight) / 2 -
                                height * (this.avgPos - (3.5 * this.offsetHeight) / 2)
                        "
                        :height="(height * this.offsetHeight) / 2"
                        opacity=".1"
                        fill="grey"
                    ></rect>
                    <rect
                        x="0"
                        :width="width"
                        :y="
                            height -
                                (height * this.offsetHeight) / 2 -
                                height * (this.avgPos - (2.5 * this.offsetHeight) / 2)
                        "
                        :height="(height * this.offsetHeight) / 2"
                        opacity=".1"
                        fill="white"
                    ></rect>
                    <rect
                        x="0"
                        :width="width"
                        :y="
                            height -
                                (height * this.offsetHeight) / 2 -
                                height * (this.avgPos - (1.5 * this.offsetHeight) / 2)
                        "
                        :height="(height * this.offsetHeight) / 2"
                        opacity=".1"
                        fill="grey"
                    ></rect>
                    <rect
                        x="0"
                        :width="width"
                        :y="height - (height * this.offsetHeight) / 2 - height * (this.avgPos - this.offsetHeight / 4)"
                        :height="(height * this.offsetHeight) / 2"
                        opacity=".2"
                        fill="white"
                    ></rect>
                    <rect
                        x="0"
                        :width="width"
                        :y="height - (height * this.offsetHeight) / 2 - height * (this.avgPos + this.offsetHeight / 4)"
                        :height="(height * this.offsetHeight) / 2"
                        opacity=".1"
                        fill="grey"
                    ></rect>
                    <rect
                        x="0"
                        :width="width"
                        :y="
                            height -
                                (height * this.offsetHeight) / 2 -
                                height * (this.avgPos + (1.5 * this.offsetHeight) / 2)
                        "
                        :height="(height * this.offsetHeight) / 2"
                        opacity=".1"
                        fill="white"
                    ></rect>
                    <rect
                        x="0"
                        :width="width"
                        :y="
                            height -
                                (height * this.offsetHeight) / 2 -
                                height * (this.avgPos + (2.5 * this.offsetHeight) / 2)
                        "
                        :height="(height * this.offsetHeight) / 2"
                        opacity=".1"
                        fill="grey"
                    ></rect>
                    <path fill="none" stroke="white" stroke-width="2" :d="d" class="graphPath" />

                    <text :x="width + 2" y="7" font-size="10" fill="white">{{ parseFloat(max).toFixed(2) }}</text>
                    <text :x="width + 2" :y="height" font-size="10" fill="white">
                        {{ parseFloat(min).toFixed(2) }}
                    </text>
                    <text
                        :x="width + 2"
                        :y="height - height * ((this.feature.avg - this.min) / (this.max - this.min))"
                        font-size="10"
                        fill="white"
                    >
                        {{ parseFloat(this.feature.avg).toFixed(2) }}
                    </text>
                </svg>
            </div>
        </v-expand-transition>
    </div>
</template>

<script>
import * as d3 from "d3";
import * as log from "../../dev/log";
import Seeker from "./Seeker";

export default {
    props: ["width", "height", "featureIndex"],
    components: {
        Seeker,
    },
    data() {
        return {
            range: [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5],
            bgOffset: 0.1,
            expanded: true,
            max: 0,
            min: 0,
            d: null,
        };
    },
    watch: {
        track() {
            this.generateLine();
        },
        width() {
            this.generateLine();
        },
        feature() {
            this.generateLine();
        },
        expanded() {
            this.generateLine();
        },
    },
    computed: {
        track() {
            return this.$store.getters.selectedTrack;
        },
        hasFeatures() {
            return this.track.tempoFeature.data.length > 0;
        },
        feature() {
            return this.track.tempoFeature;
        },
        step() {
            return this.width / (this.feature.data.length - 1);
        },
        lineGenerator() {
            return d3
                .line()
                .x((v, i) => {
                    return (this.width / (this.feature.data.length - 1)) * i;
                })
                .y((v) => {
                    return this.height - this.lmap(v, this.min, this.max) * this.height;
                });
        },
        avgPos() {
            return this.lmap(this.feature.avg, this.min, this.max);
        },
        offsetHeight() {
            return (this.feature.avg * this.bgOffset) / (this.max - this.min);
        },
    },
    mounted() {
        this.generateLine();
        window.eventBus.$on("featuresProcessed", () => {
            log.debug("FEATURESPROCESSEDFROMTempo");
            this.generateLine();
        });
    },
    methods: {
        lmap(val, min, max) {
            return (val - min) / (max - min);
        },
        generateLine() {
            this.min = this.feature.avg * (1 - this.bgOffset);
            this.max = this.feature.avg * (1 + this.bgOffset);
            if (this.feature.min < this.min) {
                this.min = this.feature.min;
            }
            if (this.feature.max > this.max) {
                this.max = this.feature.max;
            }
            this.d = this.lineGenerator(this.feature.data);
        },
    },
};
</script>

<style>
.graphTitle {
    color: white;
}
.icon__flip {
    -moz-transform: scaleX(-1);
    -o-transform: scaleX(-1);
    -webkit-transform: scaleX(-1);
    transform: scaleX(-1);
    filter: FlipH;
    -ms-filter: "FlipH";
}
</style>
