require("../../../../psknode/bundles/testsRuntime");
const tir = require("../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;
const openDSU = require('../../index');
$$.__registerModule("opendsu", openDSU);
const enclaveAPI = openDSU.loadAPI("enclave");
const scAPI = openDSU.loadAPI("sc");
const w3cDID = openDSU.loadAPI("w3cdid");


assert.callback('Remote enclave test', (testFinished) => {
    dc.createTestFolder('createDSU', async (err, folder) => {
        const vaultDomainConfig = {
            "anchoring": {
                "type": "FS",
                "option": {}
            },
            "enable": ["enclave", "mq"]
        }

        process.env.REMOTE_ENCLAVE_SECRET = "some secret";
        await tir.launchConfigurableApiHubTestNodeAsync({ domains: [{ name: "default", config: vaultDomainConfig }] });
        const sc = scAPI.getSecurityContext();

        sc.on("initialised", async () => {
            try {
                const domain = "default";
                const clientDIDDocument = await $$.promisify(w3cDID.createIdentity)("ssi:name", domain, "client");
                const remoteDIDDocument = await $$.promisify(w3cDID.createIdentity)("key", undefined, process.env.REMOTE_ENCLAVE_SECRET);

                const remoteEnclave = enclaveAPI.initialiseRemoteEnclave(clientDIDDocument.getIdentifier(), remoteDIDDocument.getIdentifier());
                const TABLE = "test_table";
                const addedRecord = { data: 1 };
                remoteEnclave.on("initialised", async () => {
                    try {
                        await $$.promisify(remoteEnclave.insertRecord)("some_did", TABLE, "pk1", addedRecord, addedRecord);
                        await $$.promisify(remoteEnclave.insertRecord)("some_did", TABLE, "pk2", addedRecord, addedRecord);
                        const record = await $$.promisify(remoteEnclave.getRecord)("some_did", TABLE, "pk1");
                        assert.objectsAreEqual(record, addedRecord, "Records do not match");
                        const allRecords = await $$.promisify(remoteEnclave.getAllRecords)("some_did", TABLE);

                        assert.equal(allRecords.length, 2, "Not all inserted records have been retrieved")
                        testFinished();
                    } catch (e) {
                        return console.log(e);
                    }

                });

            } catch (e) {
                return console.log(e);
            }
        });
    });
}, 2000000);
