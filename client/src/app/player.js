import * as log from "../dev/log";
import { spotify } from "./app";
import store from "../store";

const autoConnect = true;

export let deviceId = null;
let player = null;

let playedTrackBefore = false;
let trackURI = null;

export async function loadTrack(track) {
    if (!store.state.playerReady) {
        log.warn("Trying to load track while player not ready");
        return;
    }
    pause();
    seekMS(0);
    pause();
    trackURI = track.getURI();
    playedTrackBefore = false;
    store.commit("setSeeker", 0);
    store.commit("setPlaying", false);
}

async function play() {
    spotify.play({ uris: [trackURI], position_ms: store.state.seeker }, (err, result) => {
        playedTrackBefore = true;
        log.debug("Playing from", store.state.seeker);
        store.commit("setPlaying", true);
    });
}

/**
 * Resume playback,
 * If track is loaded, starts playback from time 0
 */
let locallyResumed = false;
export async function resume() {
    if (playedTrackBefore) {
        player.resume().then(() => {
            locallyResumed = true;
            store.commit("setPlaying", true);
        });
    } else {
        play();
    }
}

let locallyPaused = false;
export async function pause() {
    if (playedTrackBefore) {
        player.pause().then(() => {
            locallyPaused = true;
            store.commit("setPlaying", false);
        });
    }
}
/**
 * Go to a specific time in the track
 * Playing state will not be affected
 * @param {*} time_ms in ms
 */
export async function seekMS(time_ms) {
    // Seek
    player.seek(time_ms);
    store.commit("setSeeker", time_ms);
}
export async function seekS(time_seconds) {
    return seekMS(time_seconds * 1000);
}

let playingSegment = null;
export async function playSegment(segment) {
    store.commit("setSeeker", segment.start * 1000);
    resume().then(() => {
        playingSegment = segment;
        window.setTimeout(() => {
            if (playingSegment === segment) {
                pause();
            }
        }, segment.duration * 1000);
    });
}

export function setVolume(volume) {
    if (player) {
        player.setVolume(volume);
    }
}

async function stateChangedCallback(newState) {
    if (!playedTrackBefore) return;
    const { current_track, position, duration } = newState;
    store.commit("setSeeker", position);

    const time = performance.now();
    spotify.getMyCurrentPlaybackState().then((result) => {
        if (locallyPaused || locallyResumed) {
            if (locallyPaused && !result.is_playing) {
                locallyPaused = false;
            }
            if (locallyResumed && result.is_playing) {
                locallyResumed = false;
            }
        } else {
            store.commit("setPlaying", result.is_playing);
        }
    });
}

store.watch(
    (state) => state.seeker,
    (newSeeker, oldSeeker) => {
        //log.debug("Vuex Seeker: ", newSeeker);
    }
);

store.watch(
    (state) => state.playing,
    (newPlaying, oldPlaying) => {
        //log.debug("Vuex Playing: ", newPlaying);
    }
);

function startSeekerInterval() {
    lastSeekerIntervalPoll = new Date();
    setInterval(() => incrementSeeker(33), 33);
}
let lastSeekerIntervalPoll;
function incrementSeeker() {
    if (store.state.playing) {
        const now = new Date();
        const elapsed = now - lastSeekerIntervalPoll;
        lastSeekerIntervalPoll = now;
        store.commit("incrementSeeker", elapsed);
    } else {
        lastSeekerIntervalPoll = new Date();
    }
}

export async function initialize(token) {
    waitForSpotifyWebPlaybackSDKToLoad().then(() => {
        player = new window.Spotify.Player({
            name: "Music Structure Visualizer",
            getOAuthToken: (cb) => {
                cb(token);
            },
            volume: 0.5,
        });

        // Error handling
        player.addListener("initialization_error", ({ message }) => {
            log.error(message);
        });
        player.addListener("authentication_error", ({ message }) => {
            log.error(message);
        });
        player.addListener("account_error", ({ message }) => {
            log.error(message);
        });
        player.addListener("playback_error", ({ message }) => {
            log.error(message);
        });
        // Playback status updates
        player.addListener("player_state_changed", ({ position, duration, track_window: { current_track } }) => {
            stateChangedCallback({ current_track, position, duration });
        });

        // Ready
        player.addListener("ready", ({ device_id }) => {
            deviceId = device_id;
            log.info("Ready with Device ID", device_id);
            const deviceIdArray = [deviceId];
            if (autoConnect) {
                spotify.transferMyPlayback(deviceIdArray).then((err, result) => {
                    window.setTimeout(store.commit("playerReady", true), 1);
                    startSeekerInterval();
                });
            } else {
                window.setTimeout(store.commit("playerReady", true), 1);
                startSeekerInterval();
            }

        });

        // Not Ready
        player.addListener("not_ready", ({ device_id }) => {
            log.warn("Device ID has gone offline", device_id);
        });

        // Connect to the player!
        player
            .connect()
            .then(() => {
                log.info("Connected succesfully!!!");
            })
            .catch((err) => {
                log.error("Could not connect");
            });
    });
}

async function waitForSpotifyWebPlaybackSDKToLoad() {
    return new Promise((resolve) => {
        if (window.Spotify) {
            resolve(window.Spotify);
        } else {
            window.onSpotifyWebPlaybackSDKReady = () => {
                resolve(window.Spotify);
            };
        }
    });
}
