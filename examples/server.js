'use strict';

const { Evaluator } = require('../index');

// Returns a random "temperature" between 10 and 30.
let temperature = (()=>(Math.round((Math.random()*200)+100)/10));

async function handleRequest(req, res) {
	let code, reply;
	try {
		if (req.method === 'POST') {
			let input = await new Promise((resolve, reject) => {
				let body = '';
				req.on('data', function (data) { body += data; });
				req.on('end', function () { try { resolve(JSON.parse(body)); } catch (e) { reject(e); } });
			});
			switch (req.url) {
			case '/evaluate':
				{
					try {
						const config = { calls: { temperature: temperature } };
						let c = new Evaluator(input, config);
						let result = await c.evaluate();
						reply = { status: 'ok', result: result };
					} catch(e) {
						code = 400;
						reply = { status: 'error', message: 'Evaluator error: ' + (e?.message ?? 'Internal error') };
					}
				}
				break;
			default:
				code = 404;
				reply = { status: 'error', message: 'Not found' };
				
			}
		} else {
			code = 405;
			reply = { status: 'error', message: 'Only POST method is allowed' };
		}
	} catch (e) {
		code = 400;
		reply = { status: 'error', message: e.message };
	} finally {
		if (reply === undefined) {
			code = 500;
			reply = { status: 'error', message: 'Internal error' };
		}
		if (code === undefined) {
			code = 200;
		}
		res.setHeader('Content-Type', 'application/json');
		res.end(JSON.stringify(reply));
	}
}

(function(host, port) {
	const server = require('node:http').createServer();
	server.on('request', (req, res) => {
		(async function(req, res) { try { await handleRequest(req, res); }
									catch (e) { try { res.end(); } catch (e) {} }
								  } )(req, res); });
	server.listen(port.toString(), host, () => {
		console.log(`Server running at http://${host}:${port}/`);
	});
})('127.0.0.1', 3000);
