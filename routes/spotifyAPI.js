const express = require("express");
const queryString = require('querystring');
const needle = require('needle');

const spotifyAPI = express.Router();

const scopes = [
    "user-read-playback-state", 
    "streaming", 
    "user-read-email",
    "user-read-private",
    "user-modify-playback-state", 
    "user-top-read", 
    "user-read-playback-position", 
    "user-read-currently-playing", 
    "playlist-read-private",
    "user-follow-read", 
    "app-remote-control", 
    "user-read-recently-played", 
    "user-library-read"
]

spotifyAPI.get("/login", async (req, res) => {
    res.redirect('https://accounts.spotify.com/authorize?' +
        queryString.stringify({
            response_type: 'code',
            client_id: process.env.SPOTIFY_CLIENT_ID,
            scope: scopes.join(" "),
            redirect_uri: process.env.SPOTIFY_REDIRECT,
            show_dialog: false
        })
    );
});

spotifyAPI.post("/token", async (req, res) => {
    const b64_val = Buffer.from(unescape(encodeURIComponent(process.env.SPOTIFY_CLIENT_ID + ":" + process.env.SPOTIFY_CLIENT_SECRET))).toString('base64');
    let data;
    if(req.body.code){
        data ={
            grant_type: 'authorization_code',
            code: req.body.code,
            redirect_uri: process.env.SPOTIFY_REDIRECT,
        }
    }else{
        data ={
            grant_type: 'refresh_token',
            refresh_token: req.body.refresh_token
        }
    }
     
    const headers = {
        'Authorization': "Basic " + b64_val,
        'Content-Type': 'application/x-www-form-urlencoded'
    }
    await needle('post', 'https://accounts.spotify.com/api/token', data, { headers: headers })
    .then(function(spotifyRes) {
        console.log(spotifyRes.body);
        res.send(spotifyRes.body);
    }).catch(function(err) {
        console.log(err)
    })
});


module.exports = spotifyAPI;