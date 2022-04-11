const keySSIResolver = require("key-ssi-resolver");
const cryptoRegistry = keySSIResolver.CryptoAlgorithmsRegistry;

const openDSU = require("opendsu");
const keySSISpace = openDSU.loadApi("keyssi");
const w3cDID = openDSU.loadAPI("w3cdid");
const crypto = openDSU.loadAPI("crypto");

const {JWT_ERRORS, JWT_LABELS, IMMUTABLE_PUBLIC_CLAIMS} = require("./jwtConstants");
const {encodeBase58, dateTimeFormatter, isValidURL, isJwtExpired, isJwtNotActive} = require("./jwtUtils");

class JwtVC {
    constructor(issuer, issuerType, jwtSegments, encodedJwtHeaderAndBody, jwtSignature) {
        this.encodedJWT = null;
        this.issuer = issuer;
        this.issuerType = issuerType;
        this.jwtSegments = jwtSegments;
        this.jwtHeader = jwtSegments[0];
        this.jwtPayload = jwtSegments[1];
        this.encodedJwtHeaderAndBody = encodedJwtHeaderAndBody;
        this.jwtSignature = jwtSignature;
    }

    getJWT(encoded = true) {
        if (encoded) {
            return this.encodedJWT;
        }

        return {
            header: this.getJwtHeader(),
            payload: this.getJwtHeader()
        };
    }

    getJwtHeader() {
        return this.jwtHeader;
    }

    getJwtPayload() {
        return this.jwtPayload;
    }

    /**
     * This method is signing the encoded header and payload of a JWT and returns the full signed JWT (header.payload.signature)
     * The JWT will be signed according to the type of the issuer (KeySSI, DID)
     * @param callback {Function}
     */
    signJWT(callback) {
        switch (this.issuerType) {
            case JWT_LABELS.ISSUER_SSI: {
                return this.signUsingSSI(callback);
            }

            case JWT_LABELS.ISSUER_DID: {
                return this.signUsingDID(callback);
            }

            default: {
                throw new Error(JWT_ERRORS.INVALID_ISSUER_FORMAT);
            }
        }
    }

    /**
     * This method is signing a JWT using KeySSI
     * @param callback {Function}
     */
    signUsingSSI(callback) {
        try {
            const issuerKeySSI = keySSISpace.parse(this.issuer);
            const sign = cryptoRegistry.getSignFunction(issuerKeySSI);
            if (typeof sign !== "function") {
                return callback(new Error("Signing not available for " + issuerKeySSI.getIdentifier(true)));
            }

            const hashFn = cryptoRegistry.getCryptoFunction(issuerKeySSI, "hash");
            const hashResult = hashFn(this.encodedJwtHeaderAndBody);
            const signResult = sign(hashResult, issuerKeySSI.getPrivateKey());
            const encodedSignResult = encodeBase58(signResult);
            this.encodedJWT = `${this.encodedJwtHeaderAndBody}.${encodedSignResult}`;

            callback(undefined, true);
        } catch (e) {
            return callback(e);
        }
    }

