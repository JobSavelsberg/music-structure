<template>
    <rect class="background" id="background" :width="width" :height="height" @click="click($event)"></rect>
</template>

<script>
import * as player from "../../app/player";

export default {
    props: {
        width: { type: Number },
        height: { type: Number },
        useZoom: {
            type: Boolean,
            default: false,
        },
    },
    components: {},
    computed: {
        track() {
            return this.$store.getters.selectedTrack;
        },
        scale() {
            return this.width / this.track.getAnalysisDuration();
        },
        zoomScale() {
            return this.$store.getters.zoomScale;
        },
    },
    methods: {
        click(event) {
            let xNormalized = 0;
            let yNormalized = 0;
            if (this.$store.state.browser === "Firefox") {
                xNormalized = event.layerX / this.width;
                yNormalized = event.layerY / this.height;
            } else {
                xNormalized = event.offsetX / this.width;
                yNormalized = event.layerY / this.height;
            }

            if (this.useZoom && this.isZoomed) {
                const xFromMiddle = xNormalized * 2 - 1;
                const seekerPos = Math.min(
                    1,
                    Math.max(
                        0,
                        this.$store.getters.seeker / (this.track.getAnalysisDuration() * 1000) +
                            xFromMiddle / (2 * this.zoomScale)
                    )
                );
                player.seekS(seekerPos * this.track.getAnalysisDuration());
            } else {
                player.seekS(xNormalized * this.track.getAnalysisDuration());
            }
        },
    },
};
</script>
<style scoped>
.background {
    opacity: 0;
}
</style>
