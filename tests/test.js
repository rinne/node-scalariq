'use strict';

const { Lexer, Parser, Generator, Evaluator } = require('../index');

const Lookup = require('../lookup');

var testLookup = new Lookup('test_lookup',
							{ zero: 0,
							  one: 1,
							  two: 2,
							  three: 3,
							  four: 4,
							  five: 5,
							  six: 6,
							  seven: {},
							  eight: function(){},
							  nine: 9,
							  'true': true,
							  'false': false,
							  'empty string': '',
							  'lazy dog': 'The quick brown fox jumps over the lazy dog' });

const calls = Object.assign( {},
							 require('../math-calls'),
							 require('../string-calls'),
							 require('../time-calls'),
							 { test_lookup: testLookup.cb() } );

async function test(exp, expectedResult) {
	try {
		let l = new Lexer();
		l.update(exp)
		let tokens = l.final();
		let p = new Parser(tokens);
		let tree = p.parse()
		let g = new Generator(tree);
		let expr = g.generate();
		let c = new Evaluator(expr, { calls } );
		let result = await c.evaluate();
		if (result !== expectedResult) {
			throw new Error(`Unexpected result ${result}, when expecting ${expectedResult}.`);
		}
	} catch (e) {
		console.log(e);
		throw e;
	}
}

(async function() {
	await test('1', 1);
	await test('round(1 + constant("pi") * 100)', 315);
	await test('floor(random())', 0);
	await test('test_lookup("one")', 1);
	await test('test_lookup("two")', 2);
	await test('test_lookup("true")', true);
	await test('test_lookup("empty string")', '');
	await test('test_lookup("something totally unset")', null);
	testLookup.append({ something: 1 });
	await test('test_lookup("something")', 1);
	testLookup.append({ something: 2 });
	await test('test_lookup("something")', 2);
	testLookup.append({ something: true });
	await test('test_lookup("something")', true);
	testLookup.append({ something: 'foo' });
	await test('test_lookup("something")', 'foo');
	testLookup.append({ something: null });
	await test('test_lookup("something totally unset")', null);
	await test('WITH (a=1) WITH (b=a) WITH (a=b+a) WITH (b=a+b) WITH (a=b+a) WITH (b=a+b) WITH (a=b+a) WITH (b=a+b) WITH (a=b+a) WITH (b=a+b) WITH (a=b+a) a', 89);
	await test(`
	(WITH (s(a,b) = (a+b))
	 (WITH (t() = 10, u(x) = x+1)
	  s(6,5)=u(t())))
`, true);
})();

