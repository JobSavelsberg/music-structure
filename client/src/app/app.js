import * as SpotifyWebApi from "spotify-web-api-js";
import * as auth from "./authentication";
import Track from "./Track";
import store from "./../store"; // path to your Vuex store
import router from "../router";
import * as workers from "./workers/workers";
import * as log from "../dev/log";
import * as testing from "./testing";
import SynthesizedTrack from "./synthesizer";

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
    spotify.getPlaylistTracks("34wIIW2zm3vw5ZRqO8dHi0", {}, (error, result) => {
        if (error) log.error(error);
        const playlistTracks = result.items.map((item) => item.track);
        spotify.getMyTopTracks({ limit: 50, offset: 0 }).then((topTracks) => {
            loadTracksFromSpotify([...playlistTracks, ...topTracks.items], false);
            selectTrackAtIndex(0);
        });
    });
}

export async function selectTrackAtIndex(index) {
    store.commit("loadingTrack", true);
    const selectedTrack = store.getters.selectedTrack;
    const newTrack = store.getters.trackList[index];
    if (selectedTrack && selectedTrack !== newTrack) selectedTrack.deselect();
    return getAnalysis(newTrack).then(() => {
        store.commit("setSelectedIndex", index);

        store.commit("loadingTrack", false);

        //const query = { ...this.$route.query, trackID: newTrack.getID() };
        //router.replace({ query });
        router.push(`/home/${newTrack.getID()}`);
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

function loadTracksFromSpotify(tracks, keepCurrentTrack = true) {
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

export async function loadArtistTopTracks(artistID) {
    spotify.getArtistTopTracks(artistID, "from_token").then((result) => {
        loadTracksFromSpotify(result.tracks);
    });
}

export async function loadTestSet(testSetKey) {
    log.debug("loading test set with key", testSetKey);
    const testSetTracks = testing.getTracks(testSetKey);
    const spotifyTracks = [];
    for (const track of testSetTracks) {
        const spotifySearches = [];
        spotifySearches.push(
            spotify
                .search(track.query, ["track"])
                .then((results) => {
                    if (results.tracks.items.length > 0) {
                        let spotifyTrack = results.tracks.items[0];
                        spotifyTrack.groundTruth = track;
                        spotifyTracks.push(spotifyTrack);
                    }
                })
                .catch((err) => {
                    log.error(err);
                })
        );
        await Promise.all(spotifySearches);
    }
    loadTracksFromSpotify(spotifyTracks, true);
}

export async function synthesize(synthesizerString) {
    let trackData = {};
    trackData.id = "0000";
    const track = new SynthesizedTrack(trackData, synthesizerString);
    allTracks.set(trackData.id, track);
    store.commit("clearTrackList");
    store.commit("addToTrackList", track);

    selectTrackAtIndex(0);
}
