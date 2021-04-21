require("../../../../../psknode/bundles/testsRuntime");

const dc = require("double-check");
const assert = dc.assert;

const { testHandlerMethod } = require("./utils");

assert.callback(
    "getHandler listFiles",
    (testFinished) => {
        testHandlerMethod(
            { handlerMethod: "listFiles", handlerMethodArgs: ["/"] },
            (handlerResponse, loadedDSUResponse) => {
                assert.arraysMatch(handlerResponse, loadedDSUResponse);
                testFinished();
            }
        );
    },
    10000
);

assert.callback(
    "getHandler listFolders",
    (testFinished) => {
        testHandlerMethod(
            { handlerMethod: "listFiles", handlerMethodArgs: ["/"] },
            (handlerResponse, loadedDSUResponse) => {
                assert.arraysMatch(handlerResponse, loadedDSUResponse);
                testFinished();
            }
        );
    },
    10000
);

assert.callback(
    "getHandler readFile",
    (testFinished) => {
        testHandlerMethod(
            {
                handlerMethod: "readFile",
                handlerMethodArgs: ["dummy.txt"],
                onCreatedDSU: (dsu, callback) => {
                    dsu.writeFile("dummy.txt", "dummy-content", (err, result) => {
                        if (err) {
                            throw err;
                        }

                        callback();
                    });
                },
            },
            (handlerResponse, loadedDSUResponse) => {
                assert.equal(handlerResponse.toString(), loadedDSUResponse.toString());
                testFinished();
            }
        );
    },
    10000
);

assert.callback(
    "getHandler readDir",
    (testFinished) => {
        testHandlerMethod(
            {
                handlerMethod: "readDir",
                handlerMethodArgs: ["/"],
            },
            (handlerResponse, loadedDSUResponse) => {
                assert.arraysMatch([handlerResponse], [loadedDSUResponse]);
                testFinished();
            }
        );
    },
    10000
);

assert.callback(
    "getHandler listMountedDSUs",
    (testFinished) => {
        testHandlerMethod(
            { handlerMethod: "listMountedDSUs", handlerMethodArgs: ["/"] },
            (handlerResponse, loadedDSUResponse) => {
                assert.arraysMatch(handlerResponse, loadedDSUResponse);
                testFinished();
            }
        );
    },
    10000
);
