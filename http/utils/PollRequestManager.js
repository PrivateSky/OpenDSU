function PollRequestManager(fetchFunction, pollingTimeout = 1000){

	const requests = new Map();

	function Request(url, options, delayedStart) {
		let self = this;

		let promiseHandlers = {};
		let currentState = undefined;
		this.execute = function(){
			//if there is a delayedStart and it's the first time when the request is executed
			if(delayedStart && typeof currentState === "undefined"){
				return new Promise((resolve, reject) => {
					setTimeout(function(){
						currentState = fetchFunction(url, options);
						currentState.then(resolve).catch(reject);
					}, delayedStart);
				})
			}else{
				currentState = fetchFunction(url, options);
			}

			return currentState;
		}

		this.cancelExecution = function(){
			if(typeof this.currentState !== "undefined"){
				this.currentState = undefined;
			}
			promiseHandlers.resolve = () => {};
			promiseHandlers.reject = () => {};
		}

		this.setExecutor = function(resolve, reject){
			promiseHandlers.resolve = resolve;
			promiseHandlers.reject = reject;
		}

		this.resolve = function(...args){
			promiseHandlers.resolve(...args);
			this.destroy();
		}

		this.reject = function(...args){
			promiseHandlers.reject(...args);
			this.destroy();
		}

		this.destroy = function(identifier){
			this.cancelExecution();

			if (!identifier) {
				// Find our identifier
				const requestsEntries = requests.entries()
				for (const [key, value] of requestsEntries) {
					if (value === this) {
						identifier = key;
						break;
					}
				}
			}
			requests.delete(identifier);
			console.log(requests.size);
		}
	}

	this.createRequest = function (url, options, delayedStart=0) {
		let request = new Request(url, options, delayedStart);

		let promise = new Promise((resolve, reject) => {

			request.setExecutor(resolve, reject);

			if(delayedStart){
				setTimeout(function(){
					createPollThread(request);
				}, delayedStart);
			}else{
				createPollThread(request);
			}
		});

		requests.set(promise, request);
		promise.abort = () => {
			this.cancelRequest(request);
		};

		return promise;
	};

	this.cancelRequest = function(request){
		if(typeof request === "undefined"){
			console.log("No active request found.");
			return;
		}
		request.destroy();
	}


	/* *************************** polling zone ****************************/
	function createPollThread(request) {
		function reArm() {
			request.execute().then( (response) => {
				if (!response.ok) {
					//todo check for http errors like 404
					return setTimeout(reArm, pollingTimeout);
				}
				request.resolve(response);
			}).catch( (err) => {
				switch(err.code){
					case "ETIMEDOUT":
						setTimeout(reArm, pollingTimeout);
						break;
					case "ECONNREFUSED":
						setTimeout(reArm, pollingTimeout*1.5);
						break;
					default:
						request.reject(err);
				}
			});
		}

		reArm();
	}

}

module.exports = PollRequestManager;
