const RedirectInteraction = require('./interactions/Redirect');
const IFrameInteraction = require('./interactions/IFrame');
const PopupInteraction = require('./interactions/Popup');
const AuthorizationCodeGrant = require('./grants/AuthorizationCode');
const RefreshTokenGrant = require('./grants/RefreshToken');

const Browser = require('../util/Browser');
const Crypto = require('../util/Crypto');
const Storage = require('../util/Storage');
const Issuer = require('./Issuer');
const Client = require('./Client');


const ID_TOKEN = 'session.idToken';
const ACCESS_TOKEN = 'session.accessToken';
const REFRESH_TOKEN = 'session.refreshToken';
const EXPIRATION_TIMESTAMP = 'session.expirationTimestamp';
const AUTHORIZATION_CODE_VERIFIER = 'session.codeVerifier';
const AUTHORIZATION_STATE = 'session.state';
const INTERACTION = 'session.interaction';
const INTERACTION_IFRAME = 'iframe';
const INTERACTION_POPUP = 'popup';
const INTERACTION_REDIRECT = 'redirect';
const INTERACTION_REFRESH = 'refresh';
const BROWSER_LOCATION = 'browser.current.location';


const TOKEN_CHECK_INTERVAL = 1000 * 30;
const TOKEN_EXPIRATION_THRESHOLD = 1000 * 60;


class OIDC {
    issuer;
    client;
    storage;


    constructor(options) {
        this.storage = options.storage || Storage.getStorage();
        this.issuer = new Issuer(options.issuer);
        this.client = new Client(options.client);
        this.options = options;
        this.setPeriodicRefreshTimeout();
    }


    setPeriodicRefreshTimeout() {
        setTimeout(() => this.periodicRefresh(), this.options.tokenCheckInterval || TOKEN_CHECK_INTERVAL);
    }


    async periodicRefresh() {
        if (!this.isTokenSetExpiring(TOKEN_EXPIRATION_THRESHOLD)) {
            return this.setPeriodicRefreshTimeout();
        }

        //todo: dispatch error: event, register handler
        try {
            await this.refreshTokenSet();
        } catch (err) {
            debugger
            console.log('periodicRefresh.tokenSetError', err);
        } finally {
            this.setPeriodicRefreshTimeout();
        }
    }


    async reconcile() {
        if (this.isCallbackPhaseActive()) {
            console.log('callbackPhaseActive');
            return this.resumeAuthentication()
                .catch((err) => this.resetAuthentication(err));
        }

        if (this.isAccessTokenInStorage()) {
            if (this.isTokenSetExpiring(TOKEN_EXPIRATION_THRESHOLD)) {
                try {
                    await this.refreshTokenSet();
                } catch (err) {
                    console.log('refreshTokenSetError', err);
                    return this.beginAuthentication();
                }
            }
        } else {
            return this.beginAuthentication();
        }
    }


    getToken(decoded) {
        const token = this.storage.get(ACCESS_TOKEN);
        return decoded ? this.decodeToken(token) : token;
    }


    getIdToken(decoded) {
        const token = this.storage.get(ID_TOKEN);
        return decoded ? this.decodeToken(token) : token;
    }


    isAccessTokenInStorage() {
        return !!this.storage.get(ACCESS_TOKEN);
    }


    isTokenSetExpiring(threshold = 0) {
        const expirationTimestamp = parseInt(this.storage.get(EXPIRATION_TIMESTAMP)) || 0;
        return Date.now() + threshold >= expirationTimestamp;
    }


    isCallbackPhaseActive() {
        return !!location.toString().includes(this.client.redirectPath);
    }


    refreshTokenSet() {
        console.log('refreshSession');
        return this.refreshWithRefreshToken()
            .catch((err) => this.refreshWithIFrame())
            .catch((err) => {
                //todo: improve error detection
                const loginRequired = err.message.includes('login_required');
                return this.refreshWithPopup(loginRequired ? 'login' : 'none')
            })
            .finally(() => this.storage.remove(INTERACTION));
    }


    refreshWithRefreshToken() {
        console.log('refresh.refreshToken');
        if (!this.storage.get(REFRESH_TOKEN)) {
            return Promise.reject(Error('Refresh token not found'));
        }
        const options = {
            refreshToken: this.storage.get(REFRESH_TOKEN)
        }

        this.storage.set(INTERACTION, INTERACTION_REFRESH);
        return RefreshTokenGrant.refreshToken(this.issuer, this.client, options)
            .then((response) => this.handleOAuthHttpResponse(response))
            .then((tokenSet) => this.updateStorageWithTokenSet(tokenSet));
    }


    refreshWithIFrame() {
        console.log('refresh.iframe');
        const authorizationContext = AuthorizationCodeGrant.getAuthorizationUrl(this.issuer, this.client, {prompt: 'none'});
        const context = {
            state: authorizationContext.state,
            codeVerifier: authorizationContext.codeVerifier,
        }

        this.storage.set(INTERACTION, INTERACTION_IFRAME);
        return this.getInteraction(INTERACTION_IFRAME)
            .run(authorizationContext.url)
            .then((response) => this.handleOAuthHttpResponse(response))
            .then((authorizationResponse) => this.handleAuthorizationResponse(context, authorizationResponse))
            .finally(() => this.storage.remove(INTERACTION));
    }


