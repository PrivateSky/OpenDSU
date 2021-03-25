require("../../../../psknode/bundles/testsRuntime");

const dc = require("double-check");
const assert = dc.assert;

const w3cDID = require('../../w3cdid');
const keySSI = require("../../keyssi")


assert.callback('w3cDID resolver test', (testFinished) => {
    const domain = 'default';

    w3cDID.createIdentity("sReadPK", keySSI.createTemplateSeedSSI(domain), (err, didDocument) => {
        if (err) {
            throw err;
        }

        w3cDID.resolveDID(didDocument.getIdentifier(), (err, didDocument) => {
            if (err) {
                throw err;
            }

            assert.equal(didDocument.constructor.name, "PKDIDDocument");
            testFinished();

        });
    });
}, 5000);

