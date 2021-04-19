const constants = require("../moduleConstants");

function validateHashLinks(hashLinks, callback) {
    // todo: validate transferSSI and shl
    // todo: filter to ignore transferSSI

    const validatedHashLinks = hashLinks.map((hashLink) => {
        let ssiType = hashLink.getTypeName();

        // convert SIGNED_HASH_LINK_SSI to HASH_LINK_SSI
        if (ssiType === constants.KEY_SSIS.SIGNED_HASH_LINK_SSI) {
            return hashLink.derive();
        }

        return hashLink;
    });
    console.log("Validated hash links......", validatedHashLinks.map(vhl=>vhl.getIdentifier()));
    callback(undefined, validatedHashLinks);
}

module.exports = {
    validateHashLinks,
};
