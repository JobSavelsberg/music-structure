<template>
  <div>
    <v-slide-group
      v-model="selected"
      center-active
      class="pt-2"
      v-on:scroll.native="onScroll"
      mandatory
    >
      <v-slide-item
        v-for="(track, index) in tracks"
        :key="index"
        v-slot:default="{ active, toggle }"
        class="mx-2 my-1"
      >
        <Album
          :album="track.trackData"
          :imgSize="active ? albumSize * 1.5 : albumSize"
          :active="active"
          @clicked="toggle"
          @clickedArtist="clickedArtist(track)"
        />
      </v-slide-item>
    </v-slide-group>
  </div>
</template>

<script>
import Album from "../components/Album";
import * as app from "../app/app";
import * as log from "../dev/log";

export default {
  name: "TrackSelector",
  props: ["tracks", "albumSize"],
  components: {
    Album,
  },
  data() {
    return {
      selected: 0,
    };
  },
  computed: {
    selectedFromStore() {
      return this.$store.getters.selectedIndex;
    },
  },
  watch: {
    selected: "selectedChanged",
    selectedFromStore: "selectedFromStoreChanged",
  },
  mounted() {},
  methods: {
    selectedChanged(newIndex, oldIndex) {
      app.selectTrackAtIndex(newIndex);
    },
    selectedFromStoreChanged(newIndex, oldIndex) {
      this.selected = newIndex;
    },
    clickedArtist(track) {
      log.debug("Clicked Artist", track);
      app.loadArtistTopTracks(track.trackData.artists[0].id);
    },
  },
};
</script>
