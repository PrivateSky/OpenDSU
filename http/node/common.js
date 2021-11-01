const userAgent = 'PSK NodeAgent/0.0.1';
const signatureHeaderName = process.env.vmq_signature_header_name || "x-signature";

function getNetworkForOptions(options) {
	const httpModuleName = "http";
	const http = require(httpModuleName);
	const https = require(httpModuleName + "s");

	let network;
	switch (options.protocol) {
		case "http:":
			network = http;
			break;
		case "https:":
			network = https;
			break;
		default:
			throw new Error(`Can't handle protocol ${options.protocol}`);
	}

	return network;
}

function buildOptions(url, method, opts){
	const urlModuleName = "url";
	const URL = require(urlModuleName);
	const innerUrl = URL.parse(url);

	const options = {
		hostname: innerUrl.hostname,
		path: innerUrl.pathname,
		protocol: innerUrl.protocol,
		port: parseInt(innerUrl.port),
		headers: {
			'User-Agent': userAgent,
			[signatureHeaderName]: 'replaceThisPlaceholderSignature'
		},
		method
	};

	//if no port is specified we need to set the default ones
	if(!options.port){
		options.port = innerUrl.protocol === "http:" ? 80 : 443
	}

	if(opts){
		if(opts.useProxy){
			let proxy = URL.parse(opts.useProxy);
			//setting proxy hostname
			options.hostname = proxy.hostname;

			//setting proxy port
			if(Number.isNaN(proxy.port)){
				options.port = proxy.protocol === "http:" ? 80 : 443;
			}else{
				options.port = proxy.port;
			}

			//updating the path
			options.path = url;
		}

		for(let name in opts.headers){
			options.headers[name] = opts.headers[name];
		}
	}

	return options;
}

function setContentTypeByData(options, data){
	if(typeof data === "undefined"){
		return;
	}
	if (ArrayBuffer.isView(data) || $$.Buffer.isBuffer(data) || data instanceof ArrayBuffer) {
		if (!$$.Buffer.isBuffer(data)) {
			data = $$.Buffer.from(data);
		}

		options.headers['Content-Type'] = 'application/octet-stream';
		options.headers['Content-Length'] = data.length;
	}
}

module.exports = {
	setContentTypeByData,
	buildOptions,
	getNetworkForOptions
}