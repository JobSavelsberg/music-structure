<template>
  <div class="home">
    <v-app-bar dark>  
      <v-toolbar-title>Music Structure Visualizer</v-toolbar-title>

      <v-spacer></v-spacer>
                    
                  
      <v-text-field
        :v-model="searchQuery"
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
    <v-sheet>
      <h1>Welcome {{user.display_name}}</h1>
      <Album v-for="(track, index) in topTracks" :key="index" :album="track" :imgSize="0"/>
    </v-sheet>
  </div>
</template>

<script>
import Album from "../components/Album"

import * as player from '../app/player';
import * as app from '../app/app';
import {spotify, spotifyInit} from '../app/spotify';

export default {
  name: 'Home',
  data () { 
    return {
      searchQuery: "",
      user: {},
      topTracks: [],
    }
  },
  components: {
    Album
  },
  beforeMount(){
    spotifyInit(app.token);
    spotify.getMe().then((data)=>{
      this.user = data;
    })
    spotify.getMyTopTracks().then((data)=>{
      this.topTracks = data.items;
      console.log(this.topTracks);
    })
    //player.initialize(app.token);
  }
}
</script>
