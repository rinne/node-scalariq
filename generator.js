'use strict';

class Generator {

    constructor(tree) {
        this.#tree = tree;
    }

	#tree;

	generate() {
		return this.#generate(this.#tree, true);
	}

	#generate(tree, root) {
		switch (tree?.type) {
		case 'Literal':
			if (root) {
				return { op: 'expression', av: [ tree.value ] };
			}
			return tree.value;
		case 'UnaryExpression':
			switch (tree.operator) {
			case '+':
				return { op: 'add', av: [ 0, this.#generate(tree.operand, false) ] };
			case '-':
				return { op: 'sub', av: [ 0, this.#generate(tree.operand, false) ] };
			case '!':
				return { op: 'not', av: [ this.#generate(tree.operand, false) ] };
			default:
				throw new Error(`Unknown unary operator ${tree?.text ?? ''}`);
			}
		case 'BinaryExpression':
			switch (tree.operator) {
			case '|':
				return { op: 'or', av: [ this.#generate(tree.left, false), this.#generate(tree.right, false) ] };
			case '&':
				return { op: 'and', av: [ this.#generate(tree.left, false), this.#generate(tree.right, false) ] };
			case '+':
				return { op: 'add', av: [ this.#generate(tree.left, false), this.#generate(tree.right, false) ] };
			case '-':
				return { op: 'sub', av: [ this.#generate(tree.left, false), this.#generate(tree.right, false) ] };
			case '*':
				return { op: 'mul', av: [ this.#generate(tree.left, false), this.#generate(tree.right, false) ] };
			case '/':
				return { op: 'div', av: [ this.#generate(tree.left, false), this.#generate(tree.right, false) ] };
			case '%':
				return { op: 'mod', av: [ this.#generate(tree.left, false), this.#generate(tree.right, false) ] };
			case '<':
				return { op: 'lt', av: [ this.#generate(tree.left, false), this.#generate(tree.right, false) ] };
			case '≤':
				return { op: 'le', av: [ this.#generate(tree.left, false), this.#generate(tree.right, false) ] };
			case '=':
				return { op: 'eq', av: [ this.#generate(tree.left, false), this.#generate(tree.right, false) ] };
			case '≠':
				return { op: 'ne', av: [ this.#generate(tree.left, false), this.#generate(tree.right, false) ] };
			case '≥':
				return { op: 'ge', av: [ this.#generate(tree.left, false), this.#generate(tree.right, false) ] };
			case '>':
				return { op: 'gt', av: [ this.#generate(tree.left, false), this.#generate(tree.right, false) ] };
			default:
				throw new Error(`Unknown binary operator ${tree?.operator ?? ''}`);
			}
		case 'CaseExpression':
			{
				let av = [];
				for (let c of tree.cases) {
					av.push(this.#generate(c.condition, false), this.#generate(c.value, false));
				}
				av.push(this.#generate(tree.defaultExpr, false));
				return { op: 'condition', av };
				
			}
		case 'TernaryConditionExpression':
			{
				let av = [ this.#generate(tree.condition, false),
						   this.#generate(tree.iftrue, false),
						   this.#generate(tree.otherwise, false) ];
				return { op: 'condition', av };
			}
		case 'CallExpression':
			{
				let av = [ tree.callee ];
				for (let a of tree.arguments ) {
					av.push(this.#generate(a, false));
				}
				return { op: 'call', av };
			}
		case 'PseudoCallExpression':
			{
				let av = [];
				for (let a of tree.arguments ) {
					av.push(this.#generate(a, false));
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
		case 'Identifier':
			return { op: 'call', av: [ tree.name ] };
		case 'VariableLookup':
			return { op: 'lookup', av: [ tree.name ] };
		case 'WithExpression':
			{
				let av = [];
				let vnames = [];
				let fnames = [];
				for (let ve of tree.assignments) {
					switch (ve.type) {
					case 'variable':
						if (typeof(ve.name) === 'string') {
							if (vnames.includes(ve.name)) {
								throw new Error(`Duplicate constant name '${ve.name}' in WITH statement`);
							}
							vnames.push(ve.name);
							av.push(ve.name);
							av.push(this.#generate(ve.value, false));
						}
						break;
					case 'function':
						if (typeof(ve.name) === 'string') {
							if (fnames.includes(ve.name)) {
								throw new Error(`Duplicate function name '${ve.name}' in WITH statement`);
							}
							fnames.push(ve.name);
						}
						av.push(ve.name);
						{
							if ((new Set(ve.parameters)).size !== ve.parameters.length) {
								throw new Error(`Duplicate parameter name for function '${ve.name}' in WITH statement`);
							}
							let lav = [...ve.parameters, this.#generate(ve.expression, false) ];
							av.push( { op: 'lambda', av: lav } );
						}
						break;
					default:
						throw new Error(`Unknown assignment type '${ve.type}' in WITH statement`);
					}
				}
				av.push(this.#generate(tree.expression, false));
				return { op: 'scope', av };
			}
		default:
			throw new Error(`Unknown construct ${tree?.type ?? ''}`);
		}

	}

}

(typeof(module) === 'object') && (module.exports = Generator);
