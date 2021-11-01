require('../../../../psknode/bundles/testsRuntime');
const tir = require('../../../../psknode/tests/util/tir');
const dc = require('double-check');
const assert = dc.assert;

const httpSpace = require('../../http');

function createProxyForTest(callback){
	const http = require('http');
	const net = require('net');
	const { URL } = require('url');

	const proxy = http.createServer((req, res) => {
		res.writeHead(200, { 'Content-Type': 'text/plain' });
		res.end('Just a proxy that is running');
	});

	proxy.on('connect', (req, clientSocket, head) => {
		// Connect to an origin server
		const { port, hostname } = new URL(`http://${req.url}`);
		const serverSocket = net.connect(port || 80, hostname, () => {
			clientSocket.write('HTTP/1.1 200 Connection Established\r\n' +
				'Proxy-agent: Node.js-Proxy\r\n' +
				'\r\n');
			serverSocket.write(head);
			serverSocket.pipe(clientSocket);
			clientSocket.pipe(serverSocket);
		});
	});

	const port = 1337;
	const interface = '127.0.0.1';
	proxy.listen(port, interface, ()=>{
		// now that the proxy is running ...
		proxy.fullURL = `http://${interface}:${port}`;
		callback(undefined, proxy);
	});
}

assert.callback("doGetWithProxy", (finish)=>{
	createProxyForTest((err, proxy)=>{
		dc.createTestFolder('testFolder', (err, folder) => {
			if (err) {
				assert.true(false, 'Error creating test folder');
				throw err;
			}
			tir.launchApiHubTestNode(10, folder, async (err, port) => {
				if (err) {
					assert.true(false);
					throw err;
				}

				httpSpace.doGetWithProxy(proxy.fullURL, `http://adf22159cd9d742a3ab7f2ef76f2afd6-1565404067.eu-central-1.elb.amazonaws.com:3000/getAnchorVersions/2ZJYQfVg79UAZwXraGHdH3ZtEXLLZiasGUxK8ufuLWtxRPyFv59PY77eHfYFDw96Prq7SU1KcQFvcNkz9Muh`, {}, (err, res) => {
					if (err) {
						assert.true(false);
						throw err;
					}

					assert.true(res.toString() === "[]");

					proxy.close();
					finish();
				});
			});
		});
	});

}, 10000);