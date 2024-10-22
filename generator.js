'use strict';

const CONSTANT_PREFIX = "C";
const LAMBDA_PREFIX = "L";

class Generator {

    constructor(tree) {
        this.#tree = tree;
    }

	#tree;

	generate() {
		let stack = [];
		return this.#generate(this.#tree, stack, true);
	}

	#generate(tree, stack, root) {
		root = root ? true : false;
		switch (tree?.type) {
		case 'Literal':
			if (root) {
				return { op: 'expression', av: [ tree.value ] };
			}
			return tree.value;
		case 'UnaryExpression':
			switch (tree.operator) {
			case '+':
				return { op: 'add', av: [ 0, this.#generate(tree.operand, stack) ] };
			case '-':
				return { op: 'sub', av: [ 0, this.#generate(tree.operand, stack) ] };
			case '!':
				return { op: 'not', av: [ this.#generate(tree.operand, stack) ] };
			default:
				throw new Error(`Unknown unary operator ${tree?.text ?? ''}`);
			}
		case 'BinaryExpression':
			switch (tree.operator) {
			case '|':
				return { op: 'or', av: [ this.#generate(tree.left, stack), this.#generate(tree.right, stack) ] };
			case '&':
				return { op: 'and', av: [ this.#generate(tree.left, stack), this.#generate(tree.right, stack) ] };
			case '+':
				return { op: 'add', av: [ this.#generate(tree.left, stack), this.#generate(tree.right, stack) ] };
			case '-':
				return { op: 'sub', av: [ this.#generate(tree.left, stack), this.#generate(tree.right, stack) ] };
			case '*':
				return { op: 'mul', av: [ this.#generate(tree.left, stack), this.#generate(tree.right, stack) ] };
			case '/':
				return { op: 'div', av: [ this.#generate(tree.left, stack), this.#generate(tree.right, stack) ] };
			case '%':
				return { op: 'mod', av: [ this.#generate(tree.left, stack), this.#generate(tree.right, stack) ] };
			case '<':
				return { op: 'lt', av: [ this.#generate(tree.left, stack), this.#generate(tree.right, stack) ] };
			case '≤':
				return { op: 'le', av: [ this.#generate(tree.left, stack), this.#generate(tree.right, stack) ] };
			case '=':
				return { op: 'eq', av: [ this.#generate(tree.left, stack), this.#generate(tree.right, stack) ] };
			case '≠':
				return { op: 'ne', av: [ this.#generate(tree.left, stack), this.#generate(tree.right, stack) ] };
			case '≥':
				return { op: 'ge', av: [ this.#generate(tree.left, stack), this.#generate(tree.right, stack) ] };
			case '>':
				return { op: 'gt', av: [ this.#generate(tree.left, stack), this.#generate(tree.right, stack) ] };
			default:
				throw new Error(`Unknown binary operator ${tree?.operator ?? ''}`);
			}
		case 'CaseExpression':
			{
				let av = [];
				for (let c of tree.cases) {
					av.push(this.#generate(c.condition, stack), this.#generate(c.value, stack));
				}
				av.push(this.#generate(tree.defaultExpr, stack));
				return { op: 'condition', av };
				
			}
		case 'TernaryConditionExpression':
			return { op: 'condition',
					 av: [ this.#generate(tree.condition, stack),
						   this.#generate(tree.iftrue, stack),
						   this.#generate(tree.otherwise, stack) ] };
		case 'CallExpression':
			{
				if (! (tree.callee && (typeof(tree.callee) === 'string'))) {
					throw new Error(`Non-string function name in call`);
				}
				let lambda;
				{
					let key = LAMBDA_PREFIX + tree.callee;
					for (let i = stack.length - 1; i >= 0; i--) {
						lambda = stack[i].get(key);
						if (lambda) {
							break;
						}
					}
				}
				if (lambda) {
					if (lambda.busy) {
						throw new Error(`Attempted recursion for function '${tree.callee}'`);
					}
					if (lambda.parameters.length != tree.arguments.length) {
						throw new Error(`Parameter count mismatch for function '${tree.callee}'`);
					}
					let av = [], scope = new Map();
					for (let i = 0; i < lambda.parameters.length; i++) {
						let name = lambda.parameters[i];
						let key = CONSTANT_PREFIX + name;
						av.push(name, this.#generate(tree.arguments[i], stack))
						scope.set(key, true);
					}
					let err;
					try {
						stack.push(scope);
						lambda.busy = true;
						av.push(this.#generate(lambda.expression, stack));
					} catch (e) {
						err = e;
					} finally {
						lambda.busy = false;
						stack.pop();
					}
					if (err) {
						throw err;
					}
					return { op: 'scope', av };
				}
				let av = [ tree.callee ];
				for (let a of tree.arguments ) {
					av.push(this.#generate(a, stack));
				}
				return { op: 'call', av };
			}
		case 'PseudoCallExpression':
			{
				let av = [];
				for (let a of tree.arguments ) {
					av.push(this.#generate(a, stack));
				}
				switch (tree.callee) {
				case 'ISNULL':
					return { op: 'isnull', av };
				case 'TYPEOF':
					return { op: 'typeof', av };
				case 'COALESCE':
					return { op: 'coalesce', av };
				}
				throw new Error(`Unknown pseudo function ${tree?.callee ?? ''}`);
			}
		case 'VariableLookup':
			{
				if (! (tree.name && (typeof(tree.name) === 'string'))) {
					throw new Error(`Non-string constant name in lookup`);
				}
				let key = CONSTANT_PREFIX + tree.name;
				let found = false;
				for (let i = stack.length - 1; i >= 0; i--) {
					if (stack[i].has(key)) {
						found = true;
						break;
					}
				}
				if (! found) {
					throw new Error(`Unknown constant name '${tree.name}' in lookup`);
				}
				return { op: 'lookup', av: [ tree.name ] };
			}
		case 'WithExpression':
			{
				let av = [];
				let scope = new Map();
				for (let ve of tree.assignments) {
					switch (ve.type) {
					case 'variable':
						if (ve.name && (typeof(ve.name) === 'string')) {
							let key = CONSTANT_PREFIX + ve.name;
							if (scope.has(key)) {
								throw new Error(`Duplicate constant name '${ve.name}' in WITH statement`);
							}
							scope.set(key, true);
							av.push(ve.name);
							av.push(this.#generate(ve.value, stack));
						} else {
							throw new Error(`Non-string constant name in WITH statement`);
						}
						break;
					case 'function':
						if (ve.name && (typeof(ve.name) === 'string')) {
							let key = LAMBDA_PREFIX + ve.name;
							if (scope.has(key)) {
								throw new Error(`Duplicate function name '${ve.name}' in WITH statement`);
							}
							if (ve.parameters.indexOf((x) => (! (x && (typeof(x) === 'string')))) >= 0) {
								throw new Error(`Invalid parameter name for function '${ve.name}' in WITH statement`);
							}
							if ((new Set(ve.parameters)).size !== ve.parameters.length) {
								throw new Error(`Duplicate parameter name for function '${ve.name}' in WITH statement`);
							}
							scope.set(key, { busy: false, parameters: ve.parameters, expression: ve.expression } );
						} else {
							throw new Error(`Non-string function name in WITH statement`);
						}
						break;
					default:
						throw new Error(`Unknown assignment type '${ve.type}' in WITH statement`);
					}
				}
				let err;
				try {
					stack.push(scope);
					av.push(this.#generate(tree.expression, stack));
				} catch (e) {
					err = e;
				} finally {
					stack.pop();
				}
				if (err) {
					throw err;
				}
				return { op: 'scope', av };
			}
		default:
			throw new Error(`Unknown construct ${tree?.type ?? ''}`);
		}

	}

}

(typeof(module) === 'object') && (module.exports = Generator);
