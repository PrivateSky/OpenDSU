require("../../../../psknode/bundles/testsRuntime");

const assert = require("double-check").assert;
const keySSISpace = require("../../keyssi");

assert.callback("Derive from OWNERSHIP_SSI", (callback) => {
    const domain = "default";
    const token = "TOKEN_SSI";
    const levelAndToken = `0/${token}`;
    const ownershipSSI = keySSISpace.createOwnershipSSI(domain, levelAndToken);

    const oReadSSI = ownershipSSI.derive();
    const oReadControl = `${ownershipSSI.getPublicKeyHash()}/${levelAndToken}`;

    assert.equal("oread", oReadSSI.getTypeName());
    assert.equal(domain, oReadSSI.getDLDomain());
    assert.equal(ownershipSSI.getPrivateKeyHash(), oReadSSI.getSpecificString());
    assert.equal(oReadControl, oReadSSI.getControlString());

    const zatSSI = oReadSSI.derive();
    const zatControl = ownershipSSI.getPublicKeyHash();

    assert.equal("zat", zatSSI.getTypeName());
    assert.equal(domain, zatSSI.getDLDomain());
    assert.equal(token, zatSSI.getSpecificString());
    assert.equal(zatControl, zatSSI.getControlString());

    callback();
});
