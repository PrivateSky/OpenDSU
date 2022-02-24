function AnchoringAbstractBehaviour(persistenceStrategy) {
    const self = this;
    const keySSI = require('../keyssi/index');
    self.createAnchor = function (anchorId, anchorValueSSI, callback){
        if (typeof  anchorId === 'undefined' || typeof anchorValueSSI === 'undefined' || anchorId === null || anchorValueSSI === null)
        {
            return callback(Error(`Invalid call for create anchor ${anchorId}:${anchorValueSSI}`));
        }
        //convert to keySSI
        let anchorIdKeySSI = anchorId;
        if (typeof anchorId === "string"){
            try{
                anchorIdKeySSI = keySSI.parse(anchorId);
            }
            catch (err){
                return callback(err);
            }
        }
        let anchorValueSSIKeySSI = anchorValueSSI;
        if (typeof anchorValueSSI === "string"){
            try{
                anchorValueSSIKeySSI = keySSI.parse(anchorValueSSI);
            }
            catch(err){
                return callback(err);
            }
        }

        if (!anchorIdKeySSI.canAppend()){
            return persistenceStrategy.createAnchor(anchorIdKeySSI.getIdentifier(),anchorValueSSIKeySSI.getIdentifier(),(err) => {
                return callback(err);
            });
        }

        const signer = determineSigner(anchorIdKeySSI,[]);
        const signature = anchorValueSSIKeySSI.getSignature();
        const dataToVerify = anchorValueSSIKeySSI.getDataToSign(anchorIdKeySSI, null);
        if (!signer.verify(dataToVerify, signature)){
            return callback(Error("Failed to verify the signature!"));
        }
        persistenceStrategy.createAnchor(anchorIdKeySSI.getIdentifier(),anchorValueSSIKeySSI.getIdentifier(),(err) => {
            return callback(err);
        });
    }

    self.appendAnchor = function(anchorId, anchorValueSSI, callback){
        if (typeof  anchorId === 'undefined' || typeof anchorValueSSI === 'undefined' || anchorId === null || anchorValueSSI === null)
        {
            return callback(Error(`Invalid call for append anchor ${anchorId}:${anchorValueSSI}`));
        }
        //convert to keySSI
        let anchorIdKeySSI = anchorId;
        if (typeof anchorId === "string"){
            try {
                anchorIdKeySSI = keySSI.parse(anchorId);
            } catch(err){
                return callback(err);
            }
        }
        let anchorValueSSIKeySSI = anchorValueSSI;
        if (typeof anchorValueSSI === "string"){
            try {
                anchorValueSSIKeySSI = keySSI.parse(anchorValueSSI);
            } catch (err){
                return callback(err);
            }
        }

        if (!anchorIdKeySSI.canAppend()){
            return callback(Error(`Cannot append anchor for ${anchorId}`));
        }
        persistenceStrategy.getAllVersions(anchorId, (err, data) => {
            if (err){
                return callback(err);
            }
            if (typeof data === 'undefined' || data === null){
                data = [];
            }
            const historyOfKeySSI = data.map(el => keySSI.parse(el));
            const signer = determineSigner(anchorIdKeySSI,historyOfKeySSI);
            const signature = anchorValueSSIKeySSI.getSignature();
            persistenceStrategy.getLastVersion(anchorId, (err, data) => {
                if (err){
                    return callback(err);
                }
                if (typeof data === 'undefined' || data === null){
                    return callback(`Cannot update non existing anchor ${anchorId}`);
                }
                const lastSignedHashLinkKeySSI = keySSI.parse(data);
                const dataToVerify = anchorValueSSIKeySSI.getDataToSign(anchorIdKeySSI, lastSignedHashLinkKeySSI);
                if (!signer.verify(dataToVerify, signature)){
                    return callback(Error("Failed to verify the signature!"));
                }
                persistenceStrategy.appendAnchor(anchorIdKeySSI.getIdentifier(),anchorValueSSIKeySSI.getIdentifier(),(err) => {
                    return callback(err);
                });
            })
        })

    }

    self.getAllVersions = function(anchorId, callback){
        let anchorIdKeySSI = anchorId;
        if (typeof anchorId === "string"){
            try {
                anchorIdKeySSI = keySSI.parse(anchorId);
            } catch (err){
                return callback(err);
            }
        }
        persistenceStrategy.getAllVersions(anchorId, (err, data) => {
            if (err){
                return callback(err);
            }
            if (typeof data === 'undefined' || data.length === 0){
                return callback(undefined,[]);
            }
            if (!anchorIdKeySSI.canAppend()){
                //skip validation for non signing SSI
                return callback(undefined, data);
            }
            const historyOfKeySSI = data.map(el => keySSI.parse(el));
            const progressiveHistoryOfKeySSI = [];
            let previousSignedHashLinkKeySSI = null;
            for(let i=0; i<= historyOfKeySSI.length-1;i++){
                const anchorValueSSIKeySSI = historyOfKeySSI[i];
                const signer = determineSigner(anchorIdKeySSI,progressiveHistoryOfKeySSI);
                const signature = anchorValueSSIKeySSI.getSignature();
                const dataToVerify = anchorValueSSIKeySSI.getDataToSign(anchorIdKeySSI, previousSignedHashLinkKeySSI);
                if (!signer.verify(dataToVerify, signature)){
                    return callback(Error("Failed to verify the signature!"));
                }
                //build history
                progressiveHistoryOfKeySSI.push(anchorValueSSIKeySSI);
                previousSignedHashLinkKeySSI = anchorValueSSIKeySSI;
            }
            //all history was validated
            return callback(undefined, historyOfKeySSI.map(el => el.getIdentifier()));
        });
    }

    self.getLastVersion = function(anchorId, callback){
        this.getAllVersions(anchorId, (err, data) => {
            if (err){
                return callback(err);
            }
            if (data && data.length >= 1){
                return callback(undefined,data[data.length-1]);
            }
            return callback(undefined,null);
        })
    }

    function determineSigner(anchorIdKeySSI, historyOfKeySSIValues){
        const {wasTransferred, signer} = wasHashLinkTransferred(historyOfKeySSIValues);
        if (wasTransferred){
            return signer;
        }
        return anchorIdKeySSI;
    }

    function wasHashLinkTransferred(historyOfKeySSIValues){
        if (!Array.isArray(historyOfKeySSIValues)){
            throw `hashLinks is not Array. Received ${historyOfKeySSIValues}`;
        }
        for (let i = historyOfKeySSIValues.length-1; i>=0;i--){
            let hashLinkSSI = historyOfKeySSIValues[i];
            if (hashLinkSSI.isTransfer()){
                return {
                    wasTransferred : true,
                    signVerifier : hashLinkSSI
                };
            }
        }
        return {
            wasTransferred: false,
            signVerifier: undefined
        }
    }
}


module.exports = {
    AnchoringAbstractBehaviour
}
