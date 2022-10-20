const openDSU = require("opendsu");
const keySSISpace = openDSU.loadAPI("keyssi");
const deriveAllKeySSIsFromPathKeys = async (pathKeyMap) => {
    let keySSIMap = {};

    for (let pth in pathKeyMap) {
        const pathSSIIdentifier = pathKeyMap[pth];
        let keySSI = keySSISpace.parse(pathSSIIdentifier);
        const derivedKeySSIs = await getAllDerivedSSIsForKeySSI(keySSI);
        keySSIMap = {...keySSIMap, ...derivedKeySSIs};
    }

    return keySSIMap;
}

const getAllDerivedSSIsForKeySSI = async (keySSI) => {
    if (typeof keySSI === "string") {
        keySSI = keySSISpace.parse(keySSI);
    }
    const derivedKeySSIs = {};
    const keySSIIdentifier = keySSI.getIdentifier();
    const __getDerivedKeySSIRecursively = async (currentKeySSI) => {
        derivedKeySSIs[keySSIIdentifier] = currentKeySSI.getIdentifier();
        try {
            currentKeySSI = await $$.promisify(currentKeySSI.derive)();
        } catch (e) {
            return;
        }

        await __getDerivedKeySSIRecursively(currentKeySSI);
    }

    await __getDerivedKeySSIRecursively(keySSI);
    return derivedKeySSIs;
}

module.exports = {
    deriveAllKeySSIsFromPathKeys,
    getAllDerivedSSIsForKeySSI
}