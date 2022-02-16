<template>
    <div class="track">
        <v-app-bar dark>
            <v-toolbar-title>Music Structure Visualizer</v-toolbar-title>
            <v-spacer></v-spacer>

            <form v-if="!testing && !synthesizing" v-on:submit.prevent="search">
                <v-text-field
                    v-model="searchQuery"
                    label="Search for songs"
                    hide-details
                    append-icon="mdi-magnify"
                    single-line
                    rounded
                    dense
                    filled
                    @focus="$store.commit('setInputFocus', true)"
                    @blur="$store.commit('setInputFocus', false)"
                ></v-text-field>
            </form>
            <!--<form v-if="testing && !synthesizing">
                <v-select
                    v-model="selectedTestSet"
                    :items="allTestSets"
                    return-object
                    hide-details
                    single-line
                    rounded
                    dense
                    filled
                ></v-select>
            </form>
            <form v-if="synthesizing" v-on:submit.prevent="synthesize">
                <v-text-field v-model="synthesizerString" hide-details single-line rounded dense filled></v-text-field>
            </form>
            <v-btn v-if="!synthesizing" icon @click="testing = !testing">
                <v-icon>mdi-ab-testing</v-icon>
            </v-btn>
            <v-btn icon @click="synthesizing = !synthesizing">
                <v-icon>mdi-pencil</v-icon>
            </v-btn>
            -->
            <v-spacer></v-spacer>
            <!--
            <v-btn icon @click="$store.commit('toggleZoomed')">
                <v-icon>mdi-magnify-plus-outline</v-icon>
            </v-btn>
            <v-btn icon @click="showPrototype = !showPrototype">
                <v-icon>{{ showPrototype ? "mdi-monitor-eye" : "mdi-test-tube" }}</v-icon>
            </v-btn>
            <v-btn icon @click="clickActivePlayer()">
                <v-icon>{{ activePlayer ? "mdi-speaker" : "mdi-speaker-off" }}</v-icon>
            </v-btn>
            -->
            <div class="volumeSlider">
                <v-container>
                    <v-slider
                        @click:prepend="clickVolume"
                        :prepend-icon="getVolumeIcon()"
                        v-model="volume"
                        :min="0"
                        :max="1"
                        :step="0.02"
                    ></v-slider>
                </v-container>
            </div>
            <v-btn icon @click="share()">
                <v-icon>mdi-share-variant</v-icon>
            </v-btn>
            <!--<v-btn icon>
                <v-icon>mdi-heart</v-icon>
            </v-btn>-->
        </v-app-bar>
        <TrackSelector v-if="!synthesizing" :tracks="trackList" :album-size="120" />
        <div ref="mainContent" class="mainContent" :style="mainContentStyle">
            <!--<v-btn v-for="(n, i) in 10" :key="'colordiv' + i" width="20" height="20" :color="color(i)"></v-btn>-->
            <Player v-if="!synthesizing" :width="mainContentWidth" />
            <Visualization :width="mainContentWidth" :showPrototype="showPrototype" />
            <v-btn class="readMore" @click="readMore()" style="color: #aaa">
                <v-icon style="margin-right: .5em">mdi-book-information-variant</v-icon>
                Read about this project
            </v-btn>
        </div>
    </div>
</template>

<script>
import TrackSelector from "../components/TrackSelector";
import Visualization from "../components/Visualization";
import Player from "../components/Player";
import * as app from "../app/app";
import * as auth from "../app/authentication";
import * as player from "../app/player";
import * as testing from "../app/testing";
import * as vis from "../app/vis";

