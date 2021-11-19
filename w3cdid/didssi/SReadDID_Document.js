const methodsNames = require("../didMethodsNames");

function SReadDID_Document(enclave, isInitialisation, seedSSI) {
    const DID_mixin = require("./ConstDID_Document_Mixin");
    const ObservableMixin = require("../../utils/ObservableMixin");
    let tokens;
    let sReadSSI;

    const PUB_KEYS_PATH = "publicKeys";
    DID_mixin(this, enclave);
    ObservableMixin(this);
    const openDSU = require("opendsu");
    const keySSISpace = openDSU.loadAPI("keyssi");
    const resolver = openDSU.loadAPI("resolver");
    const dbAPI = openDSU.loadAPI("db");

    const createSeedDSU = async () => {
        try {
            this.dsu = await $$.promisify(resolver.createDSUForExistingSSI)(seedSSI);
        } catch (e) {
            throw createOpenDSUErrorWrapper(`Failed to create seed dsu`, e);
        }

        let ssi;
        try {
            ssi = await $$.promisify(keySSISpace.createSeedSSI)(seedSSI.getDLDomain());
        } catch (e) {
            throw createOpenDSUErrorWrapper(`Failed to create seed ssi`, e);
        }

        this.privateKey = ssi.getPrivateKey();
        const publicKey = ssi.getPublicKey("raw");

        try {
            await $$.promisify(this.dsu.writeFile)(`${PUB_KEYS_PATH}/${publicKey.toString("hex")}`);
        } catch (e) {
            throw createOpenDSUErrorWrapper(`Failed to write public key in dsu`, e);
        }
    };

    this.init = async () => {
        if (typeof seedSSI === "string") {
            try {
                seedSSI = keySSISpace.parse(seedSSI);
            } catch (e) {
                throw createOpenDSUErrorWrapper(`Failed to parse ssi ${seedSSI}`, e);
            }
        }

        if (isInitialisation) {
            sReadSSI = seedSSI.derive();
            await createSeedDSU();
            this.finishInitialisation();
            this.dispatchEvent("initialised");
        } else {
            tokens = seedSSI;
            sReadSSI = tokens.join(":");
            sReadSSI = keySSISpace.parse(sReadSSI);
            seedSSI = undefined;

            try {
                this.dsu = await $$.promisify(resolver.loadDSU)(sReadSSI);
            } catch (e) {
                throw createOpenDSUErrorWrapper(`Failed to load dsu`, e);
            }

            this.finishInitialisation();
            this.dispatchEvent("initialised");
        }
    };

    this.getMethodName = () => {
        return methodsNames.S_READ_SUBTYPE;
    }

    this.getDomain = () => {
        let domain;
        if (!isInitialisation) {
            domain = sReadSSI.getDLDomain();
        } else {
            domain = seedSSI.getDLDomain();
        }

        return domain;
    }

    this.getIdentifier = () => {
        return `did:${sReadSSI.getIdentifier(true)}`
    };

    const bindAutoPendingFunctions = require("../../utils/BindAutoPendingFunctions").bindAutoPendingFunctions;
    bindAutoPendingFunctions(this, ["init", "getIdentifier", "getDomain", "on", "off", "addPublicKey"]);

    this.init();
    return this;
}

module.exports = {
    initiateDIDDocument: function (enclave, seedSSI) {
        return new SReadDID_Document(enclave, true, seedSSI)
    },
    createDIDDocument: function (enclave, tokens) {
        return new SReadDID_Document(enclave, false, tokens.slice(1));
    }
};
