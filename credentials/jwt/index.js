const {JWT_ERRORS, IMMUTABLE_PUBLIC_CLAIMS} = require("../constants");
const {base64UrlEncode} = require("../utils");
const {signJWT} = require("./sign");
const instanceReadyMixin = require("../InstanceReadyMixin");

class JWT {

    constructor() {
        this.jwtHeader = null;
        this.jwtPayload = null;
        instanceReadyMixin(this);
    }

    getEncodedJWT(callback) {
        signJWT(this.jwtHeader, this.jwtPayload, (err, jwtSignature) => {
            if (err) {
                return callback(err);
            }

            const encodedJWT = [base64UrlEncode(JSON.stringify(this.jwtHeader)), base64UrlEncode(JSON.stringify(this.jwtPayload)), jwtSignature].join(".");
            callback(undefined, encodedJWT);
        });
    };

    async getEncodedJWTAsync() {
        return this.asyncMyFunction(this.getEncodedJWT, [...arguments]);
    }

    /**
     * This method embeds one or more public claims about the JWT. These claims are not reflected within VC body
     * @param claimName {string} - The name of the public claim. Reserved public claims: "vc", "vp", "iss", "sub", "iat"
     * @param claimValue - The value of the public claim
     * @param callback
     */
    embedClaim(claimName, claimValue, callback) {
        if (typeof claimName !== "string") {
            return callback(JWT_ERRORS.INVALID_PUBLIC_CLAIM);
        }

        if (IMMUTABLE_PUBLIC_CLAIMS.findIndex(cl => cl === claimName) !== -1) {
            return callback(JWT_ERRORS.IMMUTABLE_PUBLIC_CLAIM);
        }

        this.jwtPayload[claimName] = claimValue;
        callback(undefined, true);
    };

    async embedClaimAsync(claimName, claimValue) {
        return this.asyncMyFunction(this.embedClaim, [...arguments]);
    }

    /**
     * This method is used to extend the expiration date of a JWT
     * @param timeInSeconds {Number}
     * @param callback
     */
    extendExpirationDate(timeInSeconds, callback) {
        if (typeof timeInSeconds !== "number" || timeInSeconds <= 0) {
            return callback(JWT_ERRORS.INVALID_EXPIRATION_DATE);
        }

        this.jwtPayload.exp = this.jwtPayload.exp + timeInSeconds * 1000;
        callback(undefined, true);
    };

    async extendExpirationDateAsync(timeInSeconds) {
        return this.asyncMyFunction(this.extendExpirationDate, [...arguments]);
    }

    asyncMyFunction = (func, params) => {
        func = func.bind(this);
        return new Promise((resolve, reject) => {
            func(...params, (err, data) => {
                if (err) {
                    return reject(err);
                }
                resolve(data);
            });
        });
    };
}

module.exports = JWT;