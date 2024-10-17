'use strict';

const tau = 2 * Math.PI;
const phi = (1 + Math.sqrt(5)) / 2;

function constant(...av) {
	if (av.length != 1) {
		return undefined;
	}
	switch (av[0]) {
	case 'zero':
	case '0':
		return 0;
	case 'one':
	case '1':
		return 1;
	case 'two':
	case '2':
		return 1;
	case 'e':
		return Math.E;
	case 'pi':
		return Math.PI;
	case 'tau':
		return tau;
	case 'phi':
		return phi;
	}
	return null;
}

function random(...av) {
	if (av.length != 0) {
		return undefined;
	}
	return Math.random();
}

function mathExec1(name, av) {
	if (av.length != 1) {
		return undefined;
	}
	if (! Number.isFinite(av[0])) {
		return null;
	}
	try {
		let r = Math[name](av[0]);
		return Number.isFinite(r) ? r : null;
	} catch (e) {
		return null;
	}
}

function mathExec2(name, av) {
	if (av.length != 2) {
		return undefined;
	}
	if (! (Number.isFinite(av[0]) && Number.isFinite(av[1]))) {
		return null;
	}
	try {
		let r = Math[name](av[0], av[1]);
		return Number.isFinite(r) ? r : null;
	} catch (e) {
		return null;
	}
}

function average(...av) {
	av = av.filter((x) => (x !== null));
	if ((av.length < 1) || (av.findIndex((x) => (! Number.isFinite(x))) >= 0)) {
		return null;
	}
	let r = 0;
	for (let a of av) {
		r += a / av.length;
	}
	if (! Number.isFinite(r)) {
		return Number.isFinite(r) ? r : null;
	}
	return r;
}

module.exports = {
	average: average,
	constant: constant,
	random: random,
	abs: (...av) => mathExec1('abs', av),
	acos: (...av) => mathExec1('acos', av),
	acosh: (...av) => mathExec1('acosh', av),
	asin: (...av) => mathExec1('asin', av),
	asinh: (...av) => mathExec1('asinh', av),
	atan: (...av) => mathExec1('atan', av),
	atanh: (...av) => mathExec1('atanh', av),
	cbrt: (...av) => mathExec1('cbrt', av),
	ceil: (...av) => mathExec1('ceil', av),
	cos: (...av) => mathExec1('cos', av),
	cosh: (...av) => mathExec1('cosh', av),
	exp: (...av) => mathExec1('exp', av),
	floor: (...av) => mathExec1('floor', av),
	log: (...av) => mathExec1('log', av),
	log10: (...av) => mathExec1('log10', av),
	log2: (...av) => mathExec1('log2', av),
	round: (...av) => mathExec1('round', av),
	sign: (...av) => mathExec1('sign', av),
	sin: (...av) => mathExec1('sin', av),
	sinh: (...av) => mathExec1('sinh', av),
	sqrt: (...av) => mathExec1('sqrt', av),
	tan: (...av) => mathExec1('tan', av),
	tanh: (...av) => mathExec1('tanh', av),
	trunc: (...av) => mathExec1('trunc', av),
	atan2: (...av) => mathExec2('atan2', av),
	hypot: (...av) => mathExec2('hypot', av),
	pow: (...av) => mathExec2('pow', av)
};
