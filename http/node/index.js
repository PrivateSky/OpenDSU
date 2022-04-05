
const {setContentTypeByData,buildOptions,getNetworkForOptions} = require("./common.js");

function generateMethodForRequestWithData(httpMethod) {
	return function (url, data, reqOptions, callback) {
		if(typeof reqOptions === "function"){
			callback = reqOptions;
			reqOptions = {};
		}

		const options = buildOptions(url, httpMethod, reqOptions);
		const network = getNetworkForOptions(options);

		setContentTypeByData(options, data);

		const req = network.request(options, (res) => {
			const {statusCode} = res;

			let error;
			if (statusCode >= 400) {
				error = new Error('Request Failed.\n' +
					`Status Code: ${statusCode}\n` +
					`URL: ${options.hostname}:${options.port}${options.path}`);
			}

			let rawData = '';
			res.on('data', (chunk) => {
				rawData += chunk;
			});
			res.on('end', () => {
				try {
					if (error) {
						let response = rawData;
						try {
							response = response !== '' ? JSON.parse(rawData) : response;
						} catch (e) {
							console.log("Caught an error during JSON.parse", rawData);
							console.log('May or not be important, for safety check it! Failed to parse the error from the response due to', e);
							// the received response is not a JSON, so we keep it as it is
						}

						const message = response.message ? response.message : response;
						callback({error: error, statusCode: statusCode, message: message});
						return;
					}

					callback(undefined, rawData, res.headers);
				} catch (err) {
					console.error(err);
				}finally {
					//trying to prevent getting ECONNRESET error after getting our response
					req.abort();
				}
			});
		}).on("error", (error) => {
			console.log(`[POST] ${url}`, error);
			callback(error);
		});

		if (data && data.pipe && typeof data.pipe === "function") {
			data.pipe(req);
			return;
		}

		if (typeof data !== 'string' && !$$.Buffer.isBuffer(data) && !ArrayBuffer.isView(data)) {
			data = JSON.stringify(data);
		}

		if(data){
			req.write(data);
		}
		req.end();
	};
}

function doGet(url, options, callback) {
	let fnc = generateMethodForRequestWithData('GET');
	return fnc(url, undefined, options, callback);
}

module.exports = {
	fetch: require("./fetch").fetch,
	doGet,
	doPost: generateMethodForRequestWithData('POST'),
	doPut: generateMethodForRequestWithData('PUT')
}
