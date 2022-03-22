require("../../../../psknode/bundles/testsRuntime");
const tir = require("../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;
const openDSU = require('../../index');
$$.__registerModule("opendsu", openDSU);
const dt = openDSU.loadAPI("dt");
const resolver = openDSU.loadAPI("resolver");

assert.callback('Build DSU test', (testFinished) => {

    dc.createTestFolder('buildDSU', async (err, folder) => {
        const vaultDomainConfig = {
            "anchoring": {
                "type": "FS",
                "option": {}
            }
        }
        const getCommands = function(data){
            if (!data)
                return [];
            return data.split(/\r?\n/).filter(cmd => !!cmd.trim());
        };

        await tir.launchConfigurableApiHubTestNodeAsync({domains: [{name: "vault", config: vaultDomainConfig}]});
        const dossierBuilder = await $$.promisify(dt.getDossierBuilder)();
        const path = require("path");
        const fs = require("fs");
        fs.mkdirSync("code", {recursive: true});
        fs.writeFileSync(path.join("code", "file"), "some data");
        const commandData = "delete /\naddfolder code\n";
        const bundlesPath = "./../../../../psknode/bundles";
        const config = {
            "seed": path.join(folder, "seed"),
            "domain": "vault",
            "bundles": bundlesPath
        }
        const commands = getCommands(commandData);
        const data = await $$.promisify(dossierBuilder.buildDossier)(config, commands);
        const dsu = await $$.promisify(resolver.loadDSU)(data);
        let fileData = await $$.promisify(dsu.readFile)("/file");
        assert.true(fileData.toString() === "some data");
        testFinished();
    });
}, 50000);

