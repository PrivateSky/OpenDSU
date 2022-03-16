require('../../../../psknode/bundles/testsRuntime');

const assert = require('double-check').assert;
const openDSU = require("../../index");
$$.__registerModule("opendsu", openDSU);

const keySSISpace = openDSU.loadAPI("keyssi");

assert.callback('Create Alias SSI test', (callback) => {
    const specificString = "some string";
    keySSISpace.createAliasSSI(specificString,  (err, aliasSSI) => {
        if (err) {
            throw err;
        }

        const type = aliasSSI.getTypeName();
        const DLDomain = aliasSSI.getDLDomain();
        const alias = aliasSSI.getSpecificString();
        process.env.VAULT_DOMAIN = "default"
        const aliasSSIIdentifier = "ssi:alias:$VAULT_DOMAIN:alias::v0";
        const ssi = keySSISpace.parse(aliasSSIIdentifier);

        assert.true(type === 'alias', 'Invalid type property');
        assert.true(DLDomain === "vault", 'Invalid domain property');
        assert.true(ssi.getDLDomain() === "default", 'Invalid domain property');
        assert.true(specificString === alias, 'Invalid specific string property');

        callback();
    });
});
