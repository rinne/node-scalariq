'use strict';

// Reserved words
const reserved = [ 'CASE', 'CHOOSE', 'DEFAULT', 'TRUE', 'FALSE', 'NULL', 'WITH', 'ISNULL', 'COALESCE', 'TYPEOF' ];

// All operators are single non-alphanumeric characters.
const operators = [ '|', '&', '!', '+', '-', '*', '/', '%', '<', '≤', '=', '≠', '≥', '>', ',', '?', ':' ];

// Parentheses
const parentheses = ['(', ')'];

class Lexer {

	constructor() {
		this.#line = 1;
		this.#column = 1;
		this.#buf = '';
		this.#eof = false;
		this.#token = [];
	}

	update(text) {
		if (this.#eof) {
			throw new Error('Input received after EOF');
		}
		this.#buf += text;
		this.#consume();
	}

	final() {
		this.#eof = true;
		this.#consume();
		if (this.#buf.length == 0) {
			return this.#token;
		}
		this.#error();
	}

	#error(err) {
		if (! err) {
			err = 'Syntax error';
		}
		let msg = (err + ' (line ' + this.#line + ', column ' + this.#column + ')');
		throw new Error(msg);
	}

	#consume() {
		while (true) {
			if (this.#consumeWhitespace()) {
				continue;
			}
			if (this.#consumeComment()) {
				continue;
			}
			if (this.#consumeReserved()) {
				continue;
			}
			if (this.#consumeOperator()) {
				continue;
			}
			if (this.#consumeParenthesis()) {
				continue;
			}
			if (this.#consumeIdentifier()) {
				continue;
			}
			if (this.#consumeNumber()) {
				continue;
			}
			if (this.#consumeString()) {
				continue;
			}
			return;
		}
	}

	#consumeWhitespace() {
		for (let i = 0; /*NOTHING*/; i++) {
			if (/\s/.test(this.#buf[i])) {
				if (this.#buf[i] === '\n') {
					this.#column = 1;
					this.#line++;
				} else {
					this.#column++;
				}
			} else {
				if (i > 0) {
					this.#buf = this.#buf.slice(i);
					return true;
				}
				return false;
			}
		}
	}

	#consumeComment() {
		if (this.#buf[0] === '#') {
			let i;
			for (i = 1; i < this.#buf.length; i++) {
				if (this.#buf[i] === '\n') {
					this.#column = 1;
					this.#line++;
					break;
				} else {
					this.#column++;
				}
			}
			this.#buf = this.#buf.slice(i);
			return true;
		}
		return false;
	}

	#consumeReserved() {
		for (let w of reserved) {
			let wl = w.length;
			if ((this.#buf.slice(0, wl) === w) && (operators.includes(this.#buf[wl]) ||
												   parentheses.includes(this.#buf[wl]) ||
												   /\s/.test(this.#buf[wl]) ||
												   ((this.#buf.length == wl) && this.#eof))) {
				this.#buf = this.#buf.slice(wl);
				switch (w) {
				case 'TRUE':
					this.#token.push({ type: 'Literal', text: w, value: true, line: this.#line, column: this.#column });
					break;
				case 'FALSE':
					this.#token.push({ type: 'Literal', text: w, value: false, line: this.#line, column: this.#column });
					break;
				case 'NULL':
					this.#token.push({ type: 'Literal', text: w, value: null, line: this.#line, column: this.#column });
					break;
				default:
					this.#token.push({ type: 'Reserved', text: w, line: this.#line, column: this.#column });
				}
				this.#column += wl;
				return true;
			}
		}
		return false;
	}

	#consumeOperator() {
		if (operators.includes(this.#buf[0])) {
			this.#token.push({ type: 'Operator', text: this.#buf[0], line: this.#line, column: this.#column });
			this.#column++;
			this.#buf = this.#buf.slice(1);
			return true;
		}
		return false;
	}

	#consumeParenthesis() {
		if (parentheses.includes(this.#buf[0])) {
			this.#token.push({ type: 'Parenthesis', text: this.#buf[0], line: this.#line, column: this.#column });
			this.#column++;
			this.#buf = this.#buf.slice(1);
			return true;
		}
		return false;
	}

	#consumeIdentifier() {
		let m;
		if (m = this.#buf.match(/^(\p{L}[\p{L}0-9_]*)/u)) {
			let id = m[1];
			let idl = id.length;
			if (parentheses.includes(this.#buf[idl]) ||
				operators.includes(this.#buf[idl]) || 
				/\s/.test(this.#buf[idl]) ||
				((this.#buf.length == idl) && this.#eof)) {
				this.#token.push({ type: 'Identifier', text: id, line: this.#line, column: this.#column });
				this.#column += idl;
				this.#buf = this.#buf.slice(idl);
				return true;
			}
		}
		return false;
	}

	#consumeNumber() {
		let m;
		if (m = this.#buf.match(/^((0x[0-9a-fA-F]+)|(0o[0-7]+)|(0b[01]+))/)) {
			let n = m[1];
			let nl = n.length;
			if (operators.includes(this.#buf[nl]) || 
				parentheses.includes(this.#buf[nl]) || 
				/\s/.test(this.#buf[nl]) ||
				((this.#buf.length == nl) && this.#eof)) {
				let v;
				if (m[2]) {
					v = Number.parseInt(m[2].slice(2), 16);
				} else if (m[3]) {
					v = Number.parseInt(m[3].slice(2), 8);
				} else if (m[4]) {
					v = Number.parseInt(m[4].slice(2), 2);
				} else {
					this.#error('Internal compiler error');
				}
				if (! Number.isFinite(v)) {
					this.#error('Number constant overflow');
				}
				this.#token.push({ type: 'Literal', text: n, value: v, line: this.#line, column: this.#column });
				this.#column += nl;
				this.#buf = this.#buf.slice(nl);
				return true;
			}
		}
		if (m = this.#buf.match(/^((0|[1-9]\d*)(\.\d+)?(e[+-]?(0|[1-9]\d*))?)/)) {
			let n = m[1];
			let nl = n.length;
			if (operators.includes(this.#buf[nl]) || 
				parentheses.includes(this.#buf[nl]) || 
				/\s/.test(this.#buf[nl]) ||
				((this.#buf.length == nl) && this.#eof)) {
				let v = Number.parseFloat(n);
				if (! Number.isFinite(v)) {
					this.#error('Number constant overflow');
				}
				this.#token.push({ type: 'Literal', text: n, value: v, line: this.#line, column: this.#column });
				this.#column += nl;
				this.#buf = this.#buf.slice(nl);
				return true;
			}
		}
		return false;
	}

	#consumeString() {
		let m;
		if ((m = this.#buf.match(/'(([^'\\\n\r]|(\\.))*)'/)) ||
			(m = this.#buf.match(/"(([^"\\\n\r]|(\\.))*)"/))) {
			let s = m[0];
			let sl = s.length;
			if (operators.includes(this.#buf[sl]) || 
				parentheses.includes(this.#buf[sl]) || 
				/\s/.test(this.#buf[sl]) ||
				((this.#buf.length == sl) && this.#eof)) {
				let v = '';
				for (let b = m[1]; b.length > 0; /*NOTHING*/) {
					if (b[0] === '\\') {
						switch(b[1]) {
						case 'b':
							v += '\b';
							break;
						case 'f':
							v += '\f';
							break;
						case 'n':
							v += '\n';
							break;
						case 'r':
							v += '\r';
							break;
						case 't':
							v += '\t';
							break;
						case 'v':
							v += '\v';
							break;
						default:
							v += b[1];
						}
						b = b.slice(2);
					} else {
						v += b[0];
						b = b.slice(1);
					}
				}
				this.#token.push({ type: 'Literal', text: s, value: v, line: this.#line, column: this.#column });
				this.#column += sl;
				this.#buf = this.#buf.slice(sl);
				return true;
			}
		}
	}

	#line;
	#column;
	#buf;
	#eof;
	#token;

}

(typeof(module) === 'object') && (module.exports = Lexer);
