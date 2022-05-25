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

    addVerifiableCredential(encodedJWTVc, callback) {
        if (!encodedJWTVc) {
            return callback(JWT_ERRORS.INVALID_JWT_FORMAT);
        }

        this.jwtPayload.vp.verifiableCredential.push(encodedJWTVc);
        callback(undefined, true);
    };

    async addVerifiableCredentialAsync(encodedJWTVc) {
        await $$.promisify(this.addVerifiableCredential)(encodedJWTVc);
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
function createJWTVp(issuer, encodedJWTVc, options) {
    return new JwtVP(issuer, encodedJWTVc, options, true);
}

/**
 * This method is parsing an encoded verifiable credential according to the requested type and returns the instance of the verifiable credential. <br />
 * @param encodedJWTVp {string}
 */
function verifyJWTVp(encodedJWTVp, atDate, revocationStatus) {
    const jwtInstance = new JwtVP();
    jwtInstance.setEncodedJWTVp(encodedJWTVp);

    return jwtInstance;
}

module.exports = {
    createJWTVp, verifyJWTVp
};