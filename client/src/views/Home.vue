<template>
  <div class="home">
    <v-app-bar dark>  
      <v-toolbar-title>Music Structure Visualizer</v-toolbar-title>

      <v-spacer></v-spacer>
                    
                  
      <v-text-field
        v-model="searchQuery"
        hide-details
        append-icon="mdi-magnify"
        single-line
        rounded
        dense
        filled
      ></v-text-field>
      
      <v-btn icon>
        <v-icon>mdi-heart</v-icon>
      </v-btn>
      <v-btn icon>
        <v-icon>mdi-dots-vertical</v-icon>
      </v-btn>
    </v-app-bar>

    <TrackSelector v-model="selected" :tracks="trackList" :album-size="albumSize"/>
    <h1 v-if="dataLoaded">
      {{ trackList[selected].name }}
    </h1>
    <Visualization v-if="dataLoaded" :track="trackList[selected]"/>
      
  </div>
</template>

<script>
import TrackSelector from "../components/TrackSelector"
import Visualization from "../components/Visualization"

import * as player from '../app/player';
import * as app from '../app/app';
import {spotify, spotifyInit} from '../app/spotify';

export default {
  name: 'Home',
  data () { 
    return {
      albumSize: 120,
      searchQuery: "",
      user: {},
      dataLoaded: false,
      trackList: [],
      selected: 0,
    }
  },
  components: {
    TrackSelector,
    Visualization
  },
  beforeMount(){
    spotifyInit(app.token);
    spotify.getMe().then((data)=>{
      this.user = data;
    })
    spotify.getMyTopTracks({limit:50, offset:0}).then((data)=>{
      console.log(data);
      this.trackList = data.items;
      this.dataLoaded = true;
    })
    //player.initialize(app.token);
  },
  methods:{
    onTrackScroll (e) {
      console.log(e.target.scrollTop)
      console.log(e.target.scrollLeft)

    },
  }
}
</script>

<style>
.trackScroll{
  overflow-x: auto;
}
.trackScroll::-webkit-scrollbar {
  display: none;
}
</style>