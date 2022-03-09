const {createOpenDSUErrorWrapper} = require("../error");

function AnchoringAbstractBehaviour(persistenceStrategy) {
    const self = this;
    const keySSISpace = require("opendsu").loadAPI("keyssi");
    self.createAnchor = function (anchorId, anchorValueSSI, callback) {
        if (typeof anchorId === 'undefined' || typeof anchorValueSSI === 'undefined' || anchorId === null || anchorValueSSI === null) {
            return callback(Error(`Invalid call for create anchor ${anchorId}:${anchorValueSSI}`));
        }
        //convert to keySSI
        let anchorIdKeySSI = anchorId;
        if (typeof anchorId === "string") {
            anchorIdKeySSI = keySSISpace.parse(anchorId);
        }
        let anchorValueSSIKeySSI = anchorValueSSI;
        if (typeof anchorValueSSI === "string") {
            anchorValueSSIKeySSI = keySSISpace.parse(anchorValueSSI);
        }

        if (!anchorIdKeySSI.canAppend()) {
            return persistenceStrategy.createAnchor(anchorIdKeySSI.getAnchorId(), anchorValueSSIKeySSI.getIdentifier(), callback);
        }

        const signer = determineSigner(anchorIdKeySSI, []);
        const signature = anchorValueSSIKeySSI.getSignature();
        const dataToVerify = anchorValueSSIKeySSI.getDataToSign(anchorIdKeySSI, null);
        if (!signer.verify(dataToVerify, signature)) {
            return callback(Error("Failed to verify signature"));
        }
        persistenceStrategy.createAnchor(anchorIdKeySSI.getAnchorId(), anchorValueSSIKeySSI.getIdentifier(), (err) => {
            return callback(err);
        });
    }

    self.appendAnchor = function (anchorId, anchorValueSSI, callback) {
        if (typeof anchorId === 'undefined' || typeof anchorValueSSI === 'undefined' || anchorId === null || anchorValueSSI === null) {
            return callback(Error(`Invalid call for append anchor ${anchorId}:${anchorValueSSI}`));
        }
        //convert to keySSI
        let anchorIdKeySSI = anchorId;
        if (typeof anchorId === "string") {
            anchorIdKeySSI = keySSISpace.parse(anchorId);
        }
        let anchorValueSSIKeySSI = anchorValueSSI;
        if (typeof anchorValueSSI === "string") {
            anchorValueSSIKeySSI = keySSISpace.parse(anchorValueSSI);
        }

        if (!anchorIdKeySSI.canAppend()) {
            return callback(Error(`Cannot append anchor for ${anchorId}`));
        }
        persistenceStrategy.getAllVersions(anchorId, (err, data) => {
            // throw Error("Get all versions callback");
            if (err) {
                return callback(err);
            }
            if (typeof data === 'undefined' || data === null) {
                data = [];
            }
            const historyOfKeySSI = data.map(el => keySSISpace.parse(el));
            const signer = determineSigner(anchorIdKeySSI, historyOfKeySSI);
            const signature = anchorValueSSIKeySSI.getSignature();
            if (typeof data[data.length - 1] === 'undefined') {
                return callback(`Cannot update non existing anchor ${anchorId}`);
            }
            const lastSignedHashLinkKeySSI = keySSISpace.parse(data[data.length - 1]);
            const dataToVerify = anchorValueSSIKeySSI.getDataToSign(anchorIdKeySSI, lastSignedHashLinkKeySSI);
            if (!signer.verify(dataToVerify, signature)) {
                return callback({statusCode: 428, message: "Versions out of sync"});
            }
            persistenceStrategy.appendAnchor(anchorIdKeySSI.getAnchorId(), anchorValueSSIKeySSI.getIdentifier(), callback);
        })
    }

    self.getAllVersions = function (anchorId, callback) {
        let anchorIdKeySSI = anchorId;
        if (typeof anchorId === "string") {
            anchorIdKeySSI = keySSISpace.parse(anchorId);
        }
        anchorId = anchorIdKeySSI.getAnchorId();

        persistenceStrategy.getAllVersions(anchorId, (err, data) => {
            if (err) {
                return callback(err);
            }
            if (typeof data === 'undefined' || data.length === 0) {
                return callback(undefined, []);
            }
            if (!anchorIdKeySSI.canAppend()) {
                //skip validation for non signing SSI
                let anchorValues;
                try {
                    anchorValues = data.map(el => keySSISpace.parse(el));
                } catch (e) {
                    return callback(e);
                }
                return callback(undefined, anchorValues);
            }
            const historyOfKeySSI = data.map(el => keySSISpace.parse(el));
            const progressiveHistoryOfKeySSI = [];
            let previousSignedHashLinkKeySSI = null;
            for (let i = 0; i <= historyOfKeySSI.length - 1; i++) {
                const anchorValueSSIKeySSI = historyOfKeySSI[i];
                const signer = determineSigner(anchorIdKeySSI, progressiveHistoryOfKeySSI);
                const signature = anchorValueSSIKeySSI.getSignature();
                const dataToVerify = anchorValueSSIKeySSI.getDataToSign(anchorIdKeySSI, previousSignedHashLinkKeySSI);
                if (!signer.verify(dataToVerify, signature)) {
                    return callback(Error("Failed to verify signature"));
                }
                //build history
                progressiveHistoryOfKeySSI.push(anchorValueSSIKeySSI);
                previousSignedHashLinkKeySSI = anchorValueSSIKeySSI;
            }
            //all history was validated
            return callback(undefined, historyOfKeySSI);
        });
    }

    self.getLastVersion = function (anchorId, callback) {
        let anchorIdKeySSI = anchorId;
        if (typeof anchorId === "string") {
            anchorIdKeySSI = keySSISpace.parse(anchorId);
        }
        anchorId = anchorIdKeySSI.getAnchorId();
        persistenceStrategy.getLastVersion(anchorId, (err, data) => {
            if (err) {
                return callback(err);
            }
            if (typeof data === 'undefined' || data === null) {
                return callback();
            }
            let anchorValueSSI;
            try {
                anchorValueSSI = keySSISpace.parse(data);
            } catch (e) {
                return callback(createOpenDSUErrorWrapper("Failed to parse anchor value", e));
            }
            callback(undefined, anchorValueSSI);
        });
    }

    function determineSigner(anchorIdKeySSI, historyOfKeySSIValues) {
        const {wasTransferred, signer} = wasHashLinkTransferred(historyOfKeySSIValues);
        if (wasTransferred) {
            return signer;
        }
        return anchorIdKeySSI;
    }

    function wasHashLinkTransferred(historyOfKeySSIValues) {
        if (!Array.isArray(historyOfKeySSIValues)) {
            throw `hashLinks is not Array. Received ${historyOfKeySSIValues}`;
        }
        for (let i = historyOfKeySSIValues.length - 1; i >= 0; i--) {
            let hashLinkSSI = historyOfKeySSIValues[i];
            if (hashLinkSSI.isTransfer()) {
                return {
                    wasTransferred: true, signVerifier: hashLinkSSI
                };
            }
        }
        return {
            wasTransferred: false, signVerifier: undefined
        }
    }
}


module.exports = {
    AnchoringAbstractBehaviour
}
