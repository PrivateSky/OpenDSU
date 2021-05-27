const registry = require("../apisRegistry");

/*
* based on jsonIndications Object {attributeName1: "DSU_file_path", attributeName2: "DSU_file_path"}
* the this of the mapping will be populated with the data extracted from the DSU
* */
registry.defineApi("loadJSONS", async function (dsu, jsonIndications) {
	for (let prop in jsonIndications) {
		let data = await dsu.readFile(jsonIndications[prop]);
		this[prop] = JSON.parse(data);
	}
});

/*
* based on jsonIndications Object {attributeName1: "DSU_file_path", attributeName2: "DSU_file_path"}
* the data from the this of the mapping will be saved into the DSU
* */
registry.defineApi("saveJSONS", async function (dsu, jsonIndications) {
	for (let prop in jsonIndications) {
		let data = JSON.stringify(this[prop]);
		await dsu.writeFile(jsonIndications[prop], data);
	}
});

function promisifyDSUAPIs(dsu) {
	//this API method list will be promisify on the fly with the help of the registerDSU method and a Proxy over DSU instance
	const promisifyAPIs = [
		"addFile",
		"addFiles",
		"addFolder",
		"appendToFile",
		"batch",
		"beginBatch",
		"cancelBatch",
		"cloneFolder",
		"commitBatch",
		"createFolder",
		"delete",
		"dsuLog",
		"extractFile",
		"extractFolder",
		"getKeySSI",
		"getKeySSIAsObject",
		"getKeySSIAsString",
		"getSSIForMount",
		"init",
		"listFiles",
		"listFolders",
		"listMountedDossiers",
		"load",
		"mount",
		"readDir",
		"readFile",
		"rename",
		"stat",
		"unmount",
		"writeFile",
		"listMountedDSUs",
		"refresh"
	];

	const promisifyHandler = {
		get: function (target, prop, receiver) {
			if (promisifyAPIs.indexOf(prop) !== -1) {
				return $$.promisify(target[prop]);
			}
			return target[prop];
		}
	};

	//we create a proxy over the normal DSU / Archive instance
	//in order to promisify on the fly the public API to be easier to work with in the mapping functions
	return new Proxy(dsu, promisifyHandler);
}

//all DSUs that are created with different exposed APIs need to be registered
// in order to control the batch operations and promisify the API on them
registry.defineApi("registerDSU", function (dsu) {
	if (typeof dsu === "undefined" || typeof dsu.beginBatch !== "function") {
		throw Error("registerDSU needs a DSU instance");
	}
	if (typeof this.registeredDSUs === "undefined") {
		this.registeredDSUs = [];
	}

	this.registeredDSUs.push(dsu);
	dsu.beginBatch();

	return promisifyDSUAPIs(dsu);
});

registry.defineApi("loadConstDSU", async function (domain, arr) {
	const opendsu = require("opendsu");
	const resolver = this.getResolver();
	const keySSISpace = opendsu.loadApi("keyssi");

	const keySSI = keySSISpace.createArraySSI(domain, arr);
	let dsu = await resolver.loadDSU(keySSI);
	if (dsu) {
		//take note that this.registerDSU returns a Proxy Object over the DSU and this Proxy we need to return also
		return {dsu: this.registerDSU(dsu), alreadyExists: true};
	}

	dsu = await resolver.createArrayDSU(domain, arr);
	//take note that this.registerDSU returns a Proxy Object over the DSU and this Proxy we need to return also
	return {dsu: this.registerDSU(dsu), alreadyExists: false};
});

registry.defineApi("createDSU", async function (domain, ssiType, options) {
	let dsu = await this.getResolver().createDSUx(domain, ssiType, options);
	//take note that this.registerDSU returns a Proxy Object over the DSU and this Proxy we need to return also
	return this.registerDSU(dsu);
});

//an api that returns an OpenDSU Resolver instance that has promisified methods
// to be used in mappings easier
registry.defineApi("getResolver", function (domain, ssiType, options) {
	const promisify = ["createDSU",
		"createDSUx",
		"createSeedDSU",
		"createArrayDSU",
		"createDSUForExistingSSI",
		"loadDSU"];

	const resolver = require("opendsu").loadApi("resolver");
	for(let i=0; i<promisify.length; i++){
		resolver[promisify[i]] = $$.promisify(resolver[promisify[i]]);
	}

	return resolver;
});

