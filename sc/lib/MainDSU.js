const constants = require("../../moduleConstants");
const {getURLForSsappContext} = require("../../utils/getURLForSsappContext");
const openDSU = require("opendsu");
const http = openDSU.loadAPI("http")
const keySSISpace = openDSU.loadAPI("keyssi");
const resolver = openDSU.loadAPI("resolver");

const setMainDSU = (mainDSU) => {
    return setGlobalVariable("rawDossier", mainDSU);
};

function getMainDSU(callback) {
    callback = $$.makeSaneCallback(callback);
    if (globalVariableExists("rawDossier")) {
        return callback(undefined, getGlobalVariable("rawDossier"));
    }
    switch ($$.environmentType) {
        case constants.ENVIRONMENT_TYPES.WEB_WORKER_ENVIRONMENT_TYPE:
        case constants.ENVIRONMENT_TYPES.SERVICE_WORKER_ENVIRONMENT_TYPE:

        function __getMainDSUFromSw() {
            if (!globalVariableExists("rawDossier")) {
                setTimeout(() => {
                    __getMainDSUFromSw()
                }, 100);
                return;
            }
            return callback(undefined, getGlobalVariable("rawDossier"));
        }

            return __getMainDSUFromSw();
        case constants.ENVIRONMENT_TYPES.BROWSER_ENVIRONMENT_TYPE:
            return getMainDSUForIframe(callback);
        case constants.ENVIRONMENT_TYPES.NODEJS_ENVIRONMENT_TYPE:
            return getMainDSUForNode(callback);
        default:
            return callback(Error("Main DSU does not exist in the current context."));
    }
}

function getMainDSUForNode(callback) {
    if (process.env.MAIN_WALLET) {
        const resolver = require("opendsu").loadAPI("resolver");
        return resolver.loadDSU(process.env.MAIN_WALLET, (err, mainDSU) => {
            if (err) {
                return callback(err);
            }

            setMainDSU(mainDSU);
            callback(undefined, mainDSU);
        });
    }
    const InMemoryMainDSU = require("./InMemoryMainDSU");
    const mainDSU = new InMemoryMainDSU();
    setMainDSU(mainDSU);
    callback(undefined, mainDSU);
}

function getMainDSUForIframe(callback) {
    let mainDSU = getGlobalVariable("rawDossier");
    if (mainDSU) {
        return callback(undefined, mainDSU);
    }

    http.doGet(getURLForSsappContext("/getSSIForMainDSU"), (err, res) => {
        if (err || res.length === 0) {
            return callback(createOpenDSUErrorWrapper("Failed to get main DSU SSI", err));
        }

        let config = openDSU.loadApi("config");

        let mainSSI = keySSISpace.parse(res);
        if (mainSSI.getHint() === "server") {
            config.disableLocalVault();
        }
        resolver.loadDSU(mainSSI, (err, mainDSU) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper("Failed to load main DSU ", err));
            }

            setMainDSU(mainDSU);
            callback(undefined, mainDSU);
        });
    });
}

module.exports = {
    getMainDSU,
    setMainDSU
}
