module.exports.createObservable = function(){
	let observableMixin = require("./ObservableMixin");
	let obs = {};

	observableMixin(obs);
	return obs;
}