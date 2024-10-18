'use strict';

class Optimizer {

    constructor(expression) {
		this.#expression = expression;
	}
	
	#expression;

	check() {
		let stack = [];
		let stats = { opCount: 0, calls: [], warnings: [], dynamicConstantNames: false, dynamicCallNames: false };
		this.#checkInternal(this.#expression, stack, stats);
		return stats;
	}

	#checkInternal(exp, stack, stats) {
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
					if (! stats.calls.includes(av[0])) {
						stats.calls.push(av[0]);
					}
				} else if ((av[0] === null) || Number.isFinite(av[0]) || (typeof(av[0]) === 'boolean')) {
					throw new Error(`Invalid node #${stats.opCount}:call 'Non-string call name'`);
				} else {
					this.#checkInternal(av[0], stack, stats);
					stats.warnings.push(`Node #${stats.opCount}:call 'Call name is not a constant and is therefore not checked'`);
					stats.dynamicCallNames = true;
				}
				for (let a of av.slice(1)) {
					this.#checkInternal(a, stack, stats);
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
						this.#checkInternal(n, stack, stats);
						stats.warnings.push(`Node #${stats.opCount}:with 'Declared constant name is not a constant, which may cause uncaught undefined constants'`);
						vars.add(null);
						stats.dynamicConstantNames = true;
					}
					this.#checkInternal(v, stack, stats);
				}
				let err;
				try {
					stack.push(vars);
					this.#checkInternal(av.slice(-1)[0], stack, stats);
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
						stats.warnings.push(`Node #${stats.opCount}:lookup 'Undeclared constant "${av[0]}" but enclosing scope includes dynamic constant names that possibly will satisfy it during evaluation'`);
					} else {
						throw new Error(`Invalid node #${stats.opCount}:lookup 'Undeclared constant "${av[0]}"'`);
					}
				} else if ((av[0] === null) || Number.isFinite(av[0]) || (typeof(av[0]) === 'boolean')) {
					throw new Error(`Invalid node #${stats.opCount}:lookup 'Non-string constant name'`);
				} else {
					this.#checkInternal(av[0], stack, stats);
					stats.warnings.push(`Node #${stats.opCount}:lookup 'Constant name is not a constant and is therefore not checked'`);
					stats.dynamicConstantNames = true;
				}
			}
			break;
		default:
			for (let a of av) {
				this.#checkInternal(a, stack, stats);
			}
		}
		return true;
	}

}

(typeof(module) === 'object') && (module.exports = Optimizer);