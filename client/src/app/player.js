import {spotify} from '../app/spotify';

export let deviceId = null;
let playerRef;

export let currentTrack = null;
export let nextTrack = null;
export let seeker = 0;

export function setTrack(trackUri){
    nextTrack = trackUri;
}

export async function play(){
    if(nextTrack){
        spotify.play({device_id: deviceId, uris: [nextTrack]}).catch((err) => console.log(err));
        currentTrack = nextTrack;
        nextTrack = null;
    }else{
        playerRef.resume();
    }
}

export function pause(){
    if(currentTrack){
        playerRef.pause();
    }
}

export async function seek(time){
    return playerRef.seek(time)
}

export async function deviceIdSet(){
    return new Promise((resolve, reject) => {
        let timeWas = new Date();
        let wait = setInterval(function() {
            if (deviceId!==null) {
                console.log("resolved after", new Date() - timeWas, "ms");
                clearInterval(wait);
                resolve();
            } else if (new Date() - timeWas > 5000) { // Timeout
                console.log("rejected after", new Date() - timeWas, "ms");
                clearInterval(wait);
                reject();
            }
        }, 20);
    });
}

async function waitForSpotifyWebPlaybackSDKToLoad () {
    console.log("waiting");
    return new Promise(resolve => {
      if (window.Spotify) {
        resolve(window.Spotify);
      } else {
        window.onSpotifyWebPlaybackSDKReady = () => {
          resolve(window.Spotify);
        }
      }
    });
}


export async function initialize(token, stateChangedCallback) {
    await waitForSpotifyWebPlaybackSDKToLoad();
    playerRef = new window.Spotify.Player({
        name: 'Music Structure Visualizer',
        getOAuthToken: cb => { cb(token); }
    });
    
    // Error handling
    playerRef.addListener('initialization_error', ({ message }) => { console.error(message); });
    playerRef.addListener('authentication_error', ({ message }) => { console.error(message); });
    playerRef.addListener('account_error', ({ message }) => { console.error(message); });
    playerRef.addListener('playback_error', ({ message }) => { console.error(message); });
    
    // Playback status updates
    playerRef.addListener('player_state_changed', ({
        position,
        duration,
        track_window: { current_track }
      }) => {
        stateChangedCallback({current_track, position, duration});
      });
    
    // Ready
    playerRef.addListener('ready', ({ device_id }) => {
        deviceId = device_id;
        console.log('Ready with Device ID', device_id);
    });
    
    // Not Ready
    playerRef.addListener('not_ready', ({ device_id }) => {
        console.log('Device ID has gone offline', device_id);
    });
    
    // Connect to the player!
    playerRef.connect().then(() => {
        console.log("Connected succesfully!!!");
    }).catch((err) => {
        console.log("Could not connect");
    })
}
