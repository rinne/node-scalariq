'use strict';

function is_boolean(...av) {
	if (av.length != 1) {
		return undefined;
	}
	return (typeof(av[0]) === 'boolean');
}

function is_number(...av) {
	if (av.length != 1) {
		return undefined;
	}
	return (Number.isFinite(av[0]));
}

function is_string(...av) {
	if (av.length != 1) {
		return undefined;
	}
	return (typeof(av[0]) === 'string');
}

{
	let ex = { is_boolean, is_number, is_string };
	if (typeof(module) === 'object') {
		module.exports = ex;
	}
	if (typeof(scalariqExt) === 'object') {
		scalariqExt['type'] = { name: "Type utilities", calls: ex };
	}
}
