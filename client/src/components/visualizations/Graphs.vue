<template>
    <div v-if="track">
        <div v-for="feature in this.track.graphFeatures" :key="feature.name">
            <p class="pa-0 ma-0">{{ feature.name }}</p>
            <Seeker :width="width" :height="height" />
            <svg :width="width" :height="height">
                <path fill="none" stroke="white" stroke-width="2" :d="d[feature.name]" class="graphPath" />
            </svg>
        </div>
    </div>
</template>

<script>
import * as d3 from "d3";
import * as log from "../../dev/log";
import Seeker from "./Seeker";

export default {
    props: ["width"],
    components: {
        Seeker,
    },
    data() {
        return {
            height: 60,
            max: 0,
            min: 0,
            d: {},
        };
    },
    computed: {
        track() {
            return this.$store.getters.selectedTrack;
        },
        step() {
            return this.width / this.track.features.sampleAmount;
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
        window.eventBus.$on("readyForVis", () => {
            this.track.graphFeatures.forEach((feature) => this.generateLine(feature));
        });
    },
    methods: {
        lmap(val, min, max) {
            return (val - min) / (max - min);
        },
        generateLine(feature) {
            this.max = Math.max(...feature.data);
            this.min = Math.min(...feature.data);
            this.d[feature.name] = this.lineGenerator(feature.data);
        },
    },
};
</script>

<style>
.graphTitle {
    color: white;
}
</style>
