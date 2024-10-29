'use strict';

const [ opName, opNumber ] = (function() {
	let opNumbers = new Map(
		[ [ 'expression', 0 ],
		  [ 'add', 1 ],
		  [ 'sub', 2 ],
		  [ 'mul', 3 ],
		  [ 'div', 4 ],
		  [ 'mod', 5 ],
		  [ 'not', 6 ],
		  [ 'or', 7 ],
		  [ 'and', 8 ],
		  [ 'eq', 9 ],
		  [ 'ne', 10 ],
		  [ 'lt', 11 ],
		  [ 'le', 12 ],
		  [ 'ge', 13 ],
		  [ 'gt', 14 ],
		  [ 'condition', 15 ],
		  [ 'call', 16 ],
		  [ 'lookup', 17 ],
		  [ 'scope', 18 ],
		  [ 'coalesce', 19 ],
		  [ 'isnull', 20 ],
		  [ 'typeof', 21 ] ]
	);
	let opNames = new Map(Array.from(opNumbers.entries()).map((x)=>([x[1],x[0]])));
	return [
		function(num) {
			let r = opNames.get(num);
			if (r === undefined) {
				throw new Error(`Unknown op number #${num}`);
			}
			return r;
		},
		function(name) {
			let r = opNumbers.get(name);
			if (r === undefined) {
				throw new Error(`Unknown op name '${num}'`);
			}
			return r;
		}
	];
})();

(typeof(module) === 'object') && (module.exports = { opName, opNumber } );