import * as log from "../dev/log";
export default {
    name: "Track",
    data() {
        return {
            searchQuery: "",
            synthesizerString: "",
            volume: 0.75,
            prevVolume: 0.75,
            windowWidth: window.innerWidth,
            windowHeight: window.innerHeight,
            testing: false,
            synthesizing: false,
            selectedTestSet: null,
            showPrototype: false,
            contentRatio: 0.97, //0.5 // 1.5
        };
    },
    computed: {
        user() {
            return this.$store.getters.user;
        },
        trackList() {
            return this.$store.getters.trackList;
        },
        selectedIndex() {
            return this.$store.getters.selectedIndex;
        },
        selectedTrack() {
            return this.$store.getters.selectedTrack;
        },
        seeker() {
            return this.$store.getters.seeker;
        },
        playing() {
            return this.$store.getters.playing;
        },
        mainContentStyle() {
            return {
                "padding-left": `${this.padding}px`,
                "padding-right": `${this.padding}px`,
            };
        },
        padding() {
            return Math.round((this.windowWidth - this.mainContentWidth) / 2 / 4) * 4;
        },
        mainContentWidth() {
            const size = Math.min(this.windowWidth, this.windowHeight) * this.contentRatio;
            return size;
        },
        allTestSets() {
            return testing.getAllTestSets();
        },
        activePlayer() {
            return this.$store.getters.playerActive;
        },
    },
    watch: {
        selectedIndex(newIndex, oldIndex) {
            //console.log(`We have ${newVal} selected!`)
        },
        selectedTrack(newTrack, oldTrack) {
            log.info(`We have ${newTrack.getName()} selected!`);
        },
        selectedTestSet(newTestSet, oldTestSet) {
            this.loadTestSet(newTestSet);
        },
        volume(newVol, oldVol) {
            player.setVolume(Math.pow(this.volume, 2));
        },
        activePlayer() {
            log.debug("Activeplayer Changed", this.activePlayer);
        },
    },
    components: {
        TrackSelector,
        Visualization,
        Player,
    },
    beforeCreate() {
        app.initialize();
        window.addEventListener("resize", () => {
            this.windowWidth = window.innerWidth;
        });
    },
    mounted() {
        this._keyListener = function(e) {
            if (e.key === "z" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault(); // present "Save Page" from getting triggered.

                this.$store.commit("toggleZoomed");
            }
            if (e.keyCode == 32 && !this.$store.getters.isInputFocused) {
                e.preventDefault();
                this.playing ? player.pause() : player.resume();
            }
        };
        document.addEventListener("keydown", this._keyListener.bind(this));
    },
    beforeDestroy() {
        document.removeEventListener("keydown", this._keyListener);
    },
    methods: {
        color(i) {
            return vis.goldenRatioCategoricalColor(i, 0, 1);
        },
        search() {
            app.search(this.searchQuery);
        },
        loadTestSet() {
            app.loadTestSet(this.selectedTestSet);
        },
        getVolumeIcon() {
            if (this.volume > 0.6) return "mdi-volume-high";
            if (this.volume > 0.2) return "mdi-volume-medium";
            if (this.volume > 0) return "mdi-volume-low";
            return "mdi-volume-off";
        },
        clickVolume() {
            if (this.volume > 0) {
                this.prevVolume = this.volume;
                this.volume = 0;
            } else {
                this.volume = this.prevVolume;
            }
        },
        synthesize() {
            log.debug("Synthesizing", this.synthesizerString);

            app.synthesize(this.synthesizerString);
        },
        clickActivePlayer() {
            if (this.activePlayer) {
                player.releasePlayback();
            } else {
                player.transferPlayback();
            }
        },
        readMore() {
            Object.assign(document.createElement("a"), {
                target: "_blank",
                href: "http://jobsavelsberg.com/musicstructure/",
            }).click();
        },
    },
};
</script>

<style>
.track {
    overflow: hidden; /* Hide scrollbars */
}
.mainContent {
    display: inline-block;
    overflow: hidden;
}
.volumeSlider {
    height: 100%;
    width: 150px;
}
.trackScroll {
    /*overflow-x: auto;*/
}
.trackScroll::-webkit-scrollbar {
    display: none;
}
.readMore {
    position: fixed;
    z-index: 1000;
    right: 0px;
    bottom: 0%;
}
</style>
