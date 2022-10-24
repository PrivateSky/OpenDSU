const openDSU = require("opendsu");
const keySSISpace = openDSU.loadAPI("keyssi");

const deriveAllKeySSIsFromPathKeys = (pathKeyMap, callback) => {
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

        getAllDerivedSSIsForKeySSI(keySSI, (err, derivedKeySSIs) => {
            if (err) {
                return callback(err);
            }

            keySSIMap = {...keySSIMap, ...derivedKeySSIs};
            __deriveAllKeySSIsFromPathKeysRecursively(index + 1);
        })

    }

    __deriveAllKeySSIsFromPathKeysRecursively(0);
}

const getAllDerivedSSIsForKeySSI = (keySSI, callback) => {
    if (typeof keySSI === "string") {
        try {
            keySSI = keySSISpace.parse(keySSI);
        } catch (e) {
            return callback(e);
        }
    }
    const derivedKeySSIs = {};
    const keySSIIdentifier = keySSI.getIdentifier();
    const __getDerivedKeySSIsRecursively = (currentKeySSI) => {
        derivedKeySSIs[currentKeySSI.getIdentifier()] = keySSIIdentifier;
        try {
            currentKeySSI = currentKeySSI.derive((err, derivedKeySSI) => {
                if (err) {
                    return callback(err);
                }

                currentKeySSI = derivedKeySSI;
                __getDerivedKeySSIsRecursively(currentKeySSI);
            });
        } catch (e) {
            return callback(undefined, derivedKeySSIs);
        }
    }

    __getDerivedKeySSIsRecursively(keySSI);
}

module.exports = {
    deriveAllKeySSIsFromPathKeys,
    getAllDerivedSSIsForKeySSI
}