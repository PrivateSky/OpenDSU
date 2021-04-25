require("../../../../../psknode/bundles/testsRuntime");

const dc = require("double-check");
const assert = dc.assert;

const { testHandlerMethod } = require("./utils");

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
