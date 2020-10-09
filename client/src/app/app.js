import * as SpotifyWebApi from "spotify-web-api-js";
import * as auth from "./authentication";
import Track from "./Track";
import store from "./../store"; // path to your Vuex store
import router from "../router";
import * as workers from "./workers/workers";
import * as log from "../dev/log";
export const spotify = new SpotifyWebApi();

const allTracks = new Map();

// Initialize spotify access, load tracks from local storage, get user data
export async function initialize() {
    log.info("Initializing App");

    workers.init().then(() => log.info("Initialized Workers!"));

    //loadAllTracks();

    spotify.setAccessToken(auth.token);
    spotify
        .getMe()
        .then((data) => {
            store.commit("setUser", data);
        })
        .catch((err) => {
            router.push("/");
        });
    /*spotify
        .getMyTopTracks({ limit: 50, offset: 0 })
        .then((tracks) => {
            loadTracksFromSpotify(tracks.items, false);
            selectTrackAtIndex(0);
        })
        .catch((err) => log.error(err));*/
    spotify.getPlaylistTracks("34wIIW2zm3vw5ZRqO8dHi0", {}, (error, result) => {
        if (error) log.error(error);
        const tracks = result.items.map((item) => item.track);
        loadTracksFromSpotify(tracks, false);
        selectTrackAtIndex(0);
    });
}

export async function selectTrackAtIndex(index) {
    store.commit("loadingTrack", true);
    return getAnalysis(store.getters.trackList[index]).then(() => {
        store.commit("setSelectedIndex", index);
        store.commit("loadingTrack", false);
    });
}
export async function getAnalysis(track) {
    if (track.hasAnalysis()) {
        track.reload();
        return track.getAnalysis();
    }
    return spotify
        .getAudioAnalysisForTrack(track.getID())
        .then((analysis) => {
            track.setAnalysis(analysis);
        })
        .catch((err) => {
            log.error(err);
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

export async function search(query) {
    spotify
        .search(query, ["track"])
        .then((results) => {
            loadTracksFromSpotify(results.tracks.items, true);
        })
        .catch((err) => {
            log.error(err);
        });
}
