require("../../../../psknode/bundles/testsRuntime");

const dc = require("double-check");
const assert = dc.assert;

const openDSU = require("opendsu");
const workers = openDSU.loadAPI("workers");

const pool = workers.createPool();

assert.callback("Test method runSyncFunction", (testFinished) => {
    const data = "some data";
    const expectedHash = openDSU.loadAPI("crypto").sha256(data);

    pool.runSyncFunction("crypto", "sha256", data, (error, actualHash) => {
        assert.equal(typeof error, 'undefined', "No error received from workers");
        assert.equal(actualHash, expectedHash);

        testFinished();
    });
});

assert.callback("Test method runSyncFunctionOnlyByWorker", (testFinished) => {
    const data = "some data";
    const expectedHash = openDSU.loadAPI("crypto").sha256(data);

    pool.runSyncFunctionOnlyByWorker("crypto", "sha256", data, (error, actualHash) => {
        assert.equal(typeof error, 'undefined', "No error received from workers");
        assert.equal(actualHash, expectedHash);

        testFinished();
    });
});