    refreshWithPopup(prompt) {
        console.log('refresh.popup');
        const authorizationContext = AuthorizationCodeGrant.getAuthorizationUrl(this.issuer, this.client, {prompt});
        const context = {
            state: authorizationContext.state,
            codeVerifier: authorizationContext.codeVerifier,
        }

        this.storage.set(INTERACTION, INTERACTION_POPUP);
        return this.getInteraction(INTERACTION_POPUP)
            .run(authorizationContext.url)
            .then((response) => this.handleOAuthHttpResponse(response))
            .then((authorizationResponse) => this.handleAuthorizationResponse(context, authorizationResponse))
            .finally(() => this.storage.remove(INTERACTION));
    }


    isRedirectInProgress() {
        return this.storage.get(INTERACTION) === INTERACTION_REDIRECT
    }


    beginAuthentication() {
        console.log('beginAuthentication');
        this.cleanUpAuthorizationStorage();
        this.cleanUpTokenStorage();

        this.storage.set(BROWSER_LOCATION, Browser.getCurrentLocation());

        const authorizationContext = AuthorizationCodeGrant.getAuthorizationUrl(this.issuer, this.client);
        this.storage.set(AUTHORIZATION_CODE_VERIFIER, authorizationContext.codeVerifier);
        this.storage.set(AUTHORIZATION_STATE, authorizationContext.state);

        this.storage.set(INTERACTION, INTERACTION_REDIRECT);
        return this.getInteraction(INTERACTION_REDIRECT).run(authorizationContext.url);
    }


    async resumeAuthentication() {
        const interactionType = this.storage.get(INTERACTION);
        const interaction = this.getInteraction(interactionType);
        console.log('resumeAuthentication', interactionType);
        if (!interaction) {
            throw new Error('Interaction not found');
        }
        const authorizationResponse = await interaction.resume();

        if (!interaction.allowResumeAuthentication) {
            return console.log('interaction will be handled at source');
        }

        const context = {
            state: this.storage.get(AUTHORIZATION_STATE),
            codeVerifier: this.storage.get(AUTHORIZATION_CODE_VERIFIER),
            redirect: this.storage.get(BROWSER_LOCATION)
        }

        // clear storage to prevent replay attacks
        this.cleanUpAuthorizationStorage();

        return this.handleOAuthHttpResponse(authorizationResponse)
            .then(() => this.handleAuthorizationResponse(context, authorizationResponse));
    }


    handleAuthorizationResponse(context, authorizationResponse) {
        if (context.state !== authorizationResponse.state) {
            console.log('invalidStateError', context.state, authorizationResponse.state);
            return Promise.reject(new Error('Invalid state'));
        }

        const options = {
            code: authorizationResponse.code,
            codeVerifier: context.codeVerifier
        };
        return AuthorizationCodeGrant.getToken(this.issuer, this.client, options)
            .then((response) => this.handleOAuthHttpResponse(response))
            .then((tokenSet) => this.updateStorageWithTokenSet(tokenSet))
            .then(() => this.cleanUpAuthorizationStorage())
            .then(() => {
                if (context.redirect) {
                    location.assign(context.redirect);
                }
            });
    }


    getInteraction(type) {
        let interaction;
        switch (type) {
            case INTERACTION_IFRAME:
                interaction = new IFrameInteraction();
                break;
            case INTERACTION_POPUP:
                interaction = new PopupInteraction();
                break;
            case INTERACTION_REDIRECT:
                interaction = new RedirectInteraction();
                break;
        }
        return interaction;
    }


    handleOAuthHttpResponse(response) {
        if (response['error']) {
            console.log('oauthError', response['error'], response['error_description'])
            return Promise.reject(Error(`OAuth Error[${response['error']}]: ${response['error_description']}`));
        }

        return Promise.resolve(response);
    }


    updateStorageWithTokenSet(tokenSet) {
        this.storage.set(EXPIRATION_TIMESTAMP, Date.now() + (tokenSet['expires_in'] * 1000));
        this.storage.set(ACCESS_TOKEN, tokenSet['access_token']);
        this.storage.set(REFRESH_TOKEN, tokenSet['refresh_token']);
        if (tokenSet['id_token']) {
            this.storage.set(ID_TOKEN, tokenSet['id_token']);
        }
    }


    decodeToken(token) {
        if (!token) {
            return null;
        }
        const [header, payload, signature] = token.split('.');
        return {
            header: JSON.parse(Crypto.decodeBase64EncodedData(header)),
            payload: JSON.parse(Crypto.decodeBase64EncodedData(payload)),
            signature
        }
    }


    cleanUpAuthorizationStorage() {
        this.storage.remove(INTERACTION);
        this.storage.remove(AUTHORIZATION_STATE);
        this.storage.remove(AUTHORIZATION_CODE_VERIFIER);
        this.storage.remove(BROWSER_LOCATION);
    }


    cleanUpTokenStorage() {
        this.storage.remove(ACCESS_TOKEN);
        this.storage.remove(ID_TOKEN);
        this.storage.remove(REFRESH_TOKEN);
        this.storage.remove(EXPIRATION_TIMESTAMP);
    }


    resetAuthentication(err) {
        console.log('resetAuthentication', err);
        this.cleanUpAuthorizationStorage();
        this.cleanUpTokenStorage();
        history.replaceState(null, null, ' ');
        if (err) {
            throw err;
        }
    }
}


OIDC.utils = {Browser};
module.exports = OIDC;