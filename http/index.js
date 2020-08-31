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

const PollRequestManager = require("./utils/PollRequestManager");
const rm = new PollRequestManager(fetch);

module.exports = {
	fetch: fetch,
	poll: function(url, options, delayStart){
		const request = rm.createRequest(url, options, delayStart);
		return request;
	}
};