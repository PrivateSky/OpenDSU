require("../../../../psknode/bundles/testsRuntime");
const testIntegration = require("../../../../psknode/tests/util/tir");
const path = require("path");

async function launchApiHubTestNodeWithContractAsync() {
    return testIntegration.launchApiHubTestNodeWithContractAsync(path.resolve(__dirname, "bin/build.file"));
}

module.exports = {
    launchApiHubTestNodeWithContractAsync,
};
