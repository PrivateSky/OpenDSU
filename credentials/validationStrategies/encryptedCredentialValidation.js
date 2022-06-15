const { JWT_ERRORS } = require('../constants');
const { loadEncryptedCredential, parseJWTSegments } = require('../utils');

/**
 * This method verifies the encrypted credentials using the private key of the audience. <br />
 * Only the intended audience can decrypt the encrypted credential to validate it.
 * @param jwtPayload
 * @param callback
 */
function verifyEncryptedCredential(jwtPayload, callback) {
	const verifyResult = { verifyResult: true, verifiableCredential: [] };
	const encryptedCredentials = jwtPayload.vp.verifiableCredential;
	const audience = jwtPayload.aud;
	if (!audience) {
		verifyResult.verifyResult = false;
		verifyResult.verifiableCredential.push({
			errorMessage: JWT_ERRORS.AUDIENCE_OF_PRESENTATION_NOT_DEFINED
		});

		return callback(undefined, verifyResult);
	}

	const chain = (index) => {
		if (index === encryptedCredentials.length) {
			return callback(undefined, verifyResult);
		}

		const encryptedCredential = encryptedCredentials[index];
		loadEncryptedCredential(audience, encryptedCredential, (err, decryptedJWTVc) => {
			if (err) {
				verifyResult.verifyResult = false;
				verifyResult.verifiableCredential.push({
					jwtVc: encryptedCredential,
					errorMessage: err
				});

				return chain(++index);
			}

			parseJWTSegments(decryptedJWTVc, (err, result) => {
				if (err) {
					verifyResult.verifyResult = false;
					verifyResult.verifiableCredential.push({
						jwtVc: encryptedCredential,
						errorMessage: err
					});

					return chain(++index);
				}

				verifyResult.verifiableCredential.push(result.jwtPayload);
				chain(++index);
			});
		});
	};

	chain(0);
}

module.exports = verifyEncryptedCredential;