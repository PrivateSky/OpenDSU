const JWT = require("../jwt");
const JWT_ERRORS = require("../constants").JWT_ERRORS;
const {jwtVpBuilder, jwtVpParser, jwtVpVerifier} = require("./model");

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

    addVerifiableCredential = (encodedJWTVc, callback) => {
        if (!encodedJWTVc) {
            return callback(JWT_ERRORS.INVALID_JWT_FORMAT);
        }

        this.jwtPayload.vp.verifiableCredential.push(encodedJWTVc);
        callback(undefined, true);
    };

    async addVerifiableCredentialAsync(encodedJWTVc) {
        return this.asyncMyFunction(this.addVerifiableCredential, [...arguments]);
    }

    loadEncodedJWTVp(encodedJWTVp) {
        jwtVpParser(encodedJWTVp, (err, result) => {
            if (err) {
                return this.notifyInstanceReady(err);
            }

            this.jwtHeader = result.jwtHeader;
            this.jwtPayload = result.jwtPayload;
            this.jwtSignature = result.jwtSignature;
            this.encodedJWTHeaderAndBody = result.encodedJWTHeaderAndBody;
            this.notifyInstanceReady();
        });
    }

    verifyJWT(atDate, rootsOfTrust, callback) {
        if (typeof rootsOfTrust === "function") {
            callback = rootsOfTrust;
            rootsOfTrust = [];
        }

        const decodedJWT = {
            jwtHeader: this.jwtHeader,
            jwtPayload: this.jwtPayload,
            jwtSignature: this.jwtSignature,
            encodedJWTHeaderAndBody: this.encodedJWTHeaderAndBody
        };
        jwtVpVerifier(decodedJWT, atDate, rootsOfTrust, (err, result) => {
            if (err) {
                return callback(undefined, {verifyResult: false, errorMessage: err});
            }

            callback(undefined, {verifyResult: result, ...JSON.parse(JSON.stringify(this.jwtPayload))});
        });
    }

    verifyJWTAsync(adDate, rootsOfTrust) {
        return this.asyncMyFunction(this.verifyJWT, [...arguments]);
    }
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
 */
function loadJWTVp(encodedJWTVp) {
    const jwtInstance = new JwtVP();
    jwtInstance.loadEncodedJWTVp(encodedJWTVp);

    return jwtInstance;
}

module.exports = {
    createJWTVp, loadJWTVp
};