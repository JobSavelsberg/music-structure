<template>
    <div v-if="track">
        <div v-for="(feature, index) in features" :key="feature.name">
            <Graph :width="width" :height="height" :featureIndex="index" />
        </div>
    </div>
</template>

<script>
import * as d3 from "d3";
import * as log from "../../dev/log";
import Graph from "./Graph";

export default {
    props: ["width"],
    components: {
        Graph,
    },
    data() {
        return {
            height: 60,
            features: [],
        };
    },
    computed: {
        track() {
            return this.$store.getters.selectedTrack;
        },
    },
    mounted() {
        window.eventBus.$on("readyForPrototypeVis", () => {
            if (this.features.length <= 0) {
                this.track.graphFeatures.forEach((feature, index) => {
                    this.features.push(feature.name);
                });
            }
        });
    },
};
</script>

<style>
.graphTitle {
    color: white;
}
</style>
