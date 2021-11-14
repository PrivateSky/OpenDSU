require("../../../psknode/bundles/testsRuntime");
const dc = require("double-check");
const tir = require("../../../psknode/tests/util/tir");

const openDSU = require("../index");
$$.__registerModule("opendsu", openDSU);

//load db API from "opendsu"
const dbAPI = openDSU.loadAPI("db");

dc.createTestFolder("apihubStorage", async (err, folder) => {
    await $$.promisify(tir.launchApiHubTestNode)(100, folder);
    // get the mainEnclaveDB singleton which exposes a db like API
    const mainEnclaveDB = await $$.promisify(dbAPI.getMainEnclaveDB)();

    await mainEnclaveDB.writeKeyAsync("key_1", 1);
    const value = await mainEnclaveDB.readKeyAsync("key_1");
    console.log(value); // expected: 1
});

