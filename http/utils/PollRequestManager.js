function PollRequestManager(fetchFunction, pollingTimeout = 1000){

	const requests = new Map();

	function Request(url, options, delay = 0) {
		let promiseHandlers = {};
		let currentState = undefined;
		let timeout;
		this.url = url;

		this.execute = function() {
			if (!currentState && delay) {
				currentState = new Promise((resolve, reject) => {
					timeout = setTimeout(() => {
						fetchFunction(url, options).then((response) => {
							resolve(response);
						}).catch((err) => {
							reject(err);
						})
					}, delay);
				});
			} else {
				currentState = fetchFunction(url, options);
			}
			return currentState;
		}

		this.cancelExecution = function() {
			clearTimeout(timeout);
			timeout = undefined;
			if(typeof currentState !== "undefined"){
				currentState = undefined;
			}
			promiseHandlers.resolve = () => {};
			promiseHandlers.reject = () => {};
		}

		this.setExecutor = function(resolve, reject) {
			promiseHandlers.resolve = resolve;
			promiseHandlers.reject = reject;
		}

		this.resolve = async function(...args) {
			promiseHandlers.resolve(...args);
			this.destroy();
		}

		this.reject = function(...args) {
			promiseHandlers.reject(...args);
			this.destroy();
		}

		this.destroy = function(removeFromPool = true) {
			this.cancelExecution();

			if (!removeFromPool) {
				return;
			}

			// Find our identifier
			const requestsEntries = requests.entries()
			let identifier;
			for (const [key, value] of requestsEntries) {
				if (value === this) {
					identifier = key;
					break;
				}
			}

			if (identifier) {
				requests.delete(identifier);
			}
		}
	}

	this.createRequest = function (url, options, delayedStart = 0) {
		const request = new Request(url, options, delayedStart);

		const promise = new Promise((resolve, reject) => {
			request.setExecutor(resolve, reject);
			createPollThread(request);
		});
		promise.abort = () => {
			this.cancelRequest(promise);
		};

		requests.set(promise, request);
		return promise;
	};

	this.cancelRequest = function(promiseOfRequest){
		if(typeof promiseOfRequest === "undefined"){
			console.log("No active request found.");
			return;
		}

		const request = requests.get(promiseOfRequest);
		if (request) {
			request.destroy(false);
			requests.delete(promiseOfRequest);
		}
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
