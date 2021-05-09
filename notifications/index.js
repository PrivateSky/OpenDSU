/*
KeySSI Notification API space
*/

let http = require("../index").loadApi("http");
let bdns = require("../index").loadApi("bdns");

function publish(keySSI, message, timeout, callback){
    bdns.getRawInfo(keySSI.getDLDomain(), (err, info) => {
        if (err) {
            throw new Error(err);
        }

        const endpoints = info.notifications || [];

        if (endpoints.length === 0) {
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

let requests = {};
function getObservableHandler(keySSI, timeout){
	let obs = require("../utils/observable").createObservable();

    bdns.getRawInfo(keySSI.getDLDomain(), (err, info) => {
        if (err) {
            throw new Error(err);
        }

        const endpoints = info.notifications || [];

        if (endpoints.length === 0) {
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
                makeRequest();
            }).catch((err) => {
                obs.dispatchEvent("error", err);
            });

            requests[obs] = request;
        }

        makeRequest();
    })

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
