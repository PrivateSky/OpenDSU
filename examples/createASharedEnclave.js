require("../../../psknode/bundles/testsRuntime");
const dc = require("double-check");
const tir = require("../../../psknode/tests/util/tir");

const openDSU = require("../index");
$$.__registerModule("opendsu", openDSU);

const enclaveAPI = openDSU.loadAPI("enclave");
const scAPI = openDSU.loadAPI("sc");

dc.createTestFolder("apihubStorage", async (err, folder) => {
    await $$.promisify(tir.launchApiHubTestNode)(100, folder);
    // get the mainEnclaveDB singleton which exposes a db like API

    const enclave = enclaveAPI.initialiseWalletDBEnclave();
    const enclaveDID = await $$.promisify(enclave.getDID)();
    const enclaveKeySSI = await $$.promisify(enclave.getKeySSI)();

    //get the main dsu instance
    const mainDSU = await $$.promisify(scAPI.getMainDSU)();

    //read the environment object
    let env = await $$.promisify(mainDSU.readFile)("/environment.json");
    env = JSON.parse(env.toString());

    //set the enclave type property
    env[openDSU.constants.SHARED_ENCLAVE.TYPE] = "WalletDBEnclave";

    //set the shared enclave DID
    env[openDSU.constants.SHARED_ENCLAVE.DID] = enclaveDID;

    //set the shared enclave SSI
    env[openDSU.constants.SHARED_ENCLAVE.KEY_SSI] = enclaveKeySSI;

    //overwrite the environment object
    await $$.promisify(mainDSU.writeFile)("/environment.json", JSON.stringify(env));

    //reload the security context
    scAPI.refreshSecurityContext();
});

