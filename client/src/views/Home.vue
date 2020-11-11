<template>
    <div class="home">
        <v-app-bar dark>
            <v-toolbar-title>Music Structure Visualizer</v-toolbar-title>

            <v-spacer></v-spacer>

            <form v-if="!testing && !synthesizing" v-on:submit.prevent="search">
                <v-text-field
                    v-model="searchQuery"
                    hide-details
                    append-icon="mdi-magnify"
                    single-line
                    rounded
                    dense
                    filled
                ></v-text-field>
            </form>
            <form v-if="testing && !synthesizing">
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
                <v-icon>mdi-test-tube</v-icon>
            </v-btn>
            <v-btn icon @click="synthesizing = !synthesizing">
                <v-icon>mdi-pencil</v-icon>
            </v-btn>
            <div class="volumeSlider">
                <v-container>
                    <v-slider
                        @click:prepend="clickVolume"
                        :prepend-icon="getVolumeIcon(volume)"
                        v-model="volume"
                        :min="0"
                        :max="1"
                        :step="0.02"
                    ></v-slider>
                </v-container>
            </div>

            <v-btn icon>
                <v-icon>mdi-heart</v-icon>
            </v-btn>
            <v-btn icon>
                <v-icon>mdi-dots-vertical</v-icon>
            </v-btn>
        </v-app-bar>
        <TrackSelector v-if="!synthesizing" :tracks="trackList" :album-size="120" />
        <div ref="mainContent" class="mainContent" :style="mainContentStyle">
            <Player v-if="!synthesizing" :width="mainContentWidth" />
            <Visualization :width="mainContentWidth" />
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

import * as log from "../dev/log";
export default {
    name: "Home",
    data() {
        return {
            searchQuery: "",
            synthesizerString: "",
            volume: 0.75,
            prevVolume: 0.75,
            padding: 20 * 4, // vuetify padding only goes per 4 px
            windowWidth: window.innerWidth,
            testing: false,
            synthesizing: false,
            selectedTestSet: null,
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
        mainContentStyle() {
            return {
                "padding-left": `${this.padding}px`,
                "padding-right": `${this.padding}px`,
            };
        },
        mainContentWidth() {
            return this.windowWidth - this.padding * 2;
        },
        allTestSets() {
            return testing.getAllTestSets();
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
    methods: {
        search() {
            app.search(this.searchQuery);
        },
        loadTestSet() {
            app.loadTestSet(this.selectedTestSet);
        },
        getVolumeIcon(volume) {
            if (volume > 0.6) return "mdi-volume-high";
            if (volume > 0.2) return "mdi-volume-medium";
            if (volume > 0) return "mdi-volume-low";
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
    },
};
</script>

<style>
.mainContent {
    display: inline-block;
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
</style>
