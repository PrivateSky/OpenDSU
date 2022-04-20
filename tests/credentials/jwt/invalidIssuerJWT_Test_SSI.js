require("../../../../../psknode/bundles/testsRuntime");

const assert = require("double-check").assert;
const keySSIResolver = require("key-ssi-resolver");
const keySSIFactory = keySSIResolver.KeySSIFactory;
const SSITypes = keySSIResolver.SSITypes;

const openDSU = require("../../../index");
const keySSISpace = openDSU.loadApi("keyssi");
const credentials = openDSU.loadApi("credentials");
const crypto = openDSU.loadApi("crypto");
const {createVc, jwt_getReadableIdentity, jwt_parseJWTSegments, JWT_ERRORS} = credentials;

const templateSeedSSI = keySSIFactory.createType(SSITypes.SEED_SSI);
templateSeedSSI.load(SSITypes.SEED_SSI, "default");
const jwtOptions = {
    exp: 1678812494957
};

function initializeSeedSSIs(callback) {
    const subjectSeedSSI = keySSISpace.createTemplateSeedSSI("default");
    const issuerSeedSSI = keySSISpace.createTemplateSeedSSI("default");

    subjectSeedSSI.initialize("default", undefined, undefined, undefined, crypto.generateRandom(20).toString("hex"), (err) => {
        if (err) {
            return callback(err);
        }

        issuerSeedSSI.initialize("default", undefined, undefined, undefined, crypto.generateRandom(20).toString("hex"), (err) => {
            if (err) {
                return callback(err);
            }

            callback(undefined, {issuerSeedSSI, subjectSeedSSI});
        });
    });
}

assert.callback("[SSI] Invalid Issuer format test", (callback) => {
    initializeSeedSSIs((err, result) => {
        if (err) {
            console.error(err);
            throw err;
        }

        const {issuerSeedSSI, subjectSeedSSI} = result;
        jwtOptions.issuer = "invalidIssuer:" + issuerSeedSSI.getIdentifier(true);
        jwtOptions.subject = subjectSeedSSI;
        createVc("jwt", jwtOptions, (createJwtError, jwtInstance) => {
            assert.notNull(createJwtError);
            assert.equal(createJwtError, JWT_ERRORS.INVALID_ISSUER_FORMAT);
            callback();
        });
    });
});