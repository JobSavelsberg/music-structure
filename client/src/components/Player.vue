<template>
    <div class="player">
        <!-- Play Button -->
        <div class="d-flex justify-center pa-4">
            <div v-if="playerReady">
                <v-hover v-slot:default="{ hover }">
                    <v-btn :elevation="hover ? 5 : 0" outlined fab @click="playPause">
                        <v-icon large>mdi-{{ playing ? "pause" : "play" }}</v-icon>
                    </v-btn>
                </v-hover>
            </div>
            <div v-if="!playerReady">
                <v-progress-circular indeterminate size="56"></v-progress-circular>
            </div>
        </div>

        <!-- Waveform -->
        <div v-show="!loadingTrack" class="waveformWrapper" @click="clickedWaveform">
            <canvas id="waveform" :height="height" class="waveform pa-0 ma-0"></canvas>
            <svg
                v-if="!loadingTrack"
                :height="height"
                :width="width"
                class="seekerSVG"
                :style="`transform: translate(${-width}px, 0px);`"
            >
                <rect
                    :x="0"
                    :y="0"
                    :width="seekerNormalized * width"
                    :height="height"
                    :fill="'#121212'"
                    class="darkenWaveform"
                ></rect>
                <rect :x="seekerNormalized * width - 1.25" :y="0" :width="2.5" :height="height" fill="#1DB954"></rect>
            </svg>
        </div>
        <div v-if="loadingTrack">
            <v-progress-linear indeterminate color="success"></v-progress-linear>
        </div>
    </div>
</template>

<script>
import * as log from "../dev/log";
import * as player from "../app/player";
import * as auth from "../app/authentication";
import * as vis from "../app/vis";

export default {
    props: ["width"],
    data() {
        return {
            height: 50,
            canvas: null,
            ctx: null,
        };
    },
    computed: {
        track() {
            return this.$store.getters.selectedTrack;
        },
        loadingTrack() {
            return this.$store.state.loadingTrack;
        },
        playing() {
            return this.$store.getters.playing;
        },
        seekerNormalized() {
            return this.$store.getters.seeker / (this.track.getAnalysisDuration() * 1000);
        },
        playerReady() {
            return this.$store.getters.playerReady;
        },
    },
    watch: {
        width() {
            this.setupCanvas();
            this.drawWaveform();
        },
        loadingTrack(loading) {
            if (!loading) {
                this.drawWaveform();
                if (this.playerReady) {
                    this.loadTrackToPlayer();
                }
            }
        },
        playerReady(ready) {
            if (ready && !this.loadingTrack) {
                this.loadTrackToPlayer();
            }
        },
    },
    beforeCreate() {
        player.initialize(auth.token);
    },
    mounted() {
        this.setupCanvas();
    },
    methods: {
        setupCanvas() {
            this.canvas = document.getElementById("waveform");
            if (!this.canvas) {
                log.warn("canvas not ready: ");
                return;
            }
            this.canvas.width = this.width;
            this.ctx = this.canvas.getContext("2d");
        },
        loadTrackToPlayer() {
            player.loadTrack(this.track);
        },
        drawWaveform() {
            if (!this.canvas) {
                log.error("Can't draw waveform; canvas is not created");
                return;
            }
            if (!this.ctx) {
                log.error("Can't draw waveform; canvas context is not created");
                return;
            }
            this.ctx.clearRect(0, 0, this.width, this.height);
            vis.renderWaveform(this.ctx, this.width, this.height, this.track);
        },
        playPause() {
            this.playing ? player.pause() : player.resume();
        },
        clickedWaveform(event) {
            let xNormalized = 0;
            if (this.$store.state.browser === "Firefox") {
                xNormalized = event.layerX / this.width;
            } else {
                xNormalized = event.offsetX / this.width;
            }
            player.seekS(xNormalized * this.track.getAnalysisDuration());
        },
    },
};
</script>

<style scoped>
.player {
    height: 100%;
}
.waveFormWrapper {
    position: relative;
    color: white;
}

.waveform {
    z-index: 1;
}
.darkenWaveform {
    background: #121212;
    z-index: 5;
    opacity: 0.5;
}
.seekerSVG {
    position: absolute;
    z-index: 10;
}
</style>
