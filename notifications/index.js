/*
KeySSI Notification API space
*/

let http = require("../index").loadApi("http");
let bdns = require("../index").loadApi("bdns");

function publish(keySSI, message, timeout, callback){
	if (typeof timeout === 'function') {
		callback = timeout;
		timeout = 0;
	}
	bdns.getNotificationEndpoints(keySSI.getDLDomain(), (err, endpoints) => {
		if (err) {
			throw new Error(err);
		}

		if (!endpoints.length) {
			throw new Error("Not available!");
		}

		let url = endpoints[0]+`/notifications/publish/${keySSI.getAnchorId()}`;
        let options = {body: message, method: 'PUT'};

		let request = http.poll(url, options, timeout);

		request.then((response)=>{
			callback(undefined, response);
		}).catch((err)=>{
			return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to publish message`, err));
		});
    });
}

let requests = new Map();
function getObservableHandler(keySSI, timeout){
	timeout = timeout || 0;
	let obs = require("../utils/observable").createObservable();

	bdns.getNotificationEndpoints(keySSI.getDLDomain(), (err, endpoints) => {
		if (err) {
			throw new Error(err);
		}

		if (!endpoints.length) {
			throw new Error("Not available!");
		}

		function makeRequest(){
			let url = endpoints[0] + `/notifications/subscribe/${keySSI.getAnchorId()}`;
			let options = {
				method: 'POST'
			};
			let request = http.poll(url, options, timeout);

			request.then((response) => {
				obs.dispatchEvent("message", response);

				// If a subscription still exists, continue polling for messages
				if (requests.has(obs)) {
					makeRequest();
				}
			}).catch((err) => {
				obs.dispatchEvent("error", err);
			});

			requests.set(obs, request);
		}

		makeRequest();
	})

	return obs;
}

function unsubscribe(observable){
	const request = requests.get(observable);
	if (!request) {
		return;
	}
	http.unpoll(request);
	requests.delete(observable);
}

function isSubscribed(observable) {
	return requests.has(observable);
}

module.exports = {
	publish,
	getObservableHandler,
	unsubscribe,
	isSubscribed
}
