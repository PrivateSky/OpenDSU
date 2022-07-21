function PollRequestManager(fetchFunction,  connectionTimeout = 10000, pollingTimeout = 1000){

	const requests = new Map();

	function Request(url, options, delay = 0) {
		let promiseHandlers = {};
		let currentState = undefined;
		let timeout;
		this.url = url;
		let abortController;
		let previousAbortController;

		this.execute = function() {
			if (typeof AbortController !== "undefined") {
				previousAbortController = abortController;
				abortController = new AbortController();
				options.signal = abortController.signal;
			}
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

		this.resolve = function(...args) {
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

		this.abort = () => {
            if (typeof previousAbortController !== "undefined") {
				previousAbortController.abort();
            }
		}
	}

	this.createRequest = function (url, options, delayedStart = 0) {
		const request = new Request(url, options, delayedStart);

		const promise = new Promise((resolve, reject) => {
			request.setExecutor(resolve, reject);
			createPollingTask(request);
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

	this.setConnectionTimeout = (_connectionTimeout)=>{
		connectionTimeout = _connectionTimeout;
	}

	/* *************************** polling zone ****************************/
	function createPollingTask(request) {
		let safePeriodTimeoutHandler;
		let serverResponded = false;
		let receivedError = false;

		/**
		 * default connection timeout in api-hub is @connectionTimeout
		 * we wait double the time before aborting the request
		 */
		function beginSafePeriod() {
			safePeriodTimeoutHandler = setTimeout(() => {
				if (!serverResponded && !receivedError) {
					request.abort();
				}
				serverResponded = false;
				receivedError = false;
				beginSafePeriod()
			}, connectionTimeout * 2);

			reArm();
		}

		function endSafePeriod() {
			clearTimeout(safePeriodTimeoutHandler);
		}

		function reArm() {
			request.execute().then( (response) => {
				if (!response.ok) {
					//todo check for http errors like 404
					return beginSafePeriod();
				}

				if (response.status === 204) {
					serverResponded = true;
					receivedError = false;
					endSafePeriod();
					beginSafePeriod();
					return;
				}

				if (safePeriodTimeoutHandler) {
					clearTimeout(safePeriodTimeoutHandler);
				}

				request.resolve(response);
			}).catch( (err) => {
				switch(err.code){
					case "ETIMEDOUT":
					case "ECONNREFUSED":
						receivedError = true;
						endSafePeriod();
						beginSafePeriod();
						break;
					case 20:
						break;
					default:
						request.reject(err);
				}
			});

		}

		beginSafePeriod();
	}

}

module.exports = PollRequestManager;
