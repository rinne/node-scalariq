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
				return { op: '+', av: [ 0, this.#generate(tree.operand, false) ] };
			case '-':
				return { op: '-', av: [ 0, this.#generate(tree.operand, false) ] };
			case '!':
				return { op: 'not', av: [ this.#generate(tree.operand, false) ] };
			default:
				throw new Error(`Unknown unary operator ${tree?.text ?? ''}`);
			}
		case 'BinaryExpression':
			switch (tree.operator) {
			case '|':
			case '&':
			case '+':
			case '-':
			case '*':
			case '/':
			case '%':
			case '<':
			case '≤':
			case '=':
			case '≠':
			case '≥':
			case '>':
				{
					let op;
					switch (tree.operator) {
					case '&':
						op = 'and';
						break;
					case '|':
						op = 'or';
						break;
					default:
						op = tree.operator;
					}
					return { op, av: [ this.#generate(tree.left, false), this.#generate(tree.right, false) ] };
				}
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
				for (let ve of tree.variables) {
					av.push(ve.name);
					av.push(this.#generate(ve.value, false));
				}
				av.push(this.#generate(tree.expression, false));
				return { op: 'with', av };
			}
		default:
			throw new Error(`Unknown construct ${tree?.type ?? ''}`);
		}

	}

}

(typeof(module) === 'object') && (module.exports = Generator);
