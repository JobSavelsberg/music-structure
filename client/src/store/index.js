import Vue from 'vue'
import Vuex from 'vuex'
import Track from '../app/track'

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    user: Object,
    trackList: [],
    selectedIndex: -1,
    seeker: 0,
    playerState: null,
    loadingTrack: true,
    playerReady: false,
    playing: false,
  },
  mutations: {
    setSeeker(state, time_ms){
      state.seeker = time_ms;
    },
    setUser(state, user){
      console.log("setting user to", user);
      state.user = user;
    },
    setPlayerState(state, playerState){
      state.playerState = playerState;
    },
    addToAllTracks(state, track) {
      if(track instanceof Track){
        Vue.set(state.allTracks, track.getId(), track.toJSON());
      }else{
        Vue.set(state.allTracks, track.id, new Track(track).toJSON());
      }
    },
    loadAllTracks(state, tracks){
      state.allTracks = tracks;
    },
    loadingTrack(state, loadingTrack){
      state.loadingTrack = loadingTrack;
    },
    playerReady(state, playerReady){
      state.playerReady = playerReady
    },
    addToTrackList(state, track){
      if(track instanceof Track){
        state.trackList.push(track);
      }else{
        state.trackList.push(track);
        Vue.set(state.allTracks, track.id, new Track(track));
      }
    },
    clearTrackList(state){
      state.trackList = [];
    },
    setSelectedIndex(state, index){
      state.selectedIndex = index;
    },
    setPlaying(state, playing){
      state.playing = playing;
    },
    incrementSeeker(state, increment){
      state.seeker += increment;
    },
  },
  actions: {

  },
  getters: {
    seeker(state){
      return state.seeker;
    },
    selectedIndex(state){
      return state.selectedIndex;
    },
    selectedTrack(state){
      return state.trackList[state.selectedIndex];
    },
    user(state) {
      return state.user;
    },
    track(state, id) {
      return state.trackList[id];
    },
    trackList(state){
      return state.trackList;
    },
    playerState(state){
      return state.playerState;
    },
    playing(state){
      return state.playing;
    }
  },
  modules: {
  }
})
