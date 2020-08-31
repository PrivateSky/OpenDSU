function PollRequestManager(fetchFunction, pollingTimeout = 1000){

	const requests = {};

	function Request(url, options, delayedStart) {
		let self = this;

		let currentState = undefined;
		this.execute = function(){
			//if there is a delayedStart and it's the first time when the request is executed
			if(delayedStart && typeof currentState === "undefined"){
				setTimeout(function(){
					currentState = fetchFunction(url, options);
				}, delayedStart);
			}else{
				currentState = fetchFunction(url, options);
			}

			return currentState;
		}

		this.cancelExecution = function(){
			if(typeof this.currentState !== "undefined"){
				this.currentState = undefined;
			}
			this.resolve = ()=>{};
			this.reject = ()=>{};
		}

		let promiseHandlers = {};
		this.setExecutor = function(resolve, reject){
			promiseHandlers.resolve = resolve;
			promiseHandlers.reject = reject;
		}

		this.resolve = function(...args){
			this.destroy();
			promiseHandlers.resolve(...args);
		}

		this.reject = function(...args){
			this.destroy();
			promiseHandlers.reject(...args);
		}

		this.destroy = function(identifier){
			this.cancelExecution();

			requests[identifier] = undefined;
			delete requests[identifier];
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

		requests[promise] = request;
		promise.abort = () => {
			this.cancelRequest(promise);
		};

		return promise;
	};

	this.cancelRequest = function(promiseHandler){
		let request = requests[promiseHandler];
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