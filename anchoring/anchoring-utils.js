const constants = require("../moduleConstants");

function validateHashLinks(keySSI, hashLinks, callback) {
    const validatedHashLinks = [];
    let lastSSI;
    let lastTransferSSI;

    const __validateHashLinksRecursively = (index) => {
        const newSSI = hashLinks[index];
        if (typeof newSSI === "undefined") {
            return callback(undefined, validatedHashLinks);
        }
        verifySignature(keySSI, newSSI, lastSSI, (err, status) => {
            if (err) {
                return callback(err);
            }

            if (!status) {
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
            __validateHashLinksRecursively(index + 1);
        });
    }

    __validateHashLinksRecursively(0);
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

function verifySignature(keySSI, newSSI, lastSSI, callback) {
    if (typeof lastSSI === "function") {
        callback = lastSSI;
        lastSSI = undefined;
    }

    if (!keySSI.canSign()) {
        return callback(undefined, true);
    }
    if (!newSSI.canBeVerified()) {
        return callback(undefined, true);
    }
    const timestamp = newSSI.getTimestamp();
    const signature = newSSI.getSignature();
    let lastEntryInAnchor = '';
    if (lastSSI) {
        lastEntryInAnchor = lastSSI.getIdentifier();
    }

    let dataToVerify;
    keySSI.getAnchorId((err, anchorId) => {
        if (err) {
            return callback(err);
        }

        if (newSSI.getTypeName() === constants.KEY_SSIS.SIGNED_HASH_LINK_SSI) {
            dataToVerify = keySSI.hash(anchorId + newSSI.getHash() + lastEntryInAnchor + timestamp);
            return callback(undefined, keySSI.verify(dataToVerify, signature));
        }
        if (newSSI.getTypeName() === constants.KEY_SSIS.TRANSFER_SSI) {
            dataToVerify += newSSI.getSpecificString();
            return callback(undefined, keySSI.verify(dataToVerify, signature));
        }

        callback(undefined, false);
    });
}

module.exports = {
    validateHashLinks,
    verifySignature
};
