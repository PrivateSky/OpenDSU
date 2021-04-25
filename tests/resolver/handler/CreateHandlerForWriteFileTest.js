require("../../../../../psknode/bundles/testsRuntime");

const dc = require("double-check");
const assert = dc.assert;

const resolver = require("../../../resolver");
const { createTestFolderWithDSU, isHashLinkSSI } = require("./utils");

assert.callback(
    "getHandler writeFile",
    (testFinished) => {
        createTestFolderWithDSU("dsu-writeFile", (keySSI, dsu) => {
            resolver.getDSUHandler(keySSI).writeFile("dummy", "dummy-content", (error, result) => {
                if (error) {
                    throw error;
                }

                assert.true(isHashLinkSSI(result), "expected result to be a HashLinkSSI");

                testFinished();
            });
        });
    },
    10000
);
