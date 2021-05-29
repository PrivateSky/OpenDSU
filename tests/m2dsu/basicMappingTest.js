require("../../../../psknode/bundles/testsRuntime");

const tir = require("../../../../psknode/tests/util/tir");
const dc = require("double-check");
const assert = dc.assert;

assert.callback('basicMappingTest', (testFinished) => {

	tir.launchVirtualMQNode(async function (err, port) {
		if (err) {
			throw err;
		}

		const m2dsu = require("opendsu").loadApi("m2dsu");
		const persistenceDSU = await $$.promisify(require("opendsu").loadApi("resolver").createSeedDSU)("default");
		//persistenceDSU should be an instance of storageService which uses a DB
		const mappingEngine = m2dsu.getMappingEngine(persistenceDSU);

		//this function tell if the mapping function can be applied
		const decisionFN = (message)=>{
			return true;
		};

		let keySSI;
		const filePath = "/data.txt";
		const fileContent = "just some date to be written into the file";

		//the function that will be called in order to execute the mapping
		const mapping = async function (message) {
			let dsu = await this.createDSU("test1", "seed");
			const getKeySSI = dsu.getKeySSIAsString;
			keySSI = await getKeySSI();
			console.log("DSU built has the keySSI", keySSI);

			await dsu.writeFile(filePath, fileContent);

			console.log(`Wrote file ${filePath} into the DSU`);
		}

		//we define a custom message mapping
		m2dsu.defineMapping(decisionFN, mapping);

		mappingEngine.digestMessages({}).then(async failedMessages=>{
			const loadDSU = $$.promisify(require("opendsu").loadApi("resolver").loadDSU);
			const secondDSUInstance = await loadDSU(keySSI);

			const readFile = $$.promisify(secondDSUInstance.readFile);
			const content = await readFile(filePath);
			assert.equal(content.toString(), fileContent);
			assert.equal(failedMessages.length, 0);

			console.log("All good!");
			testFinished();
		}).catch(err=>{
			throw err;
		});
	});

}, 15000);