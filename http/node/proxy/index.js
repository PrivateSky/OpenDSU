const {setContentTypeByData,buildOptions,getNetworkForOptions} = require("../common");

function generateMethodForRequestViaProxy(httpMethod) {
	return function (proxyUrl, url, data, opts, callback) {
		console.log("Received Proxy:", proxyUrl);
		console.log("Targeting URL:", url);

		const options = buildOptions(url, httpMethod, opts);

		setContentTypeByData(options, data);

		const proxyUrlObject = buildOptions(proxyUrl);
		const network = getNetworkForOptions(proxyUrlObject);

		const proxyPath = `${proxyUrlObject.hostname}:${proxyUrlObject.port}`;
		const proxyOpts = {
			host: proxyUrlObject.hostname,
			port: proxyUrlObject.port,
			method: 'CONNECT',
			path: proxyPath
		}
		console.log("Preparing to connect to proxy", proxyOpts);
		const proxyReq = network.request(proxyOpts);

		//setting up the listener for connect event
		proxyReq.on('connect', function (res, socket, head) {
			console.log("Proxy connection OK");
			const connectMethod = proxyUrlObject.protocol === "http:" ? require("net").connect : require('tls').connect;
			const targetOpts = {
				host: options.hostname,
				port: options.port,
				socket: socket
			};
			console.log("Preparing connection to handle the targeted url using options", targetOpts);
			let socketConnection = connectMethod(targetOpts, function () {
				console.log("Host connection OK");
				//now that we are connected to the proxy we need to prepare the request that needs to be done by the proxy for us
				let request = `${httpMethod} ${options.path} HTTP/1.1\r\nHost: ${options.hostname}\r\n`;
				//handling headers
				for (let headerName in options.headers) {
					let headerValue = options.headers[headerName];
					request += `${headerName}: ${headerValue}\r\n`;
				}
				console.log("Writing", request);
				socketConnection.write(request);

				//if data is stream
				if (data && data.pipe && typeof data.pipe === "function") {
					//we need to signal that the body of the request will be written
					socketConnection.write("\r\n");
					data.on("data", function (chunk) {
						console.log("Writing", chunk);
						socketConnection.write(chunk);
					});

					data.on("end", function () {
						socketConnection.write("\r\n");
					});
					return;
				}

				//if data is object we serialize it as JSON
				if (typeof data !== "undefined" && typeof data !== 'string' && !$$.Buffer.isBuffer(data) && !ArrayBuffer.isView(data)) {
					//we need to signal that the body of the request will be written
					let message = "\r\n" + JSON.stringify(data) + "\r\n";
					console.log("Writing", message);
					socketConnection.write(message);
					return;
				}

				//if buffer type just write it into the socket
				if (data) {
					//we need to signal that the body of the request will be written
					console.log("Writing", data);
					socketConnection.write("\r\n");
					socketConnection.write(data);
				}
				console.log("Finish the writing.");
				socketConnection.write("\r\n");
			});

			require("./responseParser.js")(socketConnection, (err, response)=>{
				if(err){
					return callback(err);
				}
				//not sure if we should treat redirects as errors...
				if (response.statusCode < 200 || response.statusCode >= 300){
					return callback(response);
				}
				//TODO: document the last argument... providing response.headers to the callback
				callback(undefined, response.body, response.headers);
			});
		});

		proxyReq.on('error', (err)=>{
			console.log("Got an error from the proxy", err);
			return callback(err);
		});

		//make the request to the proxy
		proxyReq.end();
	}
}

function doGetWithProxy(proxyUrl, url, options, callback) {
	let fnc = generateMethodForRequestViaProxy('GET');
	return fnc(proxyUrl, url, undefined, options, callback);
}

module.exports = {
	doGetWithProxy,
	doPutWithProxy: generateMethodForRequestViaProxy('PUT'),
	doPostWithProxy: generateMethodForRequestViaProxy('POST')
}

