function ConstDID_Document_Mixin(target, domain, name) {
    let mixin = require("../W3CDID_Mixin");
    const observableMixin = require("../../utils/ObservableMixin")
    mixin(target);
    observableMixin(target);

    const openDSU = require("opendsu");
    const sc = openDSU.loadAPI("sc").getSecurityContext();
    const error = openDSU.loadAPI("error");
    const crypto = openDSU.loadAPI("crypto");
    const keySSISpace = openDSU.loadAPI("keyssi");
    const resolver = openDSU.loadAPI("resolver");

    const WRITABLE_DSU_PATH = "writableDSU";
    const PUB_KEY_PATH = "publicKey";

    let privateKey;

    const generatePublicKey = async () => {
        let seedSSI;
        try {
            seedSSI = await $$.promisify(keySSISpace.createSeedSSI)(domain);
        } catch (e) {
            return error.reportUserRelevantError(`Failed to create SeedSSI`, e);
        }

        privateKey = seedSSI.getPrivateKey();
        return seedSSI.getPublicKey("raw");
    };

    const createDSU = async () => {
        let constDSU;
        try {
            constDSU = await $$.promisify(resolver.createConstDSU)(domain, name);
        } catch (e) {
            return error.reportUserRelevantError(`Failed to create constDSU`, e);
        }

        try {
            target.dsu = await $$.promisify(resolver.createSeedDSU)(domain);
        } catch (e) {
            return error.reportUserRelevantError(`Failed to create writableDSU`, e);
        }

        let publicKey = await generatePublicKey();
        try {
            await $$.promisify(target.dsu.writeFile)(PUB_KEY_PATH, publicKey);
        } catch (e) {
            return error.reportUserRelevantError(`Failed to create writableDSU`, e);
        }


        let seedSSI;
        try {
            seedSSI = await $$.promisify(target.dsu.getKeySSIAsString)();
        } catch (e) {
            return error.reportUserRelevantError(`Failed to get seedSSI`, e);
        }

        try {
            await $$.promisify(constDSU.mount)(WRITABLE_DSU_PATH, seedSSI);
        } catch (e) {
            return error.reportUserRelevantError(`Failed to mount writable DSU`, e);
        }

        target.finishInitialisation();
        target.dispatchEvent("initialised");
    };

    target.init = () => {
        resolver.loadDSU(keySSISpace.createConstSSI(domain, name), async (err, constDSUInstance) => {
            if (err) {
                try {
                    await createDSU(domain, name);
                } catch (e) {
                    return error.reportUserRelevantError(`Failed to create DSU`, e);
                }
                return;
            }

            try {
                const dsuContext = await $$.promisify(constDSUInstance.getArchiveForPath)(WRITABLE_DSU_PATH);
                target.dsu = dsuContext.archive;
            } catch (e) {
                return error.reportUserRelevantError(`Failed to load writableDSU`, e);
            }

            target.finishInitialisation();
            target.dispatchEvent("initialised");
        });
    }

    target.getPrivateKeys = () => {
        const res = {};
        res.privateKey = privateKey;
        return res;
    };

    target.getPublicKey = (format, callback) => {
        target.dsu.readFile(PUB_KEY_PATH, (err, pubKey) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to read public key for did ${target.getIdentifier()}`, err));
            }

            if(format === "raw") {
                return callback(undefined, pubKey);
            }

            try {
                pubKey = crypto.convertPublicKey(pubKey, format);
            } catch (e) {
                return callback(createOpenDSUErrorWrapper(`Failed to convert raw public key to pem`, e));
            }

            callback(undefined, pubKey);
        });
    };

    target.getDomain = () => {
        return domain;
    };
}

module.exports = ConstDID_Document_Mixin;
