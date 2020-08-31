/*
	http API space
*/

const or = require('overwrite-require');

let fetch;
switch($$.environmentType){
	case or.constants.BROWSER_ENVIRONMENT_TYPE:
	case or.constants.SERVICE_WORKER_ENVIRONMENT_TYPE:
		fetch = require("./browser").fetch;
		break;
	default:
		fetch = require("./node").fetch;
}

module.exports = {
	fetch: fetch,
	poll: function(url, options, timeout){

		throw new Error("Not implemented yet!");

		/*let RequestManager = require("./utils/RequestManager");
		const rm = new RequestManager(timeout);
		const request = rm.createRequest(url, options);

		return request;*/
	}
};