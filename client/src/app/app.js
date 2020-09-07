import axios from 'axios';

console.log(process.env);

const port = process.env.SERVER_PORT || 5000;
const url = ( process.env.VUE_APP_HOST_URL || "http://localhost" + ":" + port ) + "/api";
const api = axios.create({
    baseURL: url,
    withCredentials: false,
});

export let token;
let tokenTimestamp;
let expiresIn;
let refreshToken;

export async function requestFirstToken(code){
    await api.post('spotify/token', {
        code: code
    }).then((res) => {
        token = res.data.access_token;
        window.sessionStorage.setItem('token', token);
        expiresIn = res.data.expires_in;
        window.sessionStorage.setItem('tokenTimestamp', new Date().getTime().toString());
        refreshToken = res.data.expires_in;
        window.sessionStorage.setItem('refreshToken', refreshToken);
    }).catch((err) => { 
        console.log(err);
    })
}

export async function requestRefreshToken(){
    await api.post('spotify/token', {
        refresh_token: refreshToken
    }).then((res) => {
        token = res.data.access_token;
        window.sessionStorage.setItem('token', token);
        expiresIn = res.data.expires_in;
        window.sessionStorage.setItem('tokenTimestamp', new Date().getTime().toString());
        refreshToken = res.data.expires_in;
        window.sessionStorage.setItem('refreshToken', refreshToken);
    }).catch((err) => { 
        console.log(err);
    })
}

export function isAuthorized(){
    if(token === undefined){
        const t = window.sessionStorage.getItem('token');
        const e = window.sessionStorage.getItem('tokenTimestamp');
        const r = window.sessionStorage.getItem('refreshToken');
        if(t){
            token = t;
            // TODO: check if token is expired, if so renew
            return true;
        }else{
            return false
        }
    }
    return true;
}