const constants = require("../moduleConstants");

function validateHashLinks(keySSI, hashLinks, callback) {
    const validatedHashLinks = [];
    let lastSSI;
    let lastTransferSSI;
    for (let i = 0; i < hashLinks.length; i++) {
        const newSSI = hashLinks[i];
        if (!verifySignature(keySSI, newSSI, lastSSI)) {
            return callback(Error("Failed to verify signature"));
        }

        if (!validateAnchoredSSI(lastTransferSSI, newSSI)) {
            return callback(Error("Failed to validate SSIs"));
        }

        if (newSSI.getTypeName() === constants.KEY_SSIS.TRANSFER_SSI) {
            lastTransferSSI = newSSI;
        } else {
            validatedHashLinks.push(newSSI);
            lastSSI = newSSI;
        }
    }
    callback(undefined, validatedHashLinks);
}


function validateAnchoredSSI(lastTransferSSI, currentSSI) {
    if (!lastTransferSSI) {
        return true;
    }
    if (lastTransferSSI.getSignature() !== currentSSI.getSignature()) {
        return false;
    }

    return true;
}

function verifySignature(keySSI, newSSI, lastSSI) {
    if (!keySSI.canSign()) {
        return true;
    }
    if (!newSSI.canBeVerified()) {
        return true;
    }
    const timestamp = newSSI.getTimestamp();
    const signature = newSSI.getSignature();
    let lastEntryInAnchor = '';
    if (lastSSI) {
        lastEntryInAnchor = lastSSI.getIdentifier();
    }

    let dataToVerify;
    if (newSSI.getTypeName() === constants.KEY_SSIS.SIGNED_HASH_LINK_SSI) {
        dataToVerify = keySSI.hash(keySSI.getAnchorId() + newSSI.getHash() + lastEntryInAnchor + timestamp);
        return keySSI.verify(dataToVerify, signature);
    }
    if (newSSI.getTypeName() === constants.KEY_SSIS.TRANSFER_SSI) {
        dataToVerify += newSSI.getSpecificString();
        return keySSI.verify(dataToVerify, signature);
    }

    return false;
}

module.exports = {
    validateHashLinks,
    verifySignature
};
