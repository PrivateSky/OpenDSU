let keySSIApis = require("../../keyssi");

function generateSeedSSI(){
    const domain = 'default';
    return keySSIApis.createSeedSSI(domain);
}

function generateConstSSI(){
    const domain = 'default';
    return keySSIApis.createConstSSI(domain);
}

function getAnchorId(seedSSI){
    return seedSSI.getAnchorId();
}

async function getSignedHashLink(seedSSI, previousSignHashLinkId){
    const domain = 'default';
    let anchorSSI = keySSIApis.parse(getAnchorId(seedSSI));
    let previousSignHashLinkSSI = null;
    if (previousSignHashLinkId){
        previousSignHashLinkSSI = keySSIApis.parse(previousSignHashLinkId);
    }
    const timestamp = Date.now();

    const dummy = keySSIApis.createSignedHashLinkSSI(domain, "HASH1", timestamp, "signature", seedSSI.getVn());
    let dataToSign = dummy.getDataToSign(anchorSSI,previousSignHashLinkSSI);

    let signature = await $$.promisify(seedSSI.sign)(dataToSign);
    const signedHashLinkSSI = keySSIApis.createSignedHashLinkSSI(domain, "HASH1", timestamp, signature, seedSSI.getVn());
    return signedHashLinkSSI.getIdentifier();
}


function getHashLink(constSSI){
    const domain = 'default';
    return keySSIApis.createHashLinkSSI(domain,'some hash data', constSSI.getVn(),'hint').getIdentifier();
}

async function getPopulatedCorruptedMemoryPersistence(){
    const seedSSI = generateSeedSSI();
    const anchorId = getAnchorId(seedSSI);
    const hashlink = await getSignedHashLink(seedSSI,null);
    const hashlink2 = await getSignedHashLink(seedSSI,hashlink);
    const hashlink3 = await getSignedHashLink(seedSSI,hashlink2);
    const hashlink4 = await getSignedHashLink(seedSSI,hashlink3);
    const cmp = new MemoryPersistenceStrategy();
    await $$.promisify(cmp.createAnchor)(anchorId, hashlink);
    await $$.promisify(cmp.appendAnchor)(anchorId,hashlink2);
    await $$.promisify(cmp.appendAnchor)(anchorId,hashlink4);
    return {anchorId,cmp};
}

function MemoryPersistenceStrategy(){
    const self = this;
    const data = new Map();
    self.getLastVersion = function (anchorId, callback){
        //read the last hashlink for anchorId
        if (typeof data.get(anchorId) === 'undefined' || data.get(anchorId).length === 0){
            return callback(undefined,null);
        }
        return callback(undefined, data.get(anchorId)[data.get(anchorId).length - 1]);
    }
    self.getAllVersions = function (anchorId, callback){
        // read all hashlinks for anchorId
        if (typeof data.get(anchorId) === 'undefined'){
            return callback(undefined,[]);
        }
        return callback(undefined, data.get(anchorId));
    }
    self.createAnchor = function (anchorId, anchorValueSSI, callback){
        //check if anchor exist, return error
        if (typeof data.get(anchorId) !== 'undefined' ){
            return callback(Error(`anchor ${anchorId} already exist`));
        }
        //store a new anchorId with anchorValueSSI as new hashlink
        data.set(anchorId,[anchorValueSSI]);
        return callback(undefined, undefined);
    }
    self.appendAnchor = function(anchorId,anchoreValueSSI, callback){
        if (typeof data.get(anchorId) === 'undefined' ){
            return callback(Error(`anchor ${anchorId} does not exist`));
        }
        //store a new hashlink  for the anchorId
        data.get(anchorId).push(anchoreValueSSI);
        return callback(undefined, undefined);
    }

}

module.exports = {
    getAnchorId,
    getSignedHashLink,
    generateSeedSSI,
    MemoryPersistenceStrategy,
    getPopulatedCorruptedMemoryPersistence,
    generateConstSSI,
    getHashLink
}
