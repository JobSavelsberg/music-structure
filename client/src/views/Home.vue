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
    <TrackSelector :tracks="trackList" :album-size="120"/>
    <Player/>
    <Visualization/>
      
  </div>
</template>

<script>
import TrackSelector from "../components/TrackSelector"
import Visualization from "../components/Visualization"
import Player from "../components/Player"
import * as app from '../app/app';
import * as auth from '../app/authentication';


export default {
  name: 'Home',
  data () { 
    return {
      searchQuery: "",
    }
  },
  computed: {
    user(){
      return this.$store.getters.user;
    },
    trackList(){
      return this.$store.getters.trackList
    },
    selectedIndex(){
      return this.$store.getters.selectedIndex;
    },
    selectedTrack(){
      return this.$store.getters.selectedTrack;
    },
    seeker(){
      return this.$store.getters.seeker;
    }
  },
  watch: {
    selectedIndex (newIndex, oldIndex) {
      //console.log(`We have ${newVal} selected!`)
    },
    selectedTrack (newTrack, oldTrack) {
      console.log(`We have ${newTrack.getName()} selected!`)
    },
  },
  components: {
    TrackSelector,
    Visualization,
    Player
  },
  beforeCreate(){
    app.initialize();
  },
  methods:{
    search(){
      app.search(this.searchQuery);
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