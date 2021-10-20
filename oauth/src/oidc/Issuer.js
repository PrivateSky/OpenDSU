class Issuer {
    constructor(options) {
        this.options = options;
    }


    get issuer() {
        return this.options['issuer'];
    }


    get authorizationEndpoint() {
        return this.options['authorizationEndpoint'] || this.options['authorization_endpoint'];
    }


    get tokenEndpoint() {
        return this.options['tokenEndpoint'] || this.options['token_endpoint'];
    }
}


module.exports = Issuer;