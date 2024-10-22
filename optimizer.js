'use strict';

const CONSTANT_PREFIX = "C";
const LAMBDA_PREFIX = "L";

class Optimizer {

    constructor(expression) {
		this.#expression = expression;
		this.#Evaluator = ((typeof(Evaluator) === 'undefined') ? require('./evaluator') : Evaluator);
	}
	
	#expression;
	#Evaluator;

	check(calls) {
		if ((calls === undefined) || (calls === null)) {
			calls = undefined;
		} else if (! Array.isArray(calls)) {
			throw new Error('Invalid calls array submitted for code checker');
		}
		let stack = [];
		let stats = { opCount: 0, calls: [], warnings: [] };
		JSON.parse(JSON.stringify(this.#expression));
		this.#checkInternal(this.#expression, calls, stack, stats);
		if (stats.warnings.length == 0) {
			delete stats.warnings;
		}
		if (stats.calls.length == 0) {
			delete stats.calls;
		}
		return stats;
	}

	async optimize() {
		this.check();
		let exp = JSON.parse(JSON.stringify(this.#expression));
		let r = await this.#optimizeInternal(exp);
		if ((r === null) || Number.isFinite(r) || (typeof(r) === 'string') || (typeof(r) === 'boolean')) {
			return { op: 'expression', av: [r] };
		}
		return r;
	}

	#checkInternal(exp, calls, stack, stats) {
		if ((exp === null) || Number.isFinite(exp) || (typeof(exp) === 'string') || (typeof(exp) === 'boolean')) {
			return true;
		}
		stats.opCount++;
		let op = exp?.op;
		if (typeof(op) !== 'string') {
			throw new Error(`Invalid node #${stats.opCount} 'Missing or invalid op'`);
		}
		let av = exp?.av;
		if (! Array.isArray(av)) {
			throw new Error(`Invalid node #${stats.opCount} 'Missing or invalid av'`);
		}
		switch (op) {
		case 'call':
			{
				if (av.length < 1) {
					throw new Error(`Invalid node #${stats.opCount}:call 'Empty av'`);
				}
				if (typeof(av[0]) === 'string') {
					let matchFound = false;
					let key = LAMBDA_PREFIX + av[0];
					for (let i = stack.length - 1; i >= 0; i--) {
						if (stack[i].has(key)) {
							matchFound = true;
							break;
						}
					}
					if (! matchFound) {
						if (Array.isArray(calls) && (! calls.includes(av[0]))) {
							throw new Error(`Invalid node #${stats.opCount}:lookup 'Unknown call name "${av[0]}"'`);
						}
						if (! stats.calls.includes(av[0])) {
							stats.calls.push(av[0]);
						}
					}
				} else {
					throw new Error(`Invalid node #${stats.opCount}:call 'Non-string call name'`);
				}
				for (let a of av.slice(1)) {
					this.#checkInternal(a, calls, stack, stats);
				}
			}
			break;
		case 'scope':
			{
				if (! ((av.length >= 1) && ((av.length % 2) == 1))) {
					throw new Error(`Invalid node #${stats.opCount}:scope 'Illegal av length'`);
				}
				let vars = new Set();
				for (let i = 0; i < av.length - 1; i += 2) {
					let n = av[i], v = av[i + 1];
					if (typeof(n) === 'string') {
						let key = ((v?.op === 'lambda') ? LAMBDA_PREFIX : CONSTANT_PREFIX) + n;
						if (vars.has(key)) {
							throw new Error(`Invalid node #${stats.opCount}:scope 'Duplicate constant name'`);
						}
						vars.add(key);
					} else {
						throw new Error(`Invalid node #${stats.opCount}:scope 'Non-string constant name'`);
					}
					this.#checkInternal(v, calls, stack, stats);
				}
				let err;
				try {
					stack.push(vars);
					this.#checkInternal(av.slice(-1)[0], calls, stack, stats);
				} catch (e) {
					err = e;
				} finally {
					stack.pop(vars);
				}
				if (err) {
					throw err;
				}
			}
			break;
		case 'lookup':
			if (! (av.length == 1)) {
				throw new Error(`Invalid node #${stats.opCount}:lookup 'Illegal av length'`);
			}
			{
				if (typeof(av[0]) === 'string') {
					let matchFound = false;
					let key = CONSTANT_PREFIX + av[0];
					for (let i = stack.length - 1; i >= 0; i--) {
						if (stack[i].has(key)) {
							matchFound = true;
							break;
						}
					}
					if (! matchFound) {
						throw new Error(`Invalid node #${stats.opCount}:lookup 'Unknown constant name "${av[0]}"'`);
					}
				} else {
					throw new Error(`Invalid node #${stats.opCount}:lookup 'Non-string constant name'`);
				}
			}
			break;
		case 'lambda':
			if (! (av.length >= 1)) {
				throw new Error(`Invalid node #${stats.opCount}:lambda 'Illegal av length'`);
			}
			{
				let params = new Set();
				for (let i = 0; i < av.length - 1; i++) {
					let n = av[i];
					if (typeof(n) === 'string') {
						let key = CONSTANT_PREFIX + n;
						if (params.has(key)) {
							throw new Error(`Invalid node #${stats.opCount}:lambda 'Duplicate parameter name'`);
						}
						params.add(key);
					} else {
						throw new Error(`Invalid node #${stats.opCount}:lambda 'Non-string parameter name'`);
					}
				}
				let err;
				try {
					stack.push(params);
					this.#checkInternal(av.slice(-1)[0], calls, stack, stats);
				} catch (e) {
					err = e;
				} finally {
					stack.pop(params);
				}
				if (err) {
					throw err;
				}
			}
			break;
		default:
			for (let a of av) {
				this.#checkInternal(a, calls, stack, stats);
			}
		}
		return true;
	}

	async #optimizeInternal(exp) {
		if ((exp === null) || Number.isFinite(exp) || (typeof(exp) === 'string') || (typeof(exp) === 'boolean')) {
			return exp;
		}

		let c = new this.#Evaluator(exp);
		try {
			let r = await c.evaluate(exp);
			return r;
		} catch (e) {
		}
		if (exp?.op === 'lambda') {
			return exp;
		}
		for (let i = 0; i < exp.av.length; i++) {
			try {
				let r = await this.#optimizeInternal(exp.av[i]);
				exp.av[i] = r;
			} catch (e) {
			}
		}
		return exp;
	}

}

(typeof(module) === 'object') && (module.exports = Optimizer);
