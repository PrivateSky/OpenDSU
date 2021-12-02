const tir = require("../../../psknode/tests/util/tir");

const openDSU = require("../index");
$$.__registerModule("opendsu", openDSU);

//load db API from "opendsu"
const dbAPI = openDSU.loadAPI("db");

const DOMAIN_CONFIG = {
    enable: ["mq"]
};

const domain = "default";

//launching apihub with a custom configuration for "default" domain; "mq" component is enabled
tir.launchConfigurableApiHubTestNode({
    domains: [{
        name: domain,
        config: DOMAIN_CONFIG
    }]
}, async err => {
    if (err) {
        throw err;
    }

    let enclave;
    try{
        enclave = await $$.promisify(dbAPI.getMainEnclave)();
    }catch (e) {
        return console.log(e);
    }

    let dsuInstance;
    let loadedDSUInstance;
    try {
        //create instances of NameDID_Document for sender and receiver entities
        dsuInstance = await $$.promisify(enclave.createSeedDSU)("default");
        await $$.promisify(dsuInstance.writeFile)("someFile", "someContent")
        const keySSI = await $$.promisify(dsuInstance.getKeySSIAsString)();
        console.log(keySSI);
        loadedDSUInstance = await $$.promisify(enclave.loadDSU)(keySSI);
        const readContent = await $$.promisify(loadedDSUInstance.readFile)("someFile");
        console.log(readContent.toString());
    } catch (e) {
        return console.log(e);
    }
});

