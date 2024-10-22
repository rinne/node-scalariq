'use strict';

function strcat(...av) {
	if (av.findIndex((s) => (typeof(s) !== 'string')) >= 0) {
		return null;
	}
	return av.join('');
}

function strjoin(...av) {
	if ((av.length < 1) || (av.findIndex((s) => (typeof(s) !== 'string')) >= 0)) {
		return null;
	}
	let glue = av.shift()
	return av.join(glue);
}

function strlen(...av) {
	if ((av.length != 1) || (typeof(av[0]) !== 'string')) {
		return null;
	}
	return av[0].length;
}

function to_string(...av) {
	if ((av.length != 1) && (av.length != 2)) {
		return null;
	}
	let x = av[0];

	if (x === null) {
		return 'NULL';
	}
	if (x === true) {
		return 'TRUE';
	}
	if (x === false) {
		return 'FALSE';
	}
	if (Number.isFinite(x)) {
		let p = 16;
		if (av.length == 2) {
			if (Number.isSafeInteger(av[1]) && (av[1] >= 1) && (av[1] <= 100)) {
				p = av[1];
			} else if (! ((av[1] === null) || (av[1] === undefined))) {
				return null;
			}
		}
		return x.toPrecision(p);
	}
	if (typeof(x) === 'string') {
		return x;
	}
	return null;
}

{
	let ex = { strcat, strjoin, strlen, to_string };
	if (typeof(module) === 'object') {
		module.exports = ex;
	}
	if (typeof(scalariqExt) === 'object') {
		scalariqExt['string'] = { name: "String manipulation utilities", calls: ex };
	}
}
