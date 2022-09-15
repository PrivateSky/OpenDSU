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
        const domain = "mqtestdomain";
        process.env.REMOTE_ENCLAVE_SECRET = "some secret";
        await tir.launchConfigurableApiHubTestNodeAsync({ domains: [{ name: domain, config: vaultDomainConfig }] });
        const sc = scAPI.getSecurityContext();

        sc.on("initialised", async () => {
            try {
                
                const clientDIDDocument = await $$.promisify(w3cDID.createIdentity)("ssi:name", domain, "client");
                const remoteDIDDocument = await $$.promisify(w3cDID.createIdentity)("key", domain, process.env.REMOTE_ENCLAVE_SECRET);

                const remoteEnclave = enclaveAPI.initialiseRemoteEnclave(clientDIDDocument.getIdentifier(), remoteDIDDocument.getIdentifier());
                const TABLE = "test_table";
                const addedRecord = { data: 1 };
                remoteEnclave.on("initialised", async () => {
                    
                        const numberOfRecords = 10;
                        let promisesList = [];
                        for (let i = 0; i < numberOfRecords; i++) {
                            promisesList.push($$.promisify(remoteEnclave.insertRecord)("some_did", TABLE, `pk${i}`, addedRecord, addedRecord));
                        }

                        try{
                            await Promise.all(promisesList);
                        }
                        catch(err){
                            console.log("Timeout error:", err);
                        }

                        let allRecords;
                        try{
                            allRecords = await $$.promisify(remoteEnclave.getAllRecords)("some_did", TABLE);
                            assert.equal(allRecords.length, numberOfRecords, "Not all inserted records have been retrieved")
                            testFinished();
                        }
                        catch(err){
                            console.log("Could not read records", err);
                            testFinished();
                        }

                      

                });

            } catch (e) {
                return console.log(e);
            }
        });
    });
}, 200000);

