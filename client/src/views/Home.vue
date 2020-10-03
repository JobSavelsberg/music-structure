<template>
  <div class="home">
    <v-app-bar dark>
      <v-toolbar-title>Music Structure Visualizer</v-toolbar-title>

      <v-spacer></v-spacer>

      <form v-on:submit.prevent="search">
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
    <TrackSelector :tracks="trackList" :album-size="120" />
    <Player :padding="padding" />
    <Visualization :padding="padding" />
  </div>
</template>

<script>
import TrackSelector from "../components/TrackSelector";
import Visualization from "../components/Visualization";
import Player from "../components/Player";
import * as app from "../app/app";
import * as auth from "../app/authentication";
import * as player from "../app/player";

export default {
  name: "Home",
  data() {
    return {
      searchQuery: "",
      volume: 0.75,
      prevVolume: 0.75,
      padding: 50,
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
  },
  watch: {
    selectedIndex(newIndex, oldIndex) {
      //console.log(`We have ${newVal} selected!`)
    },
    selectedTrack(newTrack, oldTrack) {
      console.log(`We have ${newTrack.getName()} selected!`);
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
    console.log("Initializing app")
    app.initialize();
  },
  methods: {
    search() {
      app.search(this.searchQuery);
    },
    selectedTrackChanged() {
      console.log("selected track", this.trackList[this.selected].name);
      this.getAnalsysisFor(this.selected);
    },
    getAnalsysisFor(index) {
      const selectedTrackId = this.trackList[index].id;
      if (!this.trackAnalysis.has(selectedTrackId)) {
        this.analysisReady = false;
        console.log("Getting analysis for: ", this.trackList[index].name);
      }
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
  },
};
</script>

<style>
.volumeSlider {
  height: 100%;
  width: 10%;
}
.trackScroll {
  /*overflow-x: auto;*/
}
.trackScroll::-webkit-scrollbar {
  display: none;
}
</style>