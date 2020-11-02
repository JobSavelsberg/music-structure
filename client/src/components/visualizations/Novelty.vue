<template>
    <svg :width="width" :height="height * 2">
        <path fill="none" stroke="white" stroke-width="2" :d="d" />
    </svg>
</template>

<script>
import * as d3 from "d3";
import * as log from "../../dev/log";

export default {
    props: ["width"],
    data() {
        return {
            height: 60,
            max: 0,
            min: 0,
            d: null,
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
            this.generateLine();
        });
    },
    methods: {
        lmap(val, min, max) {
            return (val - min) / (max - min);
        },
        generateLine() {
            log.info("Generating Line");
            this.max = Math.max(...this.track.novelty);
            this.min = Math.min(...this.track.novelty);

            this.d = this.lineGenerator(this.track.novelty);
        },
    },
};
</script>

<style></style>
