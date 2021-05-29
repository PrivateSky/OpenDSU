const mappingRegistry = [];
function defineMapping(matchFunction, mappingFunction){
	mappingRegistry.push({matchFunction, mappingFunction});
}

function getMappings(){
	return mappingRegistry;
}

module.exports = {
	defineMapping,
	getMappings
}