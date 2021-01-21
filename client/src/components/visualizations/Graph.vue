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
                    <path fill="none" stroke="white" stroke-width="2" :d="d" class="graphPath" />
                    <rect
                        x="0"
                        y="0"
                        :width="width"
                        :height="height"
                        style="fill:none; stroke:grey; stroke-width:1; fill-opacity:0; stroke-opacity:1;"
                    />
                    <text :x="width + 2" y="7" font-size="10" fill="white">{{ parseFloat(max).toFixed(2) }}</text>
                    <text :x="width + 2" :y="height" font-size="10" fill="white">
                        {{ parseFloat(min).toFixed(2) }}
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
            expanded: true,
            max: 0,
            min: 0,
            d: null,
        };
    },
    watch: {
        width() {
            this.generateLine();
        },
    },
    computed: {
        track() {
            return this.$store.getters.selectedTrack;
        },
        hasFeatures() {
            return this.track.graphFeatures.length > 0;
        },
        feature() {
            return this.track.graphFeatures[this.featureIndex];
        },
        step() {
            return this.width / (this.feature.data.length - 1);
        },
        lineGenerator() {
            return d3
                .line()
                .x((v, i) => {
                    return this.step * i;
                })
                .y((v) => {
                    return this.height - this.lmap(v, this.min, this.max) * this.height;
                });
        },
    },
    mounted() {
        this.generateLine();
        window.eventBus.$on("readyForPrototypeVis", () => {
            this.generateLine();
        });
    },
    methods: {
        lmap(val, min, max) {
            return (val - min) / (max - min);
        },
        generateLine() {
            if (this.feature.min !== undefined) {
                this.min = this.feature.min;
            } else {
                this.min = Math.min(...this.feature.data);
            }
            if (this.feature.max !== undefined) {
                this.max = this.feature.max;
            } else {
                this.max = Math.max(...this.feature.data);
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
