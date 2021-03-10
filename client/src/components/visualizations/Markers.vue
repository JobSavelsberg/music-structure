<template>
    <g>
        <g v-for="marker in markers" :key="marker.time">
            <rect
                class="marker"
                :x="normalizeTime(marker.time) * width - 1.25"
                :y="showMarkerLabel ? markerLabelHeight : 0"
                :width="2.5"
                :height="height - (showMarkerLabel ? markerLabelHeight : 0)"
                :fill="marker.color || 'grey'"
                :style="`opacity: ${opacity}`"
                @click.left="clickedMarker(marker)"
                @dblclick="doubleClickMarker(marker)"
            ></rect>
            <foreignObject
                v-if="showMarkerLabel"
                :x="normalizeTime(marker.time) * width - 1.25 - 3"
                :y="-markerLabelHeight / 2"
                :width="100"
                :height="markerLabelHeight * 2"
            >
                <span class="markerLabel" :style="`color: ${marker.color}`">
                    {{ marker.label }}
                </span>
            </foreignObject>

            <g v-if="isShowingEdit(marker)">
                <foreignObject
                    :x="Math.min(width - 180, normalizeTime(marker.time) * width - 1.25 + 10)"
                    :y="0"
                    :width="180"
                    :height="height"
                    class="editObject"
                >
                    <div class="markerEditDiv" :height="height / 2" @blur="blur(marker)">
                        <v-text-field
                            class="px-5 pb-0"
                            v-model="marker.label"
                            @focus="$store.commit('setInputFocus', true)"
                            @blur="blur(marker)"
                        ></v-text-field>

                        <v-color-picker
                            v-model="marker.color"
                            hide-inputs
                            hide-canvas
                            :height="height / 2"
                        ></v-color-picker>
                    </div>
                </foreignObject>
            </g>
        </g>
    </g>
</template>

<script>
import * as d3 from "d3";
import * as log from "../../dev/log";
import * as player from "../../app/player";

export default {
    props: {
        width: Number,
        height: Number,
        opacity: Number,
        showMarkerLabel: Boolean,
    },
    data() {
        return {
            showingMarkerEdit: null,
            markerLabelHeight: 15,
        };
    },
    computed: {
        track() {
            return this.$store.getters.selectedTrack;
        },
        loadingTrack() {
            return this.$store.state.loadingTrack;
        },
        seekerNormalized() {
            return this.$store.getters.seeker / (this.track.getAnalysisDuration() * 1000);
        },
        isZoomed() {
            return this.$store.state.isZoomed;
        },
        zoomScale() {
            return this.$store.getters.zoomScale;
        },
        markers() {
            return this.track.markers;
        },
        inputFocus() {
            return this.$store.state.inputFocus;
        },
    },
    mounted() {
        this._keyListener = function(e) {
            if (event.keyCode === 13 && this.showingMarkerEdit) {
                e.preventDefault();
                this.showingMarkerEdit = null;
            }
        };
        document.addEventListener("keydown", this._keyListener.bind(this));
    },
    beforeDestroy() {
        document.removeEventListener("keydown", this._keyListener);
    },
    watch: {
        inputFocus() {
            log.debug(this.inputFocus);
            if (!this.inputFocus) {
                this.showingMarkerEdit = null;
            }
        },
    },
    methods: {
        normalizeTime(time) {
            return time / this.track.getAnalysisDuration();
        },
        clickedMarker(marker) {
            player.seekS(marker.time);
        },
        doubleClickMarker(marker) {
            log.debug("dblckick");
            this.showEdit(marker);
        },
        rightClick(event) {
            let xNormalized = 0;
            if (this.$store.state.browser === "Firefox") {
                xNormalized = event.layerX / this.width;
            } else {
                xNormalized = event.offsetX / this.width;
            }
            this.track.placeMarker(xNormalized * this.track.getAnalysisDuration());
        },
        showEdit(marker) {
            if (!this.isShowingEdit(marker)) {
                this.showingMarkerEdit = marker;
                this.$store.commit("setInputFocus", true);
            }
        },
        isShowingEdit(marker) {
            return this.showingMarkerEdit === marker;
        },
        blur(marker) {
            log.debug("blur");
            this.showingMarkerEdit = null;
            this.$store.commit("setInputFocus", false);
        },
    },
};
</script>

<style>
.marker {
    z-index: -100;
}
.marker:hover {
    fill: white !important;
    opacity: 0.7 !important;
    cursor: pointer;
}
.markerEditDiv {
    background-color: rgba(50, 50, 50, 1);
    border-radius: 5px;
    z-index: 20;
}
.markerLabel {
    font: 13px Roboto;
}
.editObject {
    transform-style: preserve-3d;
    z-index: 10;
}
</style>
