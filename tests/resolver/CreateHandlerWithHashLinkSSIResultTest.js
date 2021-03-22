require("../../../../psknode/bundles/testsRuntime");

const dc = require("double-check");
const assert = dc.assert;

const resolver = require("../../resolver");
const { createTestFolderWithDSU } = require("./dsu-handler-utils");

assert.callback(
    "getHandler writeFile",
    (testFinished) => {
        createTestFolderWithDSU("dsu", (keySSI, dsu) => {
            resolver.getDSUHandler(keySSI).writeFile("dummy", "dummy-content", (error, result) => {
                if (error) {
                    throw error;
                }

                assert.true(result && result.constructor && result.constructor.name === "HashLinkSSI");

                testFinished();
            });
        });
    },
    10000
);

assert.callback(
    "getHandler rename",
    (testFinished) => {
        createTestFolderWithDSU("dsu", (keySSI, dsu) => {
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

                            assert.true(result && result.constructor && result.constructor.name === "HashLinkSSI");

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

assert.callback(
    "getHandler createFolder",
    (testFinished) => {
        createTestFolderWithDSU("dsu1", (keySSI, dsu) => {
            resolver.getDSUHandler(keySSI).listFolders("/", (error, initialFolders) => {
                if (error) {
                    throw error;
                }

                resolver.getDSUHandler(keySSI).createFolder("/dummy", (error, result) => {
                    if (error) {
                        throw error;
                    }

                    assert.true(result && result.constructor && result.constructor.name === "HashLinkSSI");

                    resolver.getDSUHandler(keySSI).listFolders("/", (error, finalFolders) => {
                        if (error) {
                            throw error;
                        }

                        assert.true(initialFolders.indexOf("dummy") === -1);
                        assert.true(finalFolders.indexOf("dummy") !== -1);

                        testFinished();
                    });
                });
            });
        });
    },
    10000
);

assert.callback(
    "getHandler appendToFile",
    (testFinished) => {
        createTestFolderWithDSU("dsu1", (keySSI, dsu) => {
            resolver.getDSUHandler(keySSI).writeFile("dummy", "dummy-content", (error, initialFolders) => {
                if (error) {
                    throw error;
                }

                resolver.getDSUHandler(keySSI).readFile("/dummy", (error, initialResult) => {
                    if (error) {
                        throw error;
                    }

                    resolver.getDSUHandler(keySSI).appendToFile("/dummy", ":new-content", (error, result) => {
                        if (error) {
                            throw error;
                        }

                        assert.true(result && result.constructor && result.constructor.name === "HashLinkSSI");

                        resolver.getDSUHandler(keySSI).readFile("/dummy", (error, finalResult) => {
                            if (error) {
                                throw error;
                            }

                            assert.true(initialResult.toString() === "dummy-content");
                            assert.true(finalResult.toString() === "dummy-content:new-content");

                            testFinished();
                        });
                    });
                });
            });
        });
    },
    10000
);
