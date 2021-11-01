const Crypto = require('../../util/Crypto');


class AuthorizationCode {
    static getAuthorizationUrl(issuer, client, options = {}) {
        const codeVerifier = Crypto.generateCodeVerifier();
        const codeChallenge = Crypto.generateCodeChallenge(codeVerifier);
        const state = Crypto.generateState();

        const authorizationUrl = new URL(issuer.authorizationEndpoint);
        const query = authorizationUrl.searchParams;

        query.set('client_id', client.clientId);
        query.set('scope', client.scope);
        query.set('redirect_uri', client.redirectUri);
        query.set('response_type', 'code');
        query.set('response_mode', 'fragment');
        query.set('code_challenge_method', 'S256');
        query.set('code_challenge', codeChallenge);
        query.set('state', state);

        if (options.prompt) {
            query.set('prompt', options.prompt);
        }

        authorizationUrl.search = query.toString();
        return {state, codeVerifier, url: authorizationUrl.toString()};
    }


    static getToken(issuer, client, options) {
        const params = new URLSearchParams();
        params.append('grant_type', 'authorization_code');
        params.append('client_id', client.clientId);
        params.append('redirect_uri', client.redirectUri);
        params.append('code', options.code);
        params.append('code_verifier', options.codeVerifier);

        const payload = {
            method: 'POST',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            body: params
        }

        return fetch(issuer.tokenEndpoint, payload).then((response) => response.json())
    }
}


module.exports = AuthorizationCode;