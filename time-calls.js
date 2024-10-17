'use strict';

async function timeExec(...av) {
	if (av.length !== 1) {
		return undefined;
	}
	let now = Date.now();
	switch (av[0]) {
	case 'millisecond':
		return Math.floor(now);
	case 'second':
		return Math.floor(now / 1000);
	case 'minute':
		return Math.floor(now / 60000);
	case 'quarter':
		return Math.floor(now / 900000);
	case 'hour':
		return Math.floor(now / 3600000);
	case 'day':
		return Math.floor(now / 86400000);
	}
	return null;
}

module.exports = {
	millisecond: (...av) => timeExec('millisecond', av),
	second: (...av) => timeExec('second', av),
	minute: (...av) => timeExec('minute', av),
	quarter: (...av) => timeExec('quarter', av),
	hour: (...av) => timeExec('hour', av),
	day: (...av) => timeExec('day', av)
}
