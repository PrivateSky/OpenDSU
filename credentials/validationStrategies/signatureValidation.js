const openDSU = require('opendsu');
const w3cDID = openDSU.loadAPI('w3cdid');
const crypto = openDSU.loadAPI('crypto');
const keySSISpace = openDSU.loadApi('keyssi');
const keySSIResolver = require('key-ssi-resolver');
const cryptoRegistry = keySSIResolver.CryptoAlgorithmsRegistry;

const { LABELS, JWT_ERRORS } = require('../constants');
const { getIssuerFormat } = require('../utils');

/**
 * This method is verifying the encoded JWT from the current instance according to the issuerType
 * @param issuer
 * @param signature
 * @param signedData
 * @param callback {Function}
 */
function verifyJWT(issuer, signature, signedData, callback) {
	const issuerType = getIssuerFormat(issuer);
	switch (issuerType) {
		case LABELS.ISSUER_SSI: {
			return verifyUsingSSI(issuer, signature, signedData, callback);
		}

		case LABELS.ISSUER_DID: {
			return verifyUsingDID(issuer, signature, signedData, callback);
		}

		default: {
			callback(JWT_ERRORS.INVALID_ISSUER_FORMAT);
		}
	}
}

/**
 * This method is verifying an SSI signed JWT
 * @param issuer
 * @param signature
 * @param signedData
 * @param callback {Function}
 */
function verifyUsingSSI(issuer, signature, signedData, callback) {
	try {
		const issuerKeySSI = keySSISpace.parse(issuer);
		const publicKey = issuerKeySSI.getPublicKey();
		const hashFn = cryptoRegistry.getCryptoFunction(issuerKeySSI, 'hash');
		const hashResult = hashFn(signedData);

		const verify = cryptoRegistry.getVerifyFunction(issuerKeySSI);
		const verifyResult = verify(hashResult, publicKey, signature);
		callback(undefined, verifyResult);
	} catch (e) {
		return callback(e);
	}
}

/**
 * This method is verifying a DID signed JWT
 * @param issuer
 * @param signature
 * @param signedData
 * @param callback {Function}
 */
function verifyUsingDID(issuer, signature, signedData, callback) {
	w3cDID.resolveDID(issuer, (err, didDocument) => {
		if (err) {
			return callback(`Failed to resolve did ${issuer}`);
		}

		const hashResult = crypto.sha256(signedData);
		didDocument.verify(hashResult, signature, (verifyError, verifyResult) => {
			if (verifyError) {
				return callback(verifyError);
			}

			callback(null, verifyResult);
		});
	});
}

module.exports = verifyJWT;