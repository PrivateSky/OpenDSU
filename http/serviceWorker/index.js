function generateMethodForRequestWithData(httpMethod) {
	return function (url, data, callback) {
		const headers = {}
		if(ArrayBuffer.isView(data) || data instanceof ArrayBuffer) {
			headers['Content-Type'] = 'application/octet-stream';

			/**
			 * Content-Length is an unsafe header and we cannot set it.
			 * When browser is making a request that is intercepted by a service worker,
			 * the Content-Length header is not set implicitly.
			 */
			headers['X-Content-Length'] = data.byteLength;
		}

		fetch(url, {
			method: httpMethod,
			mode: 'cors',
			headers,
			body: data
		}).then(function (response) {
			if (response.status >= 400) {
				throw new Error(`An error occurred ${response.statusText}`);
			}
			return response.json().catch((err) => {
				// This happens when the response is empty
				return {};
			});
		}).then(function (data) {
			callback(null, data)
		}).catch(error => {
			callback(error);
		});
	};
}

module.exports = {
	fetch: fetch,
	doPost: generateMethodForRequestWithData('POST'),
	doPut: generateMethodForRequestWithData('PUT')
}