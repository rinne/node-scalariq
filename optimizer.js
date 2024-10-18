'use strict';

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
					if (Array.isArray(calls) && (! calls.includes(av[0]))) {
						throw new Error(`Invalid node #${stats.opCount}:lookup 'Unknown call name "${av[0]}"'`);
					}
					if (! stats.calls.includes(av[0])) {
						stats.calls.push(av[0]);
					}
				} else if ((av[0] === null) || Number.isFinite(av[0]) || (typeof(av[0]) === 'boolean')) {
					throw new Error(`Invalid node #${stats.opCount}:call 'Non-string call name'`);
				} else {
					this.#checkInternal(av[0], calls, stack, stats);
					stats.warnings.push(`Node #${stats.opCount}:call 'Call name is not a constant and is therefore not checked'`);
					stats.dynamicCallNames = true;
				}
				for (let a of av.slice(1)) {
					this.#checkInternal(a, calls, stack, stats);
				}
			}
			break;
		case 'with':
			{
				if (! ((av.length >= 1) && ((av.length % 2) == 1))) {
					throw new Error(`Invalid node #${stats.opCount}:with 'Illegal av length'`);
				}
				let vars = new Set();
				for (let i = 0; i < av.length - 1; i += 2) {
					let n = av[i], v = av[i + 1];
					if (typeof(n) === 'string') {
						if (vars.has(n)) {
							throw new Error(`Invalid node #${stats.opCount}:with 'Duplicate constant name'`);
						}
						vars.add(n);
					} else if ((n === null) || Number.isFinite(n) || (typeof(n) === 'boolean')) {
						throw new Error(`Invalid node #${stats.opCount}:with 'Non-string constant name'`);
					} else {
						this.#checkInternal(n, calls, stack, stats);
						stats.warnings.push(`Node #${stats.opCount}:with 'Declared constant name is not a constant, which may cause uncaught undefined constants'`);
						vars.add(null);
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
					let matchFound = false, dynamicFound = false;
					for (let i = stack.length - 1; i >= 0; i--) {
						if (stack[i].has(av[0])) {
							matchFound = true;
							break;
						}
						if (stack[i].has(null)) {
							dynamicFound = true;
							break;
						}
					}
					if (matchFound) {
						// We are happy
					} else if (dynamicFound) {
						stats.warnings.push(`Node #${stats.opCount}:lookup 'Unknown constant name "${av[0]}" but enclosing scope includes dynamic constant names that possibly will satisfy it during evaluation'`);
					} else {
						throw new Error(`Invalid node #${stats.opCount}:lookup 'Unknown constant name "${av[0]}"'`);
					}
				} else if ((av[0] === null) || Number.isFinite(av[0]) || (typeof(av[0]) === 'boolean')) {
					throw new Error(`Invalid node #${stats.opCount}:lookup 'Non-string constant name'`);
				} else {
					this.#checkInternal(av[0], calls, stack, stats);
					stats.warnings.push(`Node #${stats.opCount}:lookup 'Constant name is not a constant and is therefore not checked'`);
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
