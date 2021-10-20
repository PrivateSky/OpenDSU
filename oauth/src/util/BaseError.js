class BaseError extends Error {
    constructor(message, error) {
        super();
        this.error = error;
    }
}


module.exports = BaseError;