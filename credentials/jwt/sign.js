const openDSU = require('opendsu');
const w3cDID = openDSU.loadAPI('w3cdid');
const crypto = openDSU.loadAPI('crypto');
const keySSISpace = openDSU.loadApi('keyssi');
const keySSIResolver = require('key-ssi-resolver');
const cryptoRegistry = keySSIResolver.CryptoAlgorithmsRegistry;

const {LABELS, JWT_ERRORS} = require('../constants');
const {base64UrlEncode, getIssuerFormat, asymmetricalEncryption} = require('../utils');

/**
 * This method is signing the encoded header and payload of a JWT and returns the full signed JWT (header.payload.signature)
 * The JWT will be signed according to the type of the issuer (KeySSI, DID)
 * @param jwtHeader
 * @param jwtPayload
 * @param callback {Function}
 */
function signJWT(jwtHeader, jwtPayload, callback) {
    // TODO: If kid attribute is present inside jwtHeader and is a readable DID, the JWT will be asymmetrically signed using kid's value.
    //  This type of signing can be validated only by a verifier that is using Signature Validation Strategy. Also, create verify method for signature validation

    const issuer = jwtPayload.iss;
    const issuerType = getIssuerFormat(issuer);
    let dataToSign = [base64UrlEncode(JSON.stringify(jwtHeader)), base64UrlEncode(JSON.stringify(jwtPayload))].join('.');
    const kidType = getIssuerFormat(jwtHeader.kid);
    if (kidType === LABELS.ISSUER_DID) {
        dataToSign = base64UrlEncode(JSON.stringify({iss: issuer, kid: jwtHeader.kid}));
        return asymmetricalEncryption(issuer, jwtHeader.kid, dataToSign, callback);
    }

    switch (issuerType) {
        case LABELS.ISSUER_SSI: {
            return signUsingSSI(issuer, dataToSign, callback);
        }

        case LABELS.ISSUER_DID: {
            return signUsingDID(issuer, dataToSign, callback);
        }

        default: {
            return callback(JWT_ERRORS.INVALID_ISSUER_FORMAT);
        }
    }
}

/**
 * This method is signing a JWT using KeySSI
 * @param issuer
 * @param dataToSign
 * @param callback {Function}
 */
function signUsingSSI(issuer, dataToSign, callback) {
    try {
        const issuerKeySSI = keySSISpace.parse(issuer);
        const sign = cryptoRegistry.getSignFunction(issuerKeySSI);
        if (typeof sign !== 'function') {
            return callback(new Error('Signing not available for ' + issuerKeySSI.getIdentifier(true)));
        }

        const hashFn = cryptoRegistry.getCryptoFunction(issuerKeySSI, 'hash');
        const hashResult = hashFn(dataToSign);
        const signResult = sign(hashResult, issuerKeySSI.getPrivateKey());
        const encodedSignResult = base64UrlEncode(signResult);
        callback(undefined, encodedSignResult);
    } catch (e) {
        return callback(e);
    }
}

/**
 * This method is signing a JWT using DID
 * @param issuer
 * @param dataToSign
 * @param callback {Function}
 */
function signUsingDID(issuer, dataToSign, callback) {
    w3cDID.resolveDID(issuer, (err, didDocument) => {
        if (err) {
            return callback(`Failed to resolve did ${issuer}`);
        }

        const hashResult = crypto.sha256(dataToSign);
        didDocument.sign(hashResult, (signError, signResult) => {
            if (signError || !signResult) return callback(signError);
            const encodedSignResult = base64UrlEncode(signResult);
            callback(undefined, encodedSignResult);
        });
    });
}

module.exports = {
    signJWT
};