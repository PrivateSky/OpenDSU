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
		const mappingEngine = m2dsu.getMappingEngine(persistenceDSU);

		const decisionFN = (message)=>{
			return true;
		};

		let keySSI;
		const filePath = "/data.txt";
		const fileContent = "just some date to be written into the file";

		const mapping = async function (message) {
			let dsu = await this.createDSU("default", "seed");

			const getKeySSI = dsu.getKeySSIAsString;
			keySSI = await getKeySSI();
			console.log("DSU built has the keySSI", keySSI);

			await dsu.writeFile(filePath, fileContent);

			console.log(`Wrote file ${filePath} into the DSU`);
		}

		m2dsu.defineMapping(decisionFN, mapping);

		mappingEngine.digestMessages([{}]).then(async res=>{
			const loadDSU = $$.promisify(require("opendsu").loadApi("resolver").loadDSU);
			const secondDSUInstance = await loadDSU(keySSI);

			const readFile = $$.promisify(secondDSUInstance.readFile);
			const content = await readFile(filePath);
			console.log(content.toString());

			console.log("All good!");
			testFinished();
		}).catch(err=>{
			throw err;
		});
	});

}, 15000);