    /**
     * This method is signing a JWT using DID
     * @param callback {Function}
     */
    signUsingDID(callback) {
        w3cDID.resolveDID(this.issuer, (err, didDocument) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to resolve did ${this.issuer}`, err));
            }

            const hashResult = crypto.sha256(this.encodedJwtHeaderAndBody);
            didDocument.sign(hashResult, (signError, signResult) => {
                if (signError || !signResult) return callback(signError);
                const encodedSignResult = encodeBase58(signResult);

                this.encodedJWT = `${this.encodedJwtHeaderAndBody}.${encodedSignResult}`;
                callback(null, true);
            });
        });
    }

    /**
     * This method is verifying the encoded JWT from the current instance according to the issuerType
     * @param callback {Function}
     */
    verifyJWT(callback) {
        const header = this.getJwtHeader();
        const payload = this.getJwtPayload();
        if (!header.typ || !header.alg) return callback(JWT_ERRORS.INVALID_JWT_HEADER);
        if (!payload.iss) return callback(JWT_ERRORS.INVALID_JWT_ISSUER);
        if (isJwtExpired(payload)) return callback(JWT_ERRORS.JWT_TOKEN_EXPIRED);
        if (isJwtNotActive(payload)) return callback(JWT_ERRORS.JWT_TOKEN_NOT_ACTIVE);
        if (!payload.vc) return callback(JWT_ERRORS.INVALID_JWT_PAYLOAD);

        switch (this.issuerType) {
            case JWT_LABELS.ISSUER_SSI: {
                return this.verifyUsingSSI(callback);
            }

            case JWT_LABELS.ISSUER_DID: {
                return this.verifyUsingDID(callback);
            }

            default: {
                throw new Error(JWT_ERRORS.INVALID_ISSUER_FORMAT);
            }
        }
    }

    /**
     * This method is verifying an SSI signed JWT
     * @param callback {Function}
     */
    verifyUsingSSI(callback) {
        try {
            const issuerKeySSI = keySSISpace.parse(this.issuer);
            const publicKey = issuerKeySSI.getPublicKey();
            const hashFn = cryptoRegistry.getCryptoFunction(issuerKeySSI, "hash");
            const hashResult = hashFn(this.encodedJwtHeaderAndBody);

            const verify = cryptoRegistry.getVerifyFunction(issuerKeySSI);
            const verifyResult = verify(hashResult, publicKey, this.jwtSignature);
            callback(undefined, verifyResult);
        } catch (e) {
            return callback(e);
        }
    }

    /**
     * This method is verifying a DID signed JWT
     * @param callback {Function}
     */
    verifyUsingDID(callback) {
        w3cDID.resolveDID(this.issuer, (err, didDocument) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to resolve did ${this.issuer}`, err));
            }

            const hashResult = crypto.sha256(this.encodedJwtHeaderAndBody);
            didDocument.verify(hashResult, this.jwtSignature, (verifyError, verifyResult) => {
                if (verifyError || !verifyError) {
                    return callback(JWT_ERRORS.INVALID_JWT_SIGNATURE);
                }

                callback(null, verifyResult);
            });
        });
    }

    /**
     * This method embeds one or more public claims about the JWT. These claims are not reflected within VC body
     * @param claimOptions {Object}
     * @param callback {Function}
     */
    embedClaim(claimOptions, callback) {
        if (typeof claimOptions !== "object") {
            return callback(JWT_ERRORS.INVALID_PUBLIC_CLAIM);
        }

        const claimsToEmbed = Object.keys(claimOptions);
        for (let index = 0; index < claimsToEmbed.length; ++index) {
            const hasImmutableClaim = IMMUTABLE_PUBLIC_CLAIMS.findIndex(cl => cl === claimsToEmbed[index]) !== -1;
            if (hasImmutableClaim) {
                return callback(JWT_ERRORS.IMMUTABLE_PUBLIC_CLAIM);
            }
        }

        Object.assign(this.jwtPayload, claimOptions);
        if (claimsToEmbed.nbf) {
            this.jwtPayload.vc.issuanceDate = dateTimeFormatter(claimsToEmbed.nbf);
        }
        if (claimsToEmbed.exp) {
            this.jwtPayload.vc.expirationDate = dateTimeFormatter(claimsToEmbed.exp);
        }
        const encodedParts = [encodeBase58(JSON.stringify(this.jwtHeader)), encodeBase58(JSON.stringify(this.jwtPayload))];
        this.encodedJwtHeaderAndBody = encodedParts.join(".");
        this.jwtSegments = [this.jwtHeader, this.jwtPayload];
        this.signJWT(callback);
    }

    /**
     * This method is used to extend the expiration date of a JWT
     * @param timeInSeconds {Number}
     * @param callback {Function}
     */
    extendExpirationDate(timeInSeconds, callback) {
        if (timeInSeconds <= 0) {
            return callback(JWT_ERRORS.INVALID_EXPIRATION_DATE);
        }

        const newExpirationDate = this.jwtPayload.exp + timeInSeconds * 1000;
        this.embedClaim({exp: newExpirationDate}, callback);
    }

    /**
     * This method embeds a new claim about the subject(s) of the JWT.
     * Subject is mandatory if credentialSubject is an array of subjects. (To be extended tp crete JWT based on multiple subjects)
     * @param claimOptions {{context:string, type:string, claims:{}, subject:string|null}}
     * @param callback {Function}
     */
    embedCredentialSubjectClaim(claimOptions, callback) {
        if (typeof claimOptions !== "object" || !claimOptions.context || !claimOptions.type || !claimOptions.claims
            || typeof claimOptions.context !== "string" || typeof claimOptions.type !== "string"
            || typeof claimOptions.claims !== "object" || !isValidURL(claimOptions.context)) {
            return callback(JWT_ERRORS.INVALID_SUBJECT_CLAIM);
        }

        if (claimOptions.claims.id) {
            return callback(JWT_ERRORS.IMMUTABLE_PUBLIC_CLAIM);
        }

        const vc = this.jwtPayload.vc;
        if (Array.isArray(vc.credentialSubject)) {
            if (!claimOptions.subject) {
                return callback(JWT_ERRORS.INVALID_SUBJECT_CLAIM);
            }
            if (typeof claimOptions.subject !== "string") {
                return callback(JWT_ERRORS.INVALID_SUBJECT_CLAIM);
            }

            const targetSubjectIndex = vc.credentialSubject.findIndex(subject => subject.id === subject);
            if (targetSubjectIndex === -1) {
                return callback(JWT_ERRORS.INVALID_SUBJECT_CLAIM);
            }

            Object.assign(vc.credentialSubject[targetSubjectIndex], claimOptions.claims);
        } else {
            Object.assign(vc.credentialSubject, claimOptions.claims);
        }

        vc["@context"].push(claimOptions.context);
        vc.type.push(claimOptions.context);
        this.jwtPayload.vc = JSON.parse(JSON.stringify(vc));
        const encodedParts = [encodeBase58(JSON.stringify(this.jwtHeader)), encodeBase58(JSON.stringify(this.jwtPayload))];
        this.encodedJwtHeaderAndBody = encodedParts.join(".");
        this.jwtSegments = [this.jwtHeader, this.jwtPayload];
        this.signJWT(callback);
    }
}

module.exports = JwtVC;