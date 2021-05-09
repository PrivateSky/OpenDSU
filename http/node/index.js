const http = require("http");
const https = require("https");
const URL = require("url");

const userAgent = 'PSK NodeAgent/0.0.1';
const signatureHeaderName = process.env.vmq_signature_header_name || "x-signature";

function getNetworkForOptions(options) {
	if(options.protocol === 'http:') {
		return http;
	} else if(options.protocol === 'https:') {
		return https;
	} else {
		throw new Error(`Can't handle protocol ${options.protocol}`);
	}

}

function generateMethodForRequestWithData(httpMethod) {
	return function (url, data, reqOptions, callback) {
		if(typeof reqOptions === "function"){
			callback = reqOptions;
			reqOptions = {};
		}
		const innerUrl = URL.parse(url);

		const options = {
			hostname: innerUrl.hostname,
			path: innerUrl.pathname,
			port: parseInt(innerUrl.port),
			headers: {
				'User-Agent': userAgent,
				[signatureHeaderName]: 'replaceThisPlaceholderSignature'
			},
			method: httpMethod
		};

		for(let name in reqOptions.headers){
			options.headers[name] = reqOptions.headers[name];
		}

		const network = getNetworkForOptions(innerUrl);

		if (ArrayBuffer.isView(data) || $$.Buffer.isBuffer(data) || data instanceof ArrayBuffer) {
			if (!$$.Buffer.isBuffer(data)) {
				data = $$.Buffer.from(data);
			}

			options.headers['Content-Type'] = 'application/octet-stream';
			options.headers['Content-Length'] = data.length;
		}

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
							response = JSON.parse(rawData);
						} catch (error) {
							console.log('parse error', error);
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

		req.write(data);
		req.end();
	};
}

module.exports = {
	fetch: require("./fetch").fetch,
	doPost: generateMethodForRequestWithData('POST'),
	doPut: generateMethodForRequestWithData('PUT')
}