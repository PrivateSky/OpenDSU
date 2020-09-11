/*
KeySSI Notification API space
*/

let http = require("../index").loadApi("http");
let bdns = require("../index").loadApi("bdns");

function publish(keySSI, message, callback){
	bdns.getNotificationEndpoints(keySSI, (err, endpoints) => {
		if(err || endpoints.length === 0){
			return callback(new Error("Not available!"));
		}

		let url = endpoints[0]+`/notifications/publish/${keySSI}`;
		let options = {body: message};

		let request = http.poll(url, options, timeout);

		request.then((response)=>{
			callback(undefined, response);
		}).catch((err)=>{
			callback(err);
		});
	});
}

let requests = {};
function getObservableHandler(keySSI, timeout){
	let obs = require("../utils/observable").createObservable();
	bdns.getNotificationEndpoints(keySSI, (err, endpoints) => {
		if(err || endpoints.length === 0){
			return callback(new Error("Not available!"));
		}

		function makeRequest(){
			let url = endpoints[0] + `/notifications/subscribe/${keySSI}`;
			let options = {};
			let request = http.poll(url, options, timeout);

			request.then((response) => {
				obs.dispatch("message", response);
				makeRequest();
			}).catch((err) => {
				obs.dispatch("error", err);
			});

			requests[obs] = request;
		}

		makeRequest();
	});
	return obs;
}

function unsubscribe(keySSI, observable){
	http.unpoll(requests[observable]);
}

module.exports = {
	publish,
	getObservableHandler,
	unsubscribe
}