const { JWT_ERRORS } = require('../constants');
const { parseJWTSegments } = require('../utils');

/**
 * This method verifies if the roots of trust are the actual issuers of the verifiable credentials
 * @param jwtPayload
 * @param rootsOfTrust
 * @param callback
 */
function verifyRootsOfTrust(jwtPayload, rootsOfTrust, callback) {
	const jwtVcList = jwtPayload.vp.verifiableCredential;
	let verifyResult = { verifyResult: true, verifiableCredentials: [] };

	const chain = (index) => {
		if (index === jwtVcList.length) {
			return callback(undefined, verifyResult);
		}

		const jwtVc = jwtVcList[index];
		parseJWTSegments(jwtVc, (err, result) => {
			if (err) {
				verifyResult.verifyResult = false;
				verifyResult.verifiableCredentials.push({
					jwtVc: jwtVc,
					errorMessage: err
				});
				return chain(++index);
			}

			let jwtPayload = result.jwtPayload;
			const rootOfTrust = rootsOfTrust.find(r => r === jwtPayload.iss);
			if (!rootOfTrust) {
				verifyResult.verifyResult = false;
				verifyResult.verifiableCredentials.push({
					jwtVc: jwtVc,
					errorMessage: JWT_ERRORS.ROOT_OF_TRUST_NOT_VALID
				});
				return chain(++index);
			}

			verifyResult.verifiableCredentials.push(result.jwtPayload);
			chain(++index);
		});
	};

	chain(0);
}

module.exports = verifyRootsOfTrust;