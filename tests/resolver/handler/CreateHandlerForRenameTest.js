require("../../../../../psknode/bundles/testsRuntime");

const dc = require("double-check");
const assert = dc.assert;

const resolver = require("../../../resolver");
const { createTestFolderWithDSU, isHashLinkSSI } = require("./utils");

assert.callback(
    "getHandler rename",
    (testFinished) => {
        createTestFolderWithDSU("dsu-rename", (keySSI, dsu) => {
            resolver.getDSUHandler(keySSI).listFiles("/", (error, initialFiles) => {
                if (error) {
                    throw error;
                }

                resolver.getDSUHandler(keySSI).writeFile("old-name", "dummy-content", (error, result) => {
                    if (error) {
                        throw error;
                    }

                    resolver.getDSUHandler(keySSI).listFiles("/", (error, filesAfterWrite) => {
                        if (error) {
                            throw error;
                        }

                        resolver.getDSUHandler(keySSI).rename("old-name", "new-name", (error, result) => {
                            if (error) {
                                throw error;
                            }

                            assert.true(isHashLinkSSI(result), "expected result to be a HashLinkSSI");

                            resolver.getDSUHandler(keySSI).listFiles("/", (error, finalFiles) => {
                                if (error) {
                                    throw error;
                                }

                                assert.true(initialFiles.indexOf("old-name") === -1);
                                assert.true(initialFiles.indexOf("new-name") === -1);

                                assert.true(filesAfterWrite.indexOf("old-name") !== -1);
                                assert.true(filesAfterWrite.indexOf("new-name") === -1);

                                assert.true(finalFiles.indexOf("old-name") === -1);
                                assert.true(finalFiles.indexOf("new-name") !== -1);

                                testFinished();
                            });
                        });
                    });
                });
            });
        });
    },
    10000
);
