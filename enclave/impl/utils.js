const openDSU = require("opendsu");
const keySSISpace = openDSU.loadAPI("keyssi");

const getKeySSIsMappingFromPathKeys = (pathKeyMap, callback) => {
    let keySSIMap = {};
    const props = Object.keys(pathKeyMap);
    const __deriveAllKeySSIsFromPathKeysRecursively = (index) => {
        const pth = props[index];
        if (typeof pth === "undefined") {
            return callback(undefined, keySSIMap);
        }

        const pathSSIIdentifier = pathKeyMap[pth];
        let keySSI;
        try {
            keySSI = keySSISpace.parse(pathSSIIdentifier);
        } catch (e) {
            return callback(e);
        }

        getKeySSIMapping(keySSI, (err, derivedKeySSIs) => {
            if (err) {
                return callback(err);
            }

            keySSIMap = {...keySSIMap, ...derivedKeySSIs};
            __deriveAllKeySSIsFromPathKeysRecursively(index + 1);
        })

    }

    __deriveAllKeySSIsFromPathKeysRecursively(0);
}

const getKeySSIMapping = (keySSI, callback) => {
    if (typeof keySSI === "string") {
        try {
            keySSI = keySSISpace.parse(keySSI);
        } catch (e) {
            return callback(e);
        }
    }
    const keySSIsMap = {};

    const __getDerivedKeySSIsRecursively = (currentKeySSI, derivedKeySSIsObj, callback) => {
        derivedKeySSIsObj[currentKeySSI.getTypeName()] = currentKeySSI.getIdentifier();
        try {
            currentKeySSI = currentKeySSI.derive((err, derivedKeySSI) => {
                if (err) {
                    return callback(err);
                }

                currentKeySSI = derivedKeySSI;
                __getDerivedKeySSIsRecursively(currentKeySSI, derivedKeySSIsObj, callback);
            });
        } catch (e) {
            return callback(undefined, derivedKeySSIsObj);
        }
    }

    __getDerivedKeySSIsRecursively(keySSI, {}, (err, _derivedKeySSIsObj)=>{
        if (err) {
            return callback(err);
        }

        for (let ssiType in _derivedKeySSIsObj) {
            keySSIsMap[ssiType] = {};
            const derivedKeySSIsList = Object.values(_derivedKeySSIsObj);
            for (let i = 0; i < derivedKeySSIsList.length; i++) {
                keySSIsMap[ssiType][derivedKeySSIsList[i]] = _derivedKeySSIsObj[ssiType];
            }
        }

        callback(undefined, keySSIsMap);
    })
}

module.exports = {
    getKeySSIsMappingFromPathKeys,
    getKeySSIMapping
}