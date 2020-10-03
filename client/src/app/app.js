import * as SpotifyWebApi from "spotify-web-api-js";
import * as auth from "./authentication";
import Track from "./Track";
import store from "./../store"; // path to your Vuex store
import router from "../router";

export const spotify = new SpotifyWebApi();

const allTracks = new Map();

// Initialize spotify access, load tracks from local storage, get user data
export async function initialize() {
    Track.initWorkers();
    //loadAllTracks();
    console.log("Got tracks from local storage: ", allTracks);

    spotify.setAccessToken(auth.token);
    spotify
        .getMe()
        .then((data) => {
            store.commit("setUser", data);
        })
        .catch((err) => {
            router.push("/");
        });
    spotify
        .getMyTopTracks({ limit: 50, offset: 0 })
        .then((tracks) => {
            loadTracksFromSpotify(tracks.items, false);
            selectTrackAtIndex(0);
        })
        .catch((err) => console.log(err));
}

export async function selectTrackAtIndex(index) {
    store.commit("loadingTrack", true);
    store.commit("tsneReady", false);
    store.commit("clusterReady", false);
    store.commit("ssmReady", false);
    return getAnalysis(store.getters.trackList[index]).then(() => {
        console.log("Getting analysis and everything done, now setting selected index");
        store.commit("loadingTrack", false);
        store.commit("setSelectedIndex", index);
    });
}

// Save tracks to local storage
export function saveAllTracks() {
    localStorage.allTracks = JSON.stringify(Array.from(allTracks.entries()));
}

// Save tracks to local storage
export function loadAllTracks() {
    if (localStorage.allTracks) {
        const allTracksArray = JSON.parse(localStorage.allTracks);
        allTracksArray.forEach((trackArray) => {
            const track = Track.createWithAnalysis(trackArray[1].trackData, trackArray[1].analysisData);
            allTracks.set(trackArray[0], track);
        });
    }
}

/**
 * Load tracks from spotify api result
 */

function loadTracksFromSpotify(tracks, keepCurrentTrack) {
    const selectedTrack = store.getters.selectedTrack;
    store.commit("clearTrackList");
    tracks.forEach((trackData) => {
        if (allTracks.has(trackData.id)) {
            store.commit("addToTrackList", allTracks.get(trackData.id));
        } else {
            const track = new Track(trackData);
            allTracks.set(trackData.id, track);
            store.commit("addToTrackList", track);
        }
    });
    if (keepCurrentTrack) {
        store.commit("addToTrackListFront", selectedTrack);
        store.commit("setSelectedIndex", 0);
    } else {
        selectTrackAtIndex(0);
    }
}

export async function getAnalysis(track) {
    if (track.hasAnalysis()) return track.getAnalysis();
    return spotify
        .getAudioAnalysisForTrack(track.getId())
        .then((analysis) => {
            console.log("Got analysis from api");
            track.setAnalysis(analysis);
            console.log("Track has done everything with analysis");
        })
        .catch((err) => {
            console.log(err);
        });
}

export async function search(query) {
    spotify
        .search(query, ["track"])
        .then((results) => {
            loadTracksFromSpotify(results.tracks.items, true);
        })
        .catch((err) => {
            console.log(err);
        });
}
