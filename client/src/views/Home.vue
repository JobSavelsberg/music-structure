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
      
      <v-btn icon>
        <v-icon>mdi-heart</v-icon>
      </v-btn>
      <v-btn icon>
        <v-icon>mdi-dots-vertical</v-icon>
      </v-btn>
    </v-app-bar>

    <TrackSelector v-model="selected" :tracks="trackList" :album-size="albumSize"/>
    <Player :analysis-ready="analysisReady" :track="selectedTrack" :analysis="selectedAnalysis" :state="playerState"/>
    
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
      trackAnalysis: new Map(),
      selected: 0,
      analysisReady: false,
      playerState: {},
    }
  },
  watch: {
    selected: {immediate: false, handler(newVal, oldVal){this.selectedTrackChanged()}}
  },
  computed: {
    allLoaded() {
      return this.trackList.length !== 0 && this.trackAnalysisList.length !== 0 && 
              this.trackList.length === this.trackAnalysisList.length;
    },
    selectedTrack(){
      return this.trackList[this.selected];
    },
    selectedAnalysis(){
      if(this.trackList[this.selected]){
        return this.trackAnalysis.get(this.trackList[this.selected].id);
      }else{
        return null;
      }
    },
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
      this.loadTracks(tracks.items, false)
      this.selectedTrackChanged();
    }).catch((err)=>console.log(err));

  },
  methods:{
    loadTracks(tracks, keepCurrentTrack){
      if(keepCurrentTrack){
        let currentTrack = this.trackList[this.selected];
        let currentAnalysis = this.trackAnalysis.get(currentTrack.id);
        this.trackList = tracks;
        this.trackList.unshift(currentTrack);
      }else{
        this.trackList = tracks;
      }
      this.selected = 0;
    },
    playerStateChanged(state){
      this.playerState = state;
    },
    search(){
      spotify.search(this.searchQuery, ["track"]).then((results) => {
        this.loadTracks(results.tracks.items, true)
      }).catch((err) => {
        console.log(err);
      })
    },
    selectedTrackChanged(){
      console.log("selected track", this.trackList[this.selected].name)
      this.getAnalsysisFor(this.selected);
    },
    getAnalsysisFor(index){
      const selectedTrackId = this.trackList[index].id;
      if(!this.trackAnalysis.has(selectedTrackId)){
        this.analysisReady = false;
        console.log("Getting analysis for: ",  this.trackList[index].name)
        spotify.getAudioAnalysisForTrack(selectedTrackId).then((analysis)=>{
          this.trackAnalysis = new Map(this.trackAnalysis.set(selectedTrackId, analysis));
          this.analysisReady = true;
          console.log("Got analysis for: ",  this.trackList[index].name)
        }).catch((err) => {
            console.log(err);
        })
      }
        
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