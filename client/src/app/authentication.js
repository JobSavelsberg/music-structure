import * as log from "../dev/log";
import router from "../router";

import axios from "axios";

const port = process.env.SERVER_PORT || 5000;
const url = (process.env.VUE_APP_HOST_URL || "http://localhost" + ":" + port) + "/api";
const api = axios.create({
    baseURL: url,
    withCredentials: false,
});

export let token;
let tokenTimestamp = new Date();
let expiresIn = 3600;
let refreshToken;

setInterval(() => {
    log.debug("Token expires in", Math.floor((expiresIn - (new Date() - tokenTimestamp) / 1000) / 60), "minutes");
}, 5 * 60000);

export async function requestFirstToken(code) {
    await api
        .post("spotify/token", {
            code: code,
        })
        .then((res) => {
            token = res.data.access_token;
            window.sessionStorage.setItem("token", token);
            expiresIn = res.data.expires_in;
            tokenTimestamp = new Date();
            window.sessionStorage.setItem("tokenTimestamp", new Date());
            refreshToken = res.data.refresh_token;
            window.sessionStorage.setItem("refreshToken", refreshToken);
            setTimeout(requestRefreshToken, expiresIn * 1000);
        })
        .catch((err) => {
            log.error(err);
        });
}

export async function requestRefreshToken() {
    if (!refreshToken) {
        refreshToken = window.sessionStorage.getItem("refreshToken");
        if (!refreshToken) {
            router.push("/login");
        }
    }
    await api
        .post("spotify/token", {
            refresh_token: refreshToken,
        })
        .then((res) => {
            token = res.data.access_token;
            window.sessionStorage.setItem("token", token);
            expiresIn = res.data.expires_in;
            tokenTimestamp = new Date();
            window.sessionStorage.setItem("tokenTimestamp", new Date());
            if (res.data.refresh_token) {
                refreshToken = res.data.refresh_token;
            }
            window.sessionStorage.setItem("refreshToken", refreshToken);
            setTimeout(requestRefreshToken, expiresIn * 1000);
        })
        .catch((err) => {
            log.error(err);
        });
}

export function isAuthorized() {
    if (token === undefined) {
        const t = window.sessionStorage.getItem("token");
        const e = window.sessionStorage.getItem("tokenTimestamp");
        const r = window.sessionStorage.getItem("refreshToken");
        if (t) {
            token = t;
            refreshToken = r;
            if (!refreshToken || refreshToken.length <= 0) {
                return false;
            }
            tokenTimestamp = new Date(e);
            if (tokenExpired()) {
                return false;
            }
            setTimeout(requestRefreshToken, timeLeftMilliseconds());
            return true;
        } else {
            return false;
        }
    }
    return true;
}

export function tokenExpired() {
    return timeLeftMilliseconds() < 0;
}

export function timeLeftMilliseconds() {
    return expiresIn * 1000 - (new Date() - tokenTimestamp) < 0;
}
