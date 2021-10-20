class RefreshToken {
    static refreshToken(issuer, client, options) {
        const params = new URLSearchParams();
        params.append('grant_type', 'refresh_token');
        params.append('client_id', client.clientId);
        params.append('redirect_uri', client.redirectUri);
        params.append('refresh_token', options.refreshToken);

        const payload = {
            method: 'POST',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            body: params
        }

        return fetch(issuer.tokenEndpoint, payload).then((response) => response.json())
    }
}


module.exports = RefreshToken;