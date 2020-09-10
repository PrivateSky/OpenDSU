function Observable(){
	let handlers = {};

	this.dispatch = function(eventName, data){
		if(typeof handlers[eventName] === "undefined"){
			//no handlers registered
			return;
		}
		let subscribers = handlers[eventName];
		subscribers.forEach((subscriber)=>{
			try{
				subscriber(data);
			}catch(err){
				// what to do if we get an error?!
			}
		});
	}

	this.on = function(eventName, callback){
		if(typeof handlers[eventName] === "undefined"){
			handlers[eventName] = [];
		}
		handlers[eventName].push(callback);
	}

	this.off = function(eventName, callback){
		if(typeof handlers[eventName] === "undefined" || !Array.isArray(handlers[eventName])){
			//nothing to do...
			return;
		}
		let index = handlers[eventName].indexOf(callback);
		if(index === -1){
			return;
		}

		handlers[eventName].splice(index, 1);
	}
}

module.exports.createObservable = function(){
	return new Observable();
}