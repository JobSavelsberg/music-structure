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
    <Player v-if="readyForPlayer" :track="trackList[selected]" :analysis="trackAnalysisList[selected]" :state="playerState"/>
    <!--<Visualization v-if="allLoaded" :track="trackList[selected]" :analysis="trackAnalysisList[selected]"/>-->
      
  </div>
</template>

<script>
import TrackSelector from "../components/TrackSelector"
import Visualization from "../components/Visualization"
import Player from "../components/Player"
import * as app from '../app/app';
import * as player from "../app/player"

import {spotify, spotifyInit} from '../app/spotify';

export default {
  name: 'Home',
  data () { 
    return {
      albumSize: 120,
      searchQuery: "",
      user: {},
      trackList: [],
      trackAnalysisList: [],
      selected: 0,
      readyForPlayer: false,
      playerState: {},
    }
  },
  computed: {
    allLoaded() {
      return this.trackList.length !== 0 && this.trackAnalysisList.length !== 0 && 
              this.trackList.length === this.trackAnalysisList.length;
    }
  },
  components: {
    TrackSelector,
    //Visualization,
    Player
  },
  beforeMount(){
    player.initialize(app.token, this.playerStateChanged);
    spotifyInit(app.token);
    spotify.getMe().then((data)=>{
      this.user = data;
    })
    spotify.getMyTopTracks({limit:50, offset:0}).then((tracks)=>{
      this.trackList = tracks.items;
      this.trackList.forEach((track, index) => {
        spotify.getAudioAnalysisForTrack(track.id).then((analysis)=>{
          this.trackAnalysisList[index] = analysis;
          if(index === this.selected){
            this.readyForPlayer = true;
          }
        }).catch((err) => {
            console.log(err);
        })
      })
    }).catch((err)=>console.log(err));

  },
  methods:{
    onTrackScroll (e) {
      console.log(e.target.scrollTop)
      console.log(e.target.scrollLeft)

    },
    playerStateChanged(state){
      this.playerState = state;
    }
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