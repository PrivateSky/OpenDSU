const JWT = require('../jwt');
const JWT_ERRORS = require('../constants').JWT_ERRORS;
const { dateTimeFormatter, isValidURL } = require('../utils');
const { jwtVcBuilder, jwtVcParser, jwtVcVerifier } = require('./model');

class JwtVC extends JWT {
	constructor(issuer, subject, options, isInitialisation = false) {
		super();

		if (isInitialisation === true) {
			jwtVcBuilder(issuer, subject, options, (err, result) => {
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
	embedClaim(claimName, claimValue, callback) {
		super.embedClaim(claimName, claimValue, (err) => {
			if (err) {
				return callback(err);
			}

			if (claimName === 'nbf') {
				this.jwtPayload.vc.issuanceDate = dateTimeFormatter(claimValue);
			}
			if (claimName === 'exp') {
				this.jwtPayload.vc.expirationDate = dateTimeFormatter(claimValue);
			}

			callback(undefined, true);
		});
	}

	/**
	 * This method is used to extend the expiration date of a JWT
	 * @param timeInSeconds {Number}
	 * @param callback
	 */
	extendExpirationDate(timeInSeconds, callback) {
		super.extendExpirationDate(timeInSeconds, (err) => {
			if (err) {
				return callback(err);
			}

			const newExpirationDate = this.jwtPayload.exp + timeInSeconds * 1000;
			this.jwtPayload.vc.expirationDate = dateTimeFormatter(newExpirationDate);

			callback(undefined, true);
		});
	}

	/**
	 * This method embeds a new claim about the subject(s) of the JWT.
	 * Subject is mandatory if credentialSubject is an array of subjects. (To be extended tp crete JWT based on multiple subjects)
	 * @param context {string} - URI - https://www.w3.org/TR/vc-data-model/#contexts
	 * @param type {string} - Any other custom VC Types must be reflected within @context (a URI with a schema must be added)
	 * @param subjectClaims {Object} - Any claims related to the subject
	 * @param subject {string | Function} - It is mandatory if the credentialSubjects are more than one.
	 * @param callback
	 */
	embedSubjectClaim(context, type, subjectClaims, subject, callback) {
		if (typeof subject === 'function') {
			callback = subject;
			subject = null;
		}

		if (!context || typeof context !== 'string' || !isValidURL(context)) return callback(JWT_ERRORS.INVALID_CONTEXT_URI);
		if (!type || typeof type !== 'string') return callback(JWT_ERRORS.INVALID_CONTEXT_TYPE);
		if (!subjectClaims || typeof subjectClaims !== 'object') return callback(JWT_ERRORS.INVALID_SUBJECT_CLAIM);
		if (subjectClaims.id) return callback(JWT_ERRORS.IMMUTABLE_SUBJECT_CLAIM);

		const vc = this.jwtPayload.vc;
		if (Array.isArray(vc.credentialSubject)) {
			if (!subject || typeof subject !== 'string') {
				return callback(JWT_ERRORS.INVALID_SUBJECT_ID);
			}

			const targetSubjectIndex = vc.credentialSubject.findIndex(subject => subject.id === subject);
			if (targetSubjectIndex === -1) {
				return callback(JWT_ERRORS.PROVIDED_SUBJECT_ID_NOT_PRESENT);
			}

			Object.assign(vc.credentialSubject[targetSubjectIndex], subjectClaims);
		} else {
			Object.assign(vc.credentialSubject, subjectClaims);
		}

		vc['@context'].push(context);
		vc.type.push(type);
		this.jwtPayload.vc = JSON.parse(JSON.stringify(vc));

		callback(undefined, true);
	};

	async embedSubjectClaimAsync(context, type, subjectClaims, subject) {
		return this.asyncMyFunction(this.embedSubjectClaim, [...arguments]);
	}

	loadEncodedJWTVc(encodedJWT) {
		jwtVcParser(encodedJWT, (err, result) => {
			if (err) {
				return this.notifyInstanceReady(err);
			}

			this.jwtHeader = result.jwtHeader;
			this.jwtPayload = result.jwtPayload;
			this.jwtSignature = result.jwtSignature;
			this.notifyInstanceReady();
		});
	};

	verifyJWT(atDate, rootsOfTrust, callback) {
		if (typeof rootsOfTrust === 'function') {
			callback = rootsOfTrust;
			rootsOfTrust = [];
		}

		const decodedJWT = { jwtHeader: this.jwtHeader, jwtPayload: this.jwtPayload, jwtSignature: this.jwtSignature };
		jwtVcVerifier(decodedJWT, atDate, rootsOfTrust, (err, result) => {
			if (err) {
				return callback(undefined, { verifyResult: false, errorMessage: err });
			}

			callback(undefined, { verifyResult: result, ...JSON.parse(JSON.stringify(this.jwtPayload)) });
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
 * @param subject
 * @param options {Object}
 */
function createJWTVc(issuer, subject, options = {}) {
	return new JwtVC(issuer, subject, options, true);
}

/**
 * This method is parsing an encoded verifiable credential according to the requested type and returns the instance of the verifiable credential. <br />
 * @param encodedJWTVc {string}
 */
function loadJWTVc(encodedJWTVc) {
	const jwtInstance = new JwtVC();
	jwtInstance.loadEncodedJWTVc(encodedJWTVc);

	return jwtInstance;
}

module.exports = {
	createJWTVc, loadJWTVc
};