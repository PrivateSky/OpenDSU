const apis = {};
function defineApi(name, implementation){
	if(typeof implementation !== "function"){
		throw Error("second argument of the defineApi should be a function that will represent the implementation for that api");
	}
	apis[name] = implementation;
}

function getApis(){
	return apis;
}

module.exports = {defineApi, getApis}