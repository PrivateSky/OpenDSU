class Client {
    constructor(options) {
        this.options = options;
    }


    get clientId() {
        return this.options['clientId'] || this.options['client_id'];
    }


    get redirectPath() {
        return this.options['redirectPath'] || this.options['redirect_path'];
    }


    get redirectUri() {
        return location.protocol + '//' + location.host + this.redirectPath;
    }


    get scope() {
        return this.options['scope'];
    }
}


module.exports = Client;