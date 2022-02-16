<template>
    <div class="py-1">
        <v-row>
            <v-btn icon small @click="collapsed = !collapsed">
                <v-icon>
                    {{ collapsed ? "mdi-unfold-more-horizontal" : "mdi-unfold-less-horizontal" }}
                </v-icon>
            </v-btn>
            <p>
                Chords
            </p>
            <v-spacer></v-spacer>
            <v-btn icon small @click="showHelp = !showHelp"> <v-icon color="#ccc" dark>mdi-help-box</v-icon> </v-btn>
            <Tooltip :show="showHelp">
                This visualization shows major and minor triad chords over time. The colors and positions correspond to
                the circle of fifhts, such that relative minor and major chords have the same colour, with minor chords
                being distinguished by diagonal stripes. The
                <v-icon small color="#ccc">mdi-unfold-less-horizontal</v-icon> button collapses the chord positions into
                a single row.
            </Tooltip>
        </v-row>

        <Seeker
            v-if="hasChords"
            class="seeker"
            :ref="'chordsSeeker'"
            :width="width"
            :height="height"
            :color="'rgb(255,255,255,0.3)'"
        />
        <svg v-if="hasChords" class="chordsSVG" :width="width" :height="height">
            <ClickableBackground :width="width" :height="height"></ClickableBackground>
            <defs>
                <pattern
                    id="textureDiagonal"
                    width="4"
                    height="4"
                    patternUnits="userSpaceOnUse"
                    patternContentUnits="userSpaceOnUse"
                >
                    <path
                        d="M-1,1 l2,-2
                            M0,4 l4,-4
                            M3,5 l2,-2"
                        style="stroke:#999999; stroke-width:1"
                    />
                </pattern>
                <pattern
                    id="texture"
                    width="4"
                    height="1"
                    patternUnits="userSpaceOnUse"
                    patternContentUnits="userSpaceOnUse"
                >
                    <path d="M 0 0 l 10 0" style="stroke:#414141; stroke-width:1" />
                </pattern>
                <mask id="diagonalMask" x="0" y="0" width="1" height="1">
                    <rect x="0" y="0" width="1000" height="1000" fill="url(#textureDiagonal)" />
                </mask>
            </defs>
            <!--<rect
                v-for="(chord, index) in chords"
                :key="index + 'chord'"
                class="chord"
                rx="3"
                :x="chord.start * scale + 0.5"
                :y="height - chord.index * blockHeight - blockHeight"
                :width="(chord.end - chord.start) * scale - 0.5"
                :height="blockHeight - 0.5"
                :fill="'black'"
                @click="clickedChord(chord)"
            ></rect>-->
            <rect
                v-for="(chord, index) in chords"
                :key="index + 'chord'"
                class="chord"
                rx="3"
                :x="chord.start * scale + 0.5"
                :y="collapsed ? '0' : ((2 - chord.angle + chordGapOffset) % 1) * (height - blockHeight) + 0.5"
                :width="(chord.end - chord.start) * scale - 0.5"
                :height="blockHeight - 0.5"
                :fill="color(chord)"
                @click="clickedChord(chord)"
            ></rect>
            <rect
                v-for="(chord, index) in chords"
                :key="index + 'chordoverlay'"
                v-show="!isMajor(chord)"
                class="chordoverlay"
                rx="3"
                :x="chord.start * scale + 0.5"
                :y="collapsed ? '0' : ((2 - chord.angle + chordGapOffset) % 1) * (height - blockHeight) + 0.5"
                :width="(chord.end - chord.start) * scale - 0.5"
                :height="blockHeight - 0.5"
                :fill="colorBrightness(chord, 0.02)"
                mask="url(#diagonalMask)"
                @click="clickedChord(chord)"
            />
        </svg>
        <canvas id="chordNameCanvas" class="chordNameCanvas" :width="width" :height="chordNameHeight"></canvas>
    </div>
</template>

