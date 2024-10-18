'use strict';

{
	if (typeof(window) === 'object') {
		window.scalariqExt = {};
	} else if (typeof(global) === 'object') {
		global.scalariqExt = {};
	}
}

function compile(input) {
	try {
		let l = new Lexer();
		l.update(input);
		let tokens = l.final();
		let p = new Parser(tokens);
		let tree = p.parse()
		let g = new Generator(tree);
		let expression = g.generate();
		return JSON.stringify(expression, null, 2);
	} catch (e) {
		throw e;
	}
}

async function evaluate(expression, externalFunctionsEnabled) {
	try {
		let p = JSON.parse(expression);
		let calls = {};
		if (Array.isArray(externalFunctionsEnabled)) {
			for (let ext of externalFunctionsEnabled) {
				let cd = window?.scalariqExt?.[ext] ?? global?.scalariqExt?.[ext] ?? null;
				if (! cd?.calls) {
					throw new Error(`Can't enable external function set '${ext}'`);
				}
				Object.assign(calls, cd.calls);
			}
		}
		let c = new Evaluator(p, { calls });
		let r = await c.evaluate(expression);
		return JSON.stringify(r);
	} catch (e) {
		throw e;
	}
}

function check(expression) {
	try {
		let p = JSON.parse(expression);
		let o = new Optimizer(p);
		let r = o.check();
		return JSON.stringify(r, null, 2);
	} catch (e) {
		throw e;
	}
}

async function optimize(expression) {
	try {
		let p = JSON.parse(expression);
		let o = new Optimizer(p);
		let r = await o.optimize();
		return JSON.stringify(r, null, 2);
	} catch (e) {
		throw e;
	}
}

function registerCustomLookupFunction(name, title, lookupCb) {
	let f = (async function() {
		try {
			let x = await lookupCb();
			if (! ((x === null) || Number.isFinite(x) || (typeof(x) === 'string') || (typeof(x) === 'boolean'))) {
				throw new Error(`Custom lookup function '${name}' returns non-scalar value`);
			}
			return x;
		} catch (e) {
			console.log(e);
			return null;
		}
	});
	let key = '~~~' + (Math.floor(Math.random() * Math.pow(36, 10)).toString(36));
	let calls = {};
	calls[name] = f;
	scalariqExt[key] = { name: title, calls };
	return key;
}
