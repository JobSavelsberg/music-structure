import * as SpotifyWebApi from 'spotify-web-api-js';
 
export const spotify = new SpotifyWebApi();

export function spotifyInit(token){ 
  spotify.setAccessToken(token);
}

