'use strict';

class Linearizer {

    constructor(input) {
		if (! (Linearizer.opName && Linearizer.opNumber)) {
			let ops = require('./ops');
			if (typeof(opName) === 'function') {
				Linearizer.opName = opName;
			} else {
				Linearizer.opName = ops.opName;
			}
			if (typeof(opNumber) === 'function') {
				Linearizer.opNumber = opNumber;
			} else {
				Linearizer.opNumber = ops.opNumber;
			}
		}
		this.#input = input;
	}

	#opName;
	#opNumber;
	#input;
	#imploded;
	#exploded;

	implode() {
		if (this.#imploded) {
			return this.#imploded;
		}
		this.#imploded = this.#implode(this.#input);
		return this.#imploded;
	}
	
	explode() {
		if (this.#exploded) {
			return this.#exploded;
		}
		this.#exploded = this.#explode(this.#input);
		return this.#exploded;
	}

	#implode(x) {
		if (Array.isArray(x) && (x.length >= 1) && (Linearizer.opName(x[0]) !== undefined)) {
			let r = [ x[0] ];
			for (let a of x.slice(1)) {
				r.push(this.#implode(a));
			}
			return r;
		} else if (x && (typeof(x) === 'object') && (typeof(x.op) === 'string') && (Array.isArray(x.av))) {
			let r = [];
			r.push(Linearizer.opNumber(x.op));
			for (let a of x.av) {
				r.push(this.#implode(a));
			}
			return r;
		} else if (this.#validScalar(x)) {
			return x;
		}
		throw new Error('Invalid input');
	}

	#explode(x) {
		if (Array.isArray(x) && (x.length >= 1)) {
			let r = { op: Linearizer.opName(x[0]), av: [] };
			for (let a of x.slice(1)) {
				r.av.push(this.#explode(a));
			}
			return r;
		} else if (x && (typeof(x) === 'object') && (typeof(x.op) === 'string') && (Linearizer.opNumber(x.op) !== undefined) && (Array.isArray(x.av))) {
			let r = { op: x.op, av: [] };
			for (let a of x.av) {
				r.av.push(this.#explode(a));
			}
			return r;
		} else if (this.#validScalar(x)) {
			return x;
		}
		throw new Error('Invalid input');
	}

	#validScalar(x) {
		return ((x === null) || Number.isFinite(x) || (typeof(x) === 'string') || (typeof(x) === 'boolean'));
	}
}

(typeof(module) === 'object') && (module.exports = Linearizer);
