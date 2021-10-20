const openDSU = require("opendsu");
const crypto = openDSU.loadAPI("crypto");

function sha256(ascii) {
    function rightRotate(value, amount) {
        return (value >>> amount) | (value << (32 - amount));
    }

    let i, j;
    let mathPow = Math.pow;
    let maxWord = mathPow(2, 32);
    let lengthProperty = 'length';
    let result = '';
    let words = [];
    let asciiBitLength = ascii[lengthProperty] * 8;
    let hash = sha256.h = sha256.h || [];
    let k = sha256.k = sha256.k || [];
    let primeCounter = k[lengthProperty];

    let isComposite = {};
    for (let candidate = 2; primeCounter < 64; candidate++) {
        if (!isComposite[candidate]) {
            for (i = 0; i < 313; i += candidate) {
                isComposite[i] = candidate;
            }
            hash[primeCounter] = (mathPow(candidate, .5) * maxWord) | 0;
            k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
        }
    }

    ascii += '\x80';
    while (ascii[lengthProperty] % 64 - 56) ascii += '\x00';
    for (i = 0; i < ascii[lengthProperty]; i++) {
        j = ascii.charCodeAt(i);
        if (j >> 8) return;
        words[i >> 2] |= j << ((3 - i) % 4) * 8;
    }
    words[words[lengthProperty]] = ((asciiBitLength / maxWord) | 0);
    words[words[lengthProperty]] = (asciiBitLength)

    for (j = 0; j < words[lengthProperty];) {
        let w = words.slice(j, j += 16);
        let oldHash = hash;
        hash = hash.slice(0, 8);

        for (i = 0; i < 64; i++) {
            let i2 = i + j;
            let w15 = w[i - 15], w2 = w[i - 2];
            let a = hash[0], e = hash[4];
            let temp1 = hash[7]
                + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))
                + ((e & hash[5]) ^ ((~e) & hash[6]))
                + k[i]
                + (w[i] = (i < 16) ? w[i] : (
                        w[i - 16]
                        + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3))
                        + w[i - 7]
                        + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))
                    ) | 0
                );
            let temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22))
                + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));

            hash = [(temp1 + temp2) | 0].concat(hash);
            hash[4] = (hash[4] + temp1) | 0;
        }
        for (i = 0; i < 8; i++) {
            hash[i] = (hash[i] + oldHash[i]) | 0;
        }
    }
    for (i = 0; i < 8; i++) {
        for (j = 3; j + 1; j--) {
            let b = (hash[i] >> (j * 8)) & 255;
            result += ((b < 16) ? 0 : '') + b.toString(16);
        }
    }
    return result;
}


function hex2bin(s) {
    let ret = [];
    let i = 0;
    let l;
    s += '';
    for (l = s.length; i < l; i += 2) {
        let c = parseInt(s.substr(i, 1), 16)
        let k = parseInt(s.substr(i + 1, 1), 16)
        if (isNaN(c) || isNaN(k)) return false
        ret.push((c << 4) | k)
    }
    return String.fromCharCode.apply(String, ret)
}


function dec2hex(dec) {
    return ('0' + dec.toString(16)).substr(-2)
}


function dec2bin(arr) {
    return hex2bin(Array.from(arr, dec2hex).join(''));
}


function sha256bin(ascii) {
    return hex2bin(sha256(ascii));
}


function base64UrlEncode(str) {
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}


function getRandomValues(len) {
    const buff = crypto.generateRandom(len);
    return crypto.encodeBase58(buff);
    // const arr = new Uint8Array(len);
    // window.crypto.getRandomValues(arr);
    // const str = base64UrlEncode(dec2bin(arr));
    // return str.substring(0, len);
}


function generateState() {
    return getRandomValues(32);
}


function generateCodeVerifier() {
    return getRandomValues(64);
}


function generateCodeChallenge(verifier) {
    return crypto.encodeBase58(crypto.sha256(verifier));
    // return base64UrlEncode(sha256bin(verifier));
}


module.exports = {
    generateState,
    generateCodeVerifier,
    generateCodeChallenge
}