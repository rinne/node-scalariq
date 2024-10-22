'use strict';

const CONSTANT_PREFIX = "C";
const LAMBDA_PREFIX = "L";

class Evaluator {

    constructor(expression, config) {
		let c = { limits: { opCount: 1000, strCount: null, strChars: 100000 },
				  calls: new Map() };
		for (let k of [ 'opCount', 'strCount', 'strChars' ]) {
			if (config?.limits?.[k] !== undefined) {
				let n = config.limits[k];
				if ((n === null) || (Number.isSafeInteger(n) && (n >= 0))) {
					c.limits[k] = n;
				} else {
					throw new Error(`Invalid limits configuration (${k})`);
				}
			}
		}
		if ((config?.calls !== undefined) && (config?.calls !== null)) {
			if (typeof(config.calls) === 'object') {
				for (let [ k, v ] of ((config.calls instanceof Map) ? config.calls.entries() : Object.entries(config.calls))) {
					if (! (k && (typeof(k) === 'string'))) {
						throw new Error(`Invalid calls configuration (function name)`);
					}
					if (! (v && (typeof(v) === 'function'))) {
						throw new Error(`Invalid calls configuration (callback function ${k})`);
					}
					c.calls.set(k, v);
				}
			} else {
				throw new Error(`Invalid calls configuration`);
			}
		}
		this.#expression = expression;
		this.#config = c;
	}

	#expression;
	#config;


	async evaluate() {
		let stats = { opCount: 0, strCount: 0, strChars: 0 };
		let r = await this.#evaluateInternal(this.#expression, [], stats);
		return r;
	}

