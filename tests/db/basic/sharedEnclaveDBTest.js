require("../../../../../psknode/bundles/testsRuntime");
const tir = require("../../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;
const openDSU = require('../../../index');
$$.__registerModule("opendsu", openDSU);
const enclaveAPI = openDSU.loadAPI("enclave");
const dbAPI = openDSU.loadAPI("db");
const resolver = openDSU.loadAPI("resolver");
const scAPI = openDSU.loadAPI("sc");

assert.callback('Shared enclave db test', (testFinished) => {
    dc.createTestFolder('createDSU', async (err, folder) => {
        const vaultDomainConfig = {
            "anchoring": {
                "type": "FS",
                "option": {}
            }
        }

        try {
            await tir.launchConfigurableApiHubTestNodeAsync({domains: [{name: "vault", config: vaultDomainConfig}]});
            const seedDSU = await $$.promisify(resolver.createSeedDSU)("vault");
            const keySSI = await $$.promisify(seedDSU.getKeySSIAsString)();
            const walletDBEnclave = enclaveAPI.initialiseWalletDBEnclave(keySSI);
            const enclaveDID = await $$.promisify(walletDBEnclave.getDID)();
            const mainDSU = await $$.promisify(scAPI.getMainDSU)();
            let env = await $$.promisify(mainDSU.readFile)("/environment.json");
            env = JSON.parse(env.toString());
            env[openDSU.constants.SHARED_ENCLAVE.TYPE] = openDSU.constants.ENCLAVE_TYPES.WALLET_DB_ENCLAVE;
            env[openDSU.constants.SHARED_ENCLAVE.KEY_SSI] = keySSI;
            env[openDSU.constants.SHARED_ENCLAVE.DID] = enclaveDID;
            await $$.promisify(mainDSU.writeFile)("/environment.json", JSON.stringify(env));
            await $$.promisify(mainDSU.refresh)()
            env = await $$.promisify(mainDSU.readFile)("/environment.json");
            env = JSON.parse(env.toString());

            scAPI.refreshSecurityContext();
            const sharedEnclaveDB = await $$.promisify(dbAPI.getSharedEnclaveDB)()
            const TABLE = "test_table";
            const addedRecord = {data: 1};
            await sharedEnclaveDB.insertRecordAsync(TABLE, "key_1", addedRecord);
            const record = await sharedEnclaveDB.getRecordAsync(TABLE, "key_1");
            console.log(record);
            assert.arraysMatch(record, addedRecord);
            testFinished();
        } catch (e) {
            return console.log(e);
        }
    });
}, 5000);

