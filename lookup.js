'use strict';

class Lookup {

	constructor(name, value) {
		if (typeof(name) !== 'string') {
			throw new Error('Invalid call callback name');
		}
		this.#name = name;
		this.#value = {};
		this.append(value);
	}

	#name;
	#value;

	append(value) {
		this.#set(value, false);
	}

	set(value) {
		this.#set(value, true);
	}

	cb() {
		return (async function(...av) {
			if (av.length != 1) {
				return undefined;
			}
			if (typeof(av[0]) !== 'string') {
				return null;
			}
			let x = this.#value[av[0]];
			if (! ((Number.isFinite(x) || (typeof(x) === 'string') || (typeof(x) === 'boolean')))) {
				return null;
			}
			return x;
		}.bind(this));
	}

	#set(value, clear) {
		if (clear) {
			for (let k of Object.keys(this.#value)) {
				delete this.#value[k];
			}
		}
		for (let k of ((value === undefined) || (value === null)) ? [] : Object.keys(value)) {
			let x = value[k];
			if ((Number.isFinite(x) || (typeof(x) === 'string') || (typeof(x) === 'boolean'))) {
				this.#value[k] = x;
			} else {
				delete this.#value[k];
			}
		}
	}

}

module.exports = Lookup;
