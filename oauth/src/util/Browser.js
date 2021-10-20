function parseUrlHash(hash) {
    return parseUrlParams(hash.substring(1));
}


function parseUrlQuery(query) {
    return parseUrlParams(query.substring(1));
}


function parseUrlParams(value) {
    const params = {};
    const searchParams = new URLSearchParams(value);
    for (let [key, value] of searchParams.entries()) {
        params[key] = value;
    }
    return params;
}


function parseUrlParamsFallback(value) {
    const urlParams = {};
    const a = /\+/g;
    const r = /([^&;=]+)=?([^&;]*)/g;
    const decode = function (s) {
        return decodeURIComponent(s.replace(a, " "))
    };

    let search;
    while (search = r.exec(value)) {
        urlParams[decode(search[1])] = decode(search[2]);
    }

    return urlParams;
}


function getCurrentLocation() {
    return location.href.substring(location.origin.length)
}


function isItMe() {
    if (window.opener) {
        return false;
    } else if (window.top !== window.self) {
        return false
    } else {
        return true;
    }
}


module.exports = {
    parseUrlHash,
    parseUrlQuery,
    getCurrentLocation,
    isItMe
};