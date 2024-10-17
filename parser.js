'use strict';

class Parser {

	constructor(tokens) {
		this.#tokens = tokens;
		this.#pos = 0;
	}

	#tokens;
	#pos;

	parse() {
		const expr = this.#parseExpression();
		if (this.#currentToken() != null) {
			throw new Error(`Unexpected token at end: ${this.#tokenIdentityString(this.#currentToken())}`);
		}
		return expr;
	}

	#tokenIdentityString(token) {
		if (! (token && token.text)) {
			return 'EOF';
		}
		let s = `'${token.text}'`;
		if (Number.isSafeInteger(token.line)) {
			s += ` (line: ${token.line}`;
			if (Number.isSafeInteger(token.column)) {
				s += `, column: ${token.column}`;
			}
			s += ')';
		}
		return s;
	}

	#currentToken() {
		return this.#tokens[this.#pos];
	}

	#nextToken() {
		this.#pos++;
		return this.#currentToken();
	}

	#expectToken(type, text) {
		const token = this.#currentToken();
		if (token && token.type === type && (text === undefined || token.text === text)) {
			this.#nextToken();
			return token;
		}
		throw new Error(
			`Expected token type '${type}'${text ? " with text '" + text + "'" : ""
				}, but got ${this.#tokenIdentityString(this.#currentToken())}`
		);
	}

	#currentTokenIsReserved(text) {
		const token = this.#currentToken();
		return token && token.type === 'Reserved' && token.text === text;
	}

	#expectReserved(text) {
		const token = this.#currentToken();
		if (token && token.type === 'Reserved' && token.text === text) {
			this.#nextToken();
			return token;
		}
		throw new Error(
			`Expected reserved word '${text}', but got ${this.#tokenIdentityString(this.#currentToken())}`
		);
	}

	#currentTokenIsOperator(op) {
		const token = this.#currentToken();
		return token && token.type === 'Operator' && (op === undefined || token.text === op)
	}

	#currentTokenIsIdentifier(op) {
		const token = this.#currentToken();
		return token && token.type === 'Identifier' && (op === undefined || token.text === op)
	}

	#expectOperator(op) {
		const token = this.#currentToken();
		if (token && token.type === 'Operator' && (op === undefined || token.text === op)) {
			this.#nextToken();
			return token;
		}
		throw new Error(
			`Expected operator '${op}', but got ${this.#tokenIdentityString(this.#currentToken())}`
		);
	}

	#currentTokenIsParenthesis(p) {
		const token = this.#currentToken();
		return token && token.type === 'Parenthesis' && token.text === p;
	}

	#expectParenthesis(p) {
		const token = this.#currentToken();
		if (token && token.type === 'Parenthesis' && token.text === p) {
			this.#nextToken();
			return token;
		}
		throw new Error(
			`Expected parenthesis '${p}', but got ${this.#tokenIdentityString(this.#currentToken())}`
		);
	}

	#parseExpression() {
		return this.#parseTernaryConditionExpression();
	}

	#parseTernaryConditionExpression() {
		let expression1 = this.#parseWithExpression();
		if (! this.#currentTokenIsOperator('?')) {
			return expression1;
		}
		this.#expectOperator('?');
		let expression2 = this.#parseExpression();
		this.#expectOperator(':');
		let expression3 = this.#parseExpression();
		return { type: 'TernaryConditionExpression',
				 condition: expression1,
				 iftrue: expression2,
				 otherwise: expression3 };
	}

	#parseWithExpression() {
		if (this.#currentTokenIsReserved('WITH')) {
			return this.#parseWithConstruct();
		}
		return this.#parseCaseExpression();
	}

	#parseWithConstruct() {
		this.#expectReserved('WITH');
		let variables = [];
		this.#expectParenthesis('(');
		if (!this.#currentTokenIsParenthesis(')')) {
			while (true) {
				const identifier = this.#expectToken('Identifier');
				this.#expectOperator('=');
				const value = this.#parseExpression();
				variables.push({ name: identifier.text, value });
				if (this.#currentTokenIsParenthesis(')')) {
					break;
				}
				this.#expectOperator(',');
			}
		}
		this.#expectParenthesis(')');
		const expression = this.#parseExpression();
		return { type: 'WithExpression', variables, expression };
	}

	#parseCaseExpression() {
		if (this.#currentTokenIsReserved('CASE') || this.#currentTokenIsReserved('DEFAULT')) {
			return this.#parseCaseConstruct();
		}
		return this.#parsePseudoFunctionCall();
	}

	#parseCaseConstruct() {
		let cases = [];
		while (this.#currentTokenIsReserved('CASE')) {
			this.#expectReserved('CASE');
			const condition = this.#parseExpression();
			this.#expectReserved('CHOOSE');
			const value = this.#parseExpression();
			cases.push({ condition, value });
		}
		this.#expectReserved('DEFAULT');
		const defaultExpr = this.#parseExpression();
		return { type: 'CaseExpression', cases, defaultExpr: defaultExpr };
	}

	#parsePseudoFunctionCall() {
		let token = this.#currentToken();
		if (token && token.type === 'Reserved' && [ 'COALESCE', 'ISNULL' ].includes(token.text)) {
			this.#nextToken();
			let args = this.#parseArgumentList();
			switch (token.text) {
			case 'ISNULL':
				if (args.length != 1) {
					throw new Error(`Unexpected number of arguments: ${this.#tokenIdentityString(token)}`);
				}
				return { type: 'PseudoCallExpression', callee: 'ISNULL', arguments: args };
			case 'COALESCE':
				return { type: 'PseudoCallExpression', callee: 'COALESCE', arguments: args };
			}
		}
		return this.#parseLogicalOr();
	}

	#parseLogicalOr() {
		let left = this.#parseLogicalAnd();
		while (this.#currentTokenIsOperator('|')) {
			const operator = this.#expectOperator('|');
			const right = this.#parseLogicalAnd();
			left = { type: 'BinaryExpression', operator: operator.text, left, right };
		}
		return left;
	}

	#parseLogicalAnd() {
		let left = this.#parseEquality();
		while (this.#currentTokenIsOperator('&')) {
			const operator = this.#expectOperator('&');
			const right = this.#parseEquality();
			left = { type: 'BinaryExpression', operator: operator.text, left, right };
		}
		return left;
	}

	#parseEquality() {
		let left = this.#parseRelational();
		while (this.#currentTokenIsOperator('=') ||
			   this.#currentTokenIsOperator('≠')) {
			const operator = this.#expectOperator();
			const right = this.#parseRelational();
			left = { type: 'BinaryExpression', operator: operator.text, left, right };
		}
		return left;
	}

	#parseRelational() {
		let left = this.#parseAdditive();
		while (this.#currentTokenIsOperator('<') ||
			   this.#currentTokenIsOperator('≤') ||
			   this.#currentTokenIsOperator('>') ||
			   this.#currentTokenIsOperator('≥')) {
			const operator = this.#expectOperator();
			const right = this.#parseAdditive();
			left = { type: 'BinaryExpression', operator: operator.text, left, right };
		}
		return left;
	}

	#parseAdditive() {
		let left = this.#parseMultiplicative();
		while (this.#currentTokenIsOperator('+') ||
			   this.#currentTokenIsOperator('-')) {
			const operator = this.#expectOperator();
			const right = this.#parseMultiplicative();
			left = { type: 'BinaryExpression', operator: operator.text, left, right };
		}
		return left;
	}

	#parseMultiplicative() {
		let left = this.#parseUnary();
		while (this.#currentTokenIsOperator('*') ||
			   this.#currentTokenIsOperator('/') ||
			   this.#currentTokenIsOperator('%')) {
			const operator = this.#expectOperator();
			const right = this.#parseUnary();
			left = { type: 'BinaryExpression', operator: operator.text, left, right };
		}
		return left;
	}

	#parseUnary() {
		if (this.#currentTokenIsOperator('!') ||
			this.#currentTokenIsOperator('+') ||
			this.#currentTokenIsOperator('-')) {
			const operator = this.#expectOperator();
			const operand = this.#parseUnary();
			return { type: 'UnaryExpression', operator: operator.text, operand };
		}
		return this.#parsePrimary();
	}

	#parsePrimary() {
		const token = this.#currentToken();
		if (token == null) {
			throw new Error(`Unexpected end of input`);
		}
		if (token.type === 'Literal') {
			this.#nextToken();
			return { type: 'Literal', value: token.value, raw: token.text };
		} else if (token.type === 'Identifier') {
			return this.#parseFunctionCallOrVariableLookup();
		} else if (token.type === 'Parenthesis' && token.text === '(') {
			this.#expectParenthesis('(');
			const expr = this.#parseExpression();
			this.#expectParenthesis(')');
			return expr;
		}
		throw new Error(`Unexpected token: ${this.#tokenIdentityString(this.#currentToken())}`);
	}

	#parseFunctionCallOrVariableLookup() {
		const nameToken = this.#expectToken('Identifier');
		const name = nameToken.text;
		if (this.#currentTokenIsParenthesis('(')) {
			const args = this.#parseArgumentList();
			return { type: 'CallExpression', callee: name, arguments: args };
		}
		return { type: 'VariableLookup', name: name };
	}

	#parseArgumentList() {
		this.#expectParenthesis('(');
		const args = [];
		if (!this.#currentTokenIsParenthesis(')')) {
			while (true) {
				const arg = this.#parseExpression();
				args.push(arg);
				if (this.#currentTokenIsOperator(',')) {
					this.#expectOperator(',');
				} else {
					break;
				}
			}
		}
		this.#expectParenthesis(')');
		return args;
	}

}

module.exports = Parser;
