const registry = require("../apisRegistry");

/*
*  jsonIndications Object {attributeName1: "DSU_file_path", attributeName2: "DSU_file_path"}
*
* */
registry.defineApi("loadJSONS", async function(dsu, jsonIndications){
	for(let prop in jsonIndications){
		let data = await dsu.readFile(jsonIndications[prop]);
		this[prop] = JSON.parse(data);
	}
});

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

function promisifyDSUAPIs(dsu){
	const promisifyHandler = {
		get: function(target, prop, receiver) {
			if(promisifyAPIs.indexOf(prop) !==-1 ){
				return $$.promisify(target[prop]);
			}
			return target[prop];
		}
	};

	return new Proxy(dsu, promisifyHandler);
}

//all DSUs that are created with different exposed APIs need to be registered in order to control the batch operations on them
registry.defineApi("registerDSU", function(dsu){
	if(typeof dsu === "undefined" || typeof dsu.beginBatch !== "function"){
		throw Error("registerDSU needs a DSU instance");
	}
	if(typeof this.registeredDSUs === "undefined"){
		this.registeredDSUs = [];
	}

	this.registeredDSUs.push(dsu);
	dsu.beginBatch();

	return promisifyDSUAPIs(dsu);
});

registry.defineApi("loadConstDSU", async function(domain, arr){
	const opendsu = require("opendsu");
	const resolver = opendsu.loadApi("resolver");
	const keySSISpace = opendsu.loadApi("keyssi");

	const keySSI = keySSISpace.createArraySSI(domain, arr);
	const loadDSU = $$.promisify(resolver.loadDSU);
	let dsu = await loadDSU(keySSI);
	if(dsu){
		return {dsu:this.registerDSU(dsu), alreadyExists: true};
	}

	const createConstDSU = $$.promisify(resolver.createArrayDSU);
	dsu = await createConstDSU(domain, arr);
	return {dsu:this.registerDSU(dsu), alreadyExists: false};
});

registry.defineApi("createDSU", async function(domain, ssiType, options){
	const opendsu = require("opendsu");
	const resolver = opendsu.loadApi("resolver");

	createDSU = $$.promisify(resolver.createDSUx);
	let dsu = await createDSU(domain, ssiType, options);
	return this.registerDSU(dsu);
});

