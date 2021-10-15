module.exports = function(responseStream, callback){
	responseStream.on("error", function (err) {
		console.log("Caught an error while reading the response", err);
		return callback(err);
	});

	let receivedDataAsString = "";

	const response = {};

	const HTTPStatusRegex = /^HTTP\/[0-9.]* [0-9][0-9][0-9] [\w ]*[\r\n]+/gm;
	const headerLineDelimiter = "\r\n";
	const headerZoneDelimiter = "\r\n\r\n";
	let headerReceived = false;
	let headerRead = false;

	const TRANSFER_ENCODING_HEADER = "Transfer-Encoding";
	let expectedChunkSize;

	const CONTENT_LENGTH_HEADER = "Content-Length";

	let expectedContentLength;

	responseStream.on('data', function (data) {
		console.log("Received", data.toString());
		let convertedToString = false;
		if(!headerRead){
			receivedDataAsString += data.toString();
			convertedToString = true;
		}

		if(!headerReceived){
			//first line from response should be protocol/version statusCode Status
			headerReceived = HTTPStatusRegex.test(data);
			HTTPStatusRegex.lastIndex = -1;
			let status = HTTPStatusRegex.exec(receivedDataAsString)[0];
			status = status.replace(headerLineDelimiter, "");
			receivedDataAsString = receivedDataAsString.replace(HTTPStatusRegex, "");
			status = status.split(" ");
			response.statusCode = status[1];
			response.statusMessage = status[2];
		}
		if(headerReceived && !headerRead){
			headerRead = receivedDataAsString.indexOf(headerZoneDelimiter) !== -1;
		}
		if(headerRead && !response.headers){
			let headers = receivedDataAsString.substring(0, receivedDataAsString.indexOf(headerZoneDelimiter));
			//in case that after the headers we receive more data let's extract the header part from the response
			receivedDataAsString = receivedDataAsString.replace(headers+headerZoneDelimiter, "");

			headers = headers.split(headerLineDelimiter);
			//let's parse headers line by line using the headerRegex
			const headerRegex = /([\w-]+): (.*)/gm;
			response.headers = {};
			for(let i=0; i<headers.length; i++){
				let header = /([\w-]+): (.*)/gm.exec(headers[i]);
				response.headers[header[1]] = header[2];
			}
			//test for content length header
			if(typeof response.headers[CONTENT_LENGTH_HEADER] !== "undefined"){
				expectedContentLength = response.headers[CONTENT_LENGTH_HEADER];
			}

			if(receivedDataAsString !== ""){
				data = Buffer.from(receivedDataAsString);
				convertedToString = false;
			}
		}
		if(response.headers && !convertedToString){
			//we should start ingesting body data...
			const transferEncoding = response.headers[TRANSFER_ENCODING_HEADER];
			if(transferEncoding === "chunked"){
				let sizeRegex = /^[0-9A-F][0-9A-F][0-9A-F][0-9A-F]\r\n/gm;
				let noOfBytes = 4;

				let foundChunkSize = data.toString().search(sizeRegex);
				if(foundChunkSize!==-1){
					const chunkSize = data.slice(foundChunkSize, foundChunkSize+noOfBytes);
					expectedChunkSize = parseInt(chunkSize.toString(), 16);

					if(foundChunkSize === 0){
						data = data.slice(noOfBytes, data.length);
					}else{
						for(let i=0; i<noOfBytes+headerLineDelimiter.length; i++){
							data[foundChunkSize+i] = Buffer.from("");
						}
					}
				}
				if(!response.chunks){
					response.chunks = [];
				}
				response.chunks.push(data);
				expectedChunkSize -= data.length;
				const endCharacterIndex = data.toString().search(/^0$/gm);
				if(endCharacterIndex !==-1){
					//end of response
					data[endCharacterIndex] = Buffer.from("");
					response.body = Buffer.concat(response.chunks);
					return callback(undefined, response);
				}
			}
			if(expectedContentLength){
				if(!response.chunks){
					response.chunks = [];
				}
				response.chunks.push(data);
				expectedContentLength -= data.length;

				if(expectedContentLength <= 0){
					//received everything... so we good
					response.body = Buffer.concat(response.chunks);
					return callback(undefined, response);
				}
			}
		}
	});
}