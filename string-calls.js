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

module.exports = { strcat, strjoin, strlen };