<script>
// chord.index/ 12 %1
// (chord.index < 12 ? chord.index / 12 : (chord.index + (3 % 12)) / 12)
import * as log from "../../dev/log";
import * as vis from "../../app/vis";
import Seeker from "./Seeker";
import Section from "./Section";
import ClickableBackground from "./ClickableBackground";
import StructureBackground from "./StructureBackground";
import Tooltip from "./Tooltip";
import * as testing from "../../app/testing";
import ZoomCanvas from "../../app/visualization/ZoomCanvas";
import * as player from "../../app/player";
import Vue from "vue";

export default {
    props: ["width"],
    components: {
        Seeker,
        ClickableBackground,
        Tooltip,
    },
    data() {
        return {
            blockHeight: 10,
            chordNameHeight: 20,
            maxChordViewDistance: 10,
            canvas: null,
            ctx: null,
            collapsed: false,
            showHelp: false,
        };
    },
    computed: {
        height() {
            return this.blockHeight * (this.collapsed ? 1 : 12);
        },
        track() {
            return this.$store.getters.selectedTrack;
        },
        scale() {
            return this.width / this.track.getAnalysisDuration();
        },
        seekerTime() {
            return this.$store.getters.seeker / 1000;
        },
        hasChords() {
            return this.track && this.track.chords && this.track.chords.length > 0;
        },
        chords() {
            return this.track.chords;
        },
        currentChord() {
            return this.chords.find((chord) => this.isPlayingChord(chord, this.seekerTime)) || { name: "" };
        },
        chordScrollMiddle() {
            return 50;
            //return this.seekerTime * this.scale;
        },
        chordGapOffset() {
            const chordTotalDuration = new Float32Array(12);

            this.chords.forEach((chord) => {
                chordTotalDuration[Math.round(chord.angle * 12)] += chord.end - chord.start;
            });

            let min = Number.POSITIVE_INFINITY;
            let minIndex = -1;
            for (let i = 0; i < 12; i++) {
                if (chordTotalDuration[i] < min) {
                    min = chordTotalDuration[i];
                    minIndex = i;
                }
            }

            log.debug("Chord total duration", chordTotalDuration);
            return minIndex / 12;
        },
    },
    watch: {
        seekerTime() {
            this.drawChordNames();
        },
        hasChords() {
            this.setupCanvas();
        },
    },
    mounted() {
        this.setupCanvas();
    },
    methods: {
        setupCanvas() {
            if (this.ctx) return;
            this.canvas = document.getElementById("chordNameCanvas");
            if (!this.canvas) {
                return;
            }
            this.canvas.width = this.width;
            this.ctx = this.canvas.getContext("2d");
            this.drawChordNames();
        },
        drawChordNames() {
            if (!this.ctx || !this.hasChords) {
                log.debug("No drawing");
                return;
            }
            this.ctx.fillStyle = "white";
            this.ctx.clearRect(0, 0, this.width, this.chordNameHeight);
            //this.ctx.fillRect(0, 0, this.width, this.chordNameHeight);

            const lineStep = this.chordNameHeight;

            this.ctx.fillStyle = "white";
            this.chords.forEach((chord) => {
                const chordSeekerStartOffset = chord.start - this.seekerTime;
                let startX = this.chordScrollMiddle + chordSeekerStartOffset * this.scale * 22;
                const chordSeekerEndOffset = chord.end - this.seekerTime;
                const endX = this.chordScrollMiddle + chordSeekerEndOffset * this.scale * 22;

                if (chordSeekerEndOffset > 0 && chordSeekerStartOffset < this.maxChordViewDistance) {
                    if (chord.start <= this.seekerTime) {
                        this.ctx.fillStyle = this.color(chord, 1);
                        if (endX - this.chordScrollMiddle - 3 > 6) {
                            this.roundedRect(
                                this.chordScrollMiddle,
                                0,
                                endX - this.chordScrollMiddle - 3,
                                this.chordNameHeight,
                                3
                            );
                            this.ctx.strokeStyle = "rgba(0,0,0,0.3)";
                            this.ctx.lineWidth = 3;
                            const textSpaceOffset = chord.name.length * 12;
                            if (!this.isMajor(chord)) {
                                for (let i = startX + textSpaceOffset; i < endX; i += lineStep / 2) {
                                    if (i < this.chordScrollMiddle - lineStep) continue;
                                    this.ctx.beginPath();
                                    this.ctx.moveTo(i, this.chordNameHeight);
                                    if (i + lineStep > endX - 3) {
                                        this.ctx.lineTo(
                                            endX - 3,
                                            this.chordNameHeight + 3 - (lineStep - (lineStep + i - endX))
                                        );
                                    } else {
                                        this.ctx.lineTo(i + lineStep, 0);
                                    }
                                    this.ctx.stroke();
                                }
                                this.ctx.fillStyle = "#121212";
                                this.ctx.fillRect(this.chordScrollMiddle - lineStep, 0, lineStep, this.chordNameHeight);
                            }
                        }

                        this.ctx.fillStyle = "white";
                        this.ctx.font = "18px Roboto";

                        this.ctx.fillText(chord.name, this.chordScrollMiddle - 50 + 2, this.chordNameHeight - 4);
                    } else {
                        const opacity = 1 - chordSeekerStartOffset / this.maxChordViewDistance;
                        this.ctx.fillStyle = this.color(chord, opacity * 1.5);
                        this.roundedRect(startX, 0, endX - startX - 3, this.chordNameHeight, 3);
                        this.ctx.strokeStyle = "rgba(0,0,0,0.3)";
                        this.ctx.font = "14px Roboto";
                        this.ctx.lineWidth = 3;
                        if (!this.isMajor(chord)) {
                            const textSpaceOffset = chord.name.length * 12;
                            for (let i = startX + textSpaceOffset; i < endX; i += lineStep / 2) {
                                this.ctx.beginPath();
                                this.ctx.moveTo(i, this.chordNameHeight);
                                if (i + lineStep > endX - 3) {
                                    this.ctx.lineTo(
                                        endX - 3,
                                        this.chordNameHeight + 3 - (lineStep - (lineStep + i - endX))
                                    );
                                } else {
                                    this.ctx.lineTo(i + lineStep, 0);
                                }
                                this.ctx.stroke();
                            }
                        }

                        this.ctx.fillStyle = `rgba(0,0,0,${opacity * 2})`;

                        this.ctx.fillText(chord.name, startX + 2, this.chordNameHeight - 4);
                    }
                }
            });
            this.ctx.fillRect(this.chordScrollMiddle - 1, 0, 2, this.chordNameHeight);
        },
        roundedRect(x, y, width, height, radius) {
            this.ctx.beginPath();
            this.ctx.moveTo(x + width, y + height);
            this.ctx.arcTo(x, y + height, x, y, radius);
            this.ctx.arcTo(x, y, x + width, y, radius);
            this.ctx.arcTo(x + width, y, x + width, y + height, radius);
            this.ctx.arcTo(x + width, y + height, x, y + height, radius);
            this.ctx.fill();
        },
        color(chord, confidence = 1) {
            return vis.circleOfFifthsColor(chord.angle % 1, 1, confidence);
            //return vis.circleOfFifthsColor(chord.angle % 1, chord.index > 11 ? 1 : 0.8, chord.index > 11 ? 1 : 0.8);
        },
        colorBrightness(chord, brightness) {
            return vis.circleOfFifthsColorBrightness(chord.angle % 1, 0.5, brightness);
        },
        isMajor(chord) {
            return chord.index <= 11;
        },
        isPlayingChord(chord) {
            return this.seekerTime >= chord.start && this.seekerTime < chord.end;
        },
        clickedChord(chord) {
            player.seekS(chord.start);
        },
    },
};
</script>

<style scoped>
.seeker {
    pointer-events: none;
}
.chord {
    transition: 0.3s;
}
.chordoverlay {
    transition: 0.3s;
}
.chordoverlay:hover {
    fill: white !important;
    cursor: pointer;
}
.chordsSVG {
    transition: 0.3s;
}
.chordsBackground {
    transition: 0.3s;
}
.chord:hover {
    fill: white !important;
    cursor: pointer;
}
</style>