	#checkStatLimits(stats) {
		for (let p of [ 'opCount', 'strCount', 'strChars' ]) {
			let l = this.#config.limits[p];
			let v = stats?.[p];
			if (! Number.isSafeInteger(v)) {
				throw new Error('Internal error');
			}
			if ((l === null) || (l <= 0)) {
				continue;
			}
			if (v > l) {
				throw new Error(`Expression evaluation limit exceeded (${p}: ${v} > ${l})`);
			}
		}
	}

	async #evaluateInternal(expression, stack, stats) {
		if (! Number.isSafeInteger(stats?.opCount)) {
			throw new Error('Internal error');
		}
		stats.opCount++;
		this.#checkStatLimits(stats);
		if (this.#validScalar(expression)) {
			if (this.#validString(expression)) {
				stats.strCount++;
				stats.strChars += expression.length;
				this.#checkStatLimits(stats);
			}
			return expression;
		}
		if (! (expression?.op && (typeof(expression.op) === 'string'))) {
			throw new Error('Invalid expression');
		}
		let av;
		if ((expression.av === undefined) || (expression.av === null)) {
			av = [];
		} else if (Array.isArray(expression.av)) {
			av = expression.av.slice();
		} else {
			throw new Error('Invalid expression av');
		}
		switch (expression.op) {
		case 'null':
			if (av.length != 0) {
				throw new Error('Invalid expression av');
			}
			return null;
		case 'expression':
			{
				if (av.length != 1) {
					throw new Error('Invalid expression av');
				}
				let v = await this.#evaluateInternal(av[0], stack, stats);
				if (! this.#validScalar(v)) {
					throw new Error('Invalid expression operand value');
				}
				return v;
			}
		case 'add':
			{
				if (av.length < 1) {
					throw new Error('Invalid expression av');
				}
				let v = 0;
				for (let o of av) {
					let ov = await this.#evaluateInternal(o, stack, stats);
					if (ov === null) {
						return null;
					} else if (this.#validNumber(ov)) {
						v += ov;
						if (! this.#validNumber(v)) {
							throw new Error('Expression overflow');
						}
					} else {
						throw new Error('Invalid expression operand');
					}
				}
				return v;
			}
		case 'sub':
			{
				if (av.length < 2) {
					throw new Error('Invalid expression av');
				}
				let v = await this.#evaluateInternal(av.shift(), stack, stats);
				if (v === null) {
					return null;
				} else if (! this.#validNumber(v)) {
					throw new Error('Invalid expression operand');
				}
				for (let o of av) {
					let ov = await this.#evaluateInternal(o, stack, stats);
					if (ov === null) {
						return null;
					} else if (this.#validNumber(ov)) {
						v -= ov;
						if (! this.#validNumber(v)) {
							throw new Error('Expression overflow');
						}
					} else {
						throw new Error('Invalid expression operand');
					}
				}
				return v;
			}
		case 'mul':
			{
				if (av.length < 1) {
					throw new Error('Invalid expression av');
				}
				let v = 1;
				for (let o of av) {
					let ov = await this.#evaluateInternal(o, stack, stats);
					if (ov === null) {
						return null;
					} else if (this.#validNumber(ov)) {
						v *= ov;
						if (! this.#validNumber(v)) {
							throw new Error('Expression overflow');
						}
					} else {
						throw new Error('Invalid expression operand');
					}
				}
				return v;
			}
		case 'div':
		case 'mod':
			{
				if (av.length != 2) {
					throw new Error('Invalid expression av');
				}
				let left = await this.#evaluateInternal(av.shift(), stack, stats);
				if (left === null) {
					return null;
				} else if (! this.#validNumber(left)) {
					throw new Error('Invalid expression operand');
				}
				let right = await this.#evaluateInternal(av.shift(), stack, stats);
				if (right === null) {
					return null;
				} else if (! (this.#validNumber(right) && (right != 0))) {
					throw new Error('Invalid expression operand');
				}
				let v;
				switch (expression.op) {
				case 'div':
					v = left / right;
					break;
				case 'mod':
					v = left % right;
					break;
				default:
					throw new Error('Internal error');
				}
				if (! this.#validNumber(v)) {
					throw new Error('Expression overflow');
				}
				return v;
			}
		case 'not':
			{
				if (av.length != 1) {
					throw new Error('Invalid expression av');
				}
				let v = await this.#evaluateInternal(av[0], stack, stats);
				if (v === null) {
					return null;
				}
				v = this.#booleanizeScalar(v);
				if (! this.#validBoolean(v)) {
					throw new Error('Invalid expression operand value');
				}
				return v ? false : true;
			}
		case 'or':
		case 'and':
			{
				if (av.length < 1) {
					throw new Error('Invalid expression av');
				}
				let v = await this.#evaluateInternal(av.shift(), stack, stats);
				if (v === null) {
					return null;
				}
				v = this.#booleanizeScalar(v);
				if (! this.#validBoolean(v)) {
					throw new Error('Invalid expression operand value');
				}
				for (let o of av) {
					let ov = await this.#evaluateInternal(o, stack, stats);
					if (ov === null) {
						return null;
					}
					ov = this.#booleanizeScalar(ov);
					if (! this.#validBoolean(ov)) {
						throw new Error('Invalid expression operand value');
					}
					switch (expression.op) {
					case 'or':
						v ||= ov;
						break;
					case 'and':
						v &&= ov;
						break;
					}
					if (! this.#validBoolean(v)) {
						throw new Error('Expression evaluation overflow');
					}
				}
				return v;
			}
		case 'eq':
		case 'ne':
			{
				if (av.length != 2) {
					throw new Error('Invalid expression av');
				}
				let left = await this.#evaluateInternal(av.shift(), stack, stats);
				if (left === null) {
					return null;
				} else if (! this.#validScalar(left)) {
					throw new Error('Invalid expression operand');
				}
				let right = await this.#evaluateInternal(av.shift(), stack, stats);
				if (right === null) {
					return null;
				} else if (! (this.#validScalar(right))) {
					throw new Error('Invalid expression operand');
				}
				switch (expression.op) {
				case 'eq':
					return (left === right);
				case 'ne':
					return (left !== right);
				}
				throw new Error('Internal error');
			}
		case 'lt':
		case 'le':
		case 'ge':
		case 'gt':
			{
				if (av.length != 2) {
					throw new Error('Invalid expression av');
				}
				let left = await this.#evaluateInternal(av.shift(), stack, stats);
				if (left === null) {
					return null;
				} else if (! this.#validNumber(left)) {
					throw new Error('Invalid expression operand');
				}
				let right = await this.#evaluateInternal(av.shift(), stack, stats);
				if (right === null) {
					return null;
				} else if (! (this.#validNumber(right))) {
					throw new Error('Invalid expression operand');
				}
				switch (expression.op) {
				case 'lt':
					return (left < right);
				case 'le':
					return (left <= right);
				case 'ge':
					return (left >= right);
				case 'gt':
					return (left > right);
				}
				throw new Error('Internal error');
			}
		case 'condition':
			{
				if (! ((av.length >= 1) && ((av.length % 2) == 1))) {
					throw new Error('Invalid expression av');
				}
				// Condition is evaluated lazily one condition at the
				// time. Result will only be evaluated, when the positive
				// case is found or default result is reached. No
				// concurrent evaluation here.
				while (av.length >= 1) {
					let condition;
					if (av.length >= 2) {
						condition = await this.#evaluateInternal(av.shift(), stack, stats);
						if (condition === null) {
							condition = false;
						} else {
							condition = this.#booleanizeScalar(condition);
						}
					} else {
						condition = true;
					}
					if (! this.#validBoolean(condition)) {
						throw new Error('Invalid condition value type');
					}
					let result = av.shift();
					if (condition) {
						let v = await this.#evaluateInternal(result, stack, stats);
						if (! this.#validScalar(v)) {
							throw new Error('Invalid expression call value');
						}
						return v;
					}
				}
				throw new Error('Invalid expression condition');
			}
		case 'call':
			{
				if (av.length < 1) {
					throw new Error('Invalid expression av');
				}
				let name = av.shift();
				if (! this.#validString(name)) {
					throw new Error(`Invalid function name in 'call' (string constant required)`);
				}
				// First see if we can find a lambda for that name.
				{
					let key = LAMBDA_PREFIX + name;
					for (let i = stack.length - 1; i >= 0; i--) {
						let lambda = stack[i].get(key);
						if (lambda === undefined) {
							continue;
						}
						// Removing this check would enable
						// recursion. Programs would still work, but
						// the finite execution time would no longer
						// be guaranteed. It would also make the
						// language Turing complete, which is against
						// the core idea of the language. If you
						// change this, be sure to call the resulting
						// language something different from ScalarIQ!
						if (lambda.busy) {
							throw new Error(`Lambda '${name}' is busy (attempted recursion?)`);
						}
						// Both includes one non-parameter, but the length should match.
						if (expression.av.length !== lambda?.expression?.av.length) {
							throw new Error(`Lambda '${name}' parameter count mismatch`);
						}
						{
							// I agree that this loop is a bit weird,
							// so I'll document it :).
							let av = [];
							// Push the first parameter name or
							// expression if there are no parameters.
							av.push(lambda.expression.av[0]);
							for (let i = 1; i < expression.av.length; i++) {
								// Push the value of the last pushed
								// parameter name and name of the next
								// parameter or expression if there
								// are no more parameters.
								av.push(expression.av[i], lambda.expression.av[i]);
							}
							// And in the end we have av that has
							// parameter name - parameter value pairs
							// and at the end the expression to be
							// evaluated. From that we'll fabricate a 'scope'
							// expression to be evaluated.
							let o = { op: 'scope', av };
							let r, err;
							try {
								lambda.busy = true;
								r = await this.#evaluateInternal(o, stack, stats);
								if (! this.#validScalar(r)) {
									throw new Error(`Invalid lambda call '${name}' return value`);
								}
							} catch (e) {
								err = e;
								r = undefined;
							} finally {
								lambda.busy = false;
							}
							if (err) {
								throw err;
							}
							return r;
						}
					}
				}
				// Then we'll look into externally provided functions.
				let cb = this.#config.calls.get(name);
				if (cb === undefined) {
					throw new Error(`Undefined expression call '${name}'`);
				}
				if (! (typeof(cb) === 'function')) {
					throw new Error(`Invalid expression callback '${name}'`);
				}
				let cav = [];
				for (let o of av) {
					let ov = await this.#evaluateInternal(o, stack, stats);
					if (! this.#validScalar(ov)) {
						throw new Error('Invalid expression call parameter');
					}
					cav.push(ov);
				}
				let v = await cb(...cav);
				if (! this.#validScalar(v)) {
					throw new Error(`Invalid expression call '${name}' return value`);
				}
				if (this.#validString(v)) {
					stats.strCount++;
					stats.strChars += v.length;
					this.#checkStatLimits(stats);
				}
				return v;
			}
		case 'lookup':
			{
				if (av.length != 1) {
					throw new Error('Invalid expression av');
				}
				let name = av[0];
				if (! this.#validString(name)) {
					throw new Error(`Invalid variable name in 'lookup' (string constant required)`);
				}
				let key = CONSTANT_PREFIX + name;
				for (let i = stack.length - 1; i >= 0; i--) {
					let v = stack[i].get(key);
					if (v === undefined) {
						continue;
					}
					if (! this.#validScalar(v)) {
						throw new Error('Invalid variable value');
					}
					if (this.#validString(v)) {
						stats.strCount++;
						stats.strChars += v.length;
						this.#checkStatLimits(stats);
					}
					return v;
				}
				throw new Error(`Uninitialized variable '${name}'`);
			}
		case 'scope':
			{
				if (! ((av.length >= 1) && ((av.length % 2) == 1))) {
					throw new Error('Invalid expression av');
				}
				let scope = new Map();
				while (av.length >= 2) {
					let name = av.shift();
					if (! this.#validString(name)) {
						throw new Error(`Invalid variable name in 'scope' (string constant required)`);
					}
					let expression = av.shift();
					if (expression?.op === 'lambda') {
						let lambda = { busy: false, expression };
						scope.set(LAMBDA_PREFIX + name, lambda);
					} else {
						let v = await this.#evaluateInternal(expression, stack, stats);
						if (! this.#validScalar(v)) {
							throw new Error('Invalid expression operand value');
						}
						scope.set(CONSTANT_PREFIX + name, v);
					}
				}
				{
					let v, error;
					try {
						stack.push(scope);
						v = await this.#evaluateInternal(av.shift(), stack, stats);
						if (! this.#validScalar(v)) {
							throw new Error('Invalid expression operand value');
						}
					} catch(e) {
						error = e;
						v = undefined;
					} finally {
						stack.pop();
					}
					if (error) {
						throw error;
					}
					return v;
				}
			}
		case 'coalesce':
			for (let o of av) {
                let v = await this.#evaluateInternal(o, stack, stats);
                if (! this.#validScalar(v)) {
                    throw new Error('Invalid expression operand value');
                }				
				if (v !== null) {
					return v;
				}
			}
			return null;
		case 'isnull':
			{
				if (av.length != 1) {
					throw new Error('Invalid expression av');
				}
				let v = await this.#evaluateInternal(av[0], stack, stats);
				if (! this.#validScalar(v)) {
					throw new Error('Invalid expression operand value');
				}
				return (v === null);
			}
		case 'typeof':
			{
				if (av.length != 1) {
					throw new Error('Invalid expression av');
				}
				let v = await this.#evaluateInternal(av[0], stack, stats);
				if (! this.#validScalar(v)) {
					throw new Error('Invalid expression operand value');
				}
				if (v === null) {
					return 'null';
				} else if (this.#validNumber(v)) {
					return 'number';
				} else if (this.#validBoolean(v)) {
					return 'boolean';
				} else if (this.#validString(v)) {
					return 'string';
				}
			}
		case 'lambda':
			throw new Error('Unexpected lambda expression');
		default:
			throw new Error(`Invalid expression: op='${expression.op}'`);
		}
	}

	#validScalar(x) {
		return ((x === null) || Number.isFinite(x) || (typeof(x) === 'string') || (typeof(x) === 'boolean'));
	}

	#validBoolean(x) {
		return (typeof(x) === 'boolean');
	}

	#validString(x) {
		return (typeof(x) === 'string');
	}

	#validNumber(x) {
		return Number.isFinite(x);
	}

	#booleanizeScalar(x) {
		if (typeof(x) === 'boolean') {
			return x;
		} else if (Number.isFinite(x)) {
			return (!(x == 0));
		} else if (typeof(x) === 'string') {
			return (!(x === ''));
		}
		return null;
	}

}

(typeof(module) === 'object') && (module.exports = Evaluator);
