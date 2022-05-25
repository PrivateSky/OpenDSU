const JWT = require("../jwt");
const JWT_ERRORS = require("../constants").JWT_ERRORS;
const {jwtVpBuilder, jwtVpParser} = require("./model");

class JwtVP extends JWT {
    constructor(issuer, encodedJWTVc, options, isInitialisation = false) {
        super();

        if (isInitialisation === true) {
            jwtVpBuilder(issuer, encodedJWTVc, options, (err, result) => {
                if (err) {
                    return this.notifyInstanceReady(err);
                }

                this.jwtHeader = result.jwtHeader;
                this.jwtPayload = result.jwtPayload;
                this.notifyInstanceReady();
            });
        }
    }

    /**
     * This method embeds one or more public claims about the JWT. These claims are not reflected within VC body
     * @param claimName {string} - The name of the public claim. Reserved public claims: "vc", "vp", "iss", "sub", "iat"
     * @param claimValue - The value of the public claim
     * @param callback
     */
    embedClaim = (claimName, claimValue, callback) => {
        super.embedClaim(claimName, claimValue, callback);
    }

    async embedClaimAsync(claimName, claimValue) {
        return await $$.promisify(this.embedClaim).call(this, claimName, claimValue);
    }

    /**
     * This method is used to extend the expiration date of a JWT
     * @param timeInSeconds {Number}
     * @param callback
     */
    extendExpirationDate = (timeInSeconds, callback) => {
        super.extendExpirationDate(timeInSeconds, callback);
    }

    async extendExpirationDateAsync(timeInSeconds) {
        return await $$.promisify(this.extendExpirationDate).call(this, timeInSeconds);
    }

    addVerifiableCredential = (encodedJWTVc, callback) => {
        if (!encodedJWTVc) {
            return callback(JWT_ERRORS.INVALID_JWT_FORMAT);
        }

        this.jwtPayload.vp.verifiableCredential.push(encodedJWTVc);
        callback(undefined, true);
    };

    async addVerifiableCredentialAsync(encodedJWTVc) {
        return await $$.promisify(this.addVerifiableCredential).call(this, encodedJWTVc);
    }

    setEncodedJWTVp(encodedJWTVp) {
        jwtVpParser(encodedJWTVp, (err, result) => {
            if (err) {
                return this.notifyInstanceReady(err);
            }

            this.jwtHeader = result.jwtHeader;
            this.jwtPayload = result.jwtPayload;
            this.notifyInstanceReady();
        });
    };
}

/**
 * This method prepares the initial JWT options object based on the inputs. <br />
 * Points to the specific create JWT method according to the subject type
 * @param issuer
 * @param encodedJWTVc
 * @param options {Object}
 */
function createJWTVp(issuer, encodedJWTVc, options = {}) {
    return new JwtVP(issuer, encodedJWTVc, options, true);
}

/**
 * This method is parsing an encoded verifiable credential according to the requested type and returns the instance of the verifiable credential. <br />
 * @param encodedJWTVp {string}
 * @param atDate
 * @param revocationStatus
 */
function verifyJWTVp(encodedJWTVp, atDate, revocationStatus) {
    console.log(atDate, revocationStatus);
    const jwtInstance = new JwtVP();
    jwtInstance.setEncodedJWTVp(encodedJWTVp);

    return jwtInstance;
}

module.exports = {
    createJWTVp, verifyJWTVp
};