const express = require("express");
const queryString = require('querystring');

const spotifyAPI = express.Router();

const scopes = "user-read-playback-state streaming user-modify-playback-state user-top-read user-read-playback-position user-read-currently-playing playlist-read-private user-follow-read app-remote-control user-read-recently-played user-library-read" 

spotifyAPI.get("/login", async (req, res) => {
    res.redirect('https://accounts.spotify.com/authorize?' +
        queryString.stringify({
            response_type: 'code',
            client_id: process.env.SPOTIFY_CLIENT_ID,
            scope: scopes,
            redirect_uri: process.env.SPOTIFY_REDIRECT,
            show_dialog: false
        })
    );
});

module.exports = spotifyAPI;