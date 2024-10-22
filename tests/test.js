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

async function test(exp, expectedResult, bigLimits) {
	try {
		let l = new Lexer();
		l.update(exp)
		let tokens = l.final();
		let p = new Parser(tokens);
		let tree = p.parse()
		let limits = bigLimits ? 1000000 : {}
		let g = new Generator(tree);
		let expr = g.generate();
		let c = new Evaluator(expr, { calls, limits } );
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
	try {
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

		await test(`

WITH(a(x,y)=(x+y))a(a(a(a(a(a(a(a(a(a(4,3),a(2,8)),a(a(5,1),a(0,8))),a(a(a(2,7),a(5,5)),a(a(7,5),a(8,1)))),a(a(a(a(8,9),a(9,3)),a(4,a(1,1))),a(a(a(4,7),a(5,9)),a(a(9,0),a(6,1))))),a(a(a(a(a(1,7),a(6,4)),a(a(7,6),a(7,5))),a(a(a(5,4),a(4,0)),a(a(8,0),a(7,8)))),a(a(a(a(4,8),a(2,7)),a(a(8,4),a(9,5))),a(a(a(4,5),a(6,9)),a(a(9,9),a(9,9)))))),a(a(a(a(a(a(4,5),a(3,9)),a(a(3,0),a(6,6))),a(a(a(4,0),a(1,2)),5)),a(a(a(a(4,5),a(6,9)),a(a(6,0),a(7,9))),a(a(a(5,7),a(7,8)),a(a(1,1),a(9,5))))),a(a(a(a(a(2,7),a(3,7)),a(a(4,6),a(7,0))),a(a(a(7,5),a(6,6)),a(a(0,4),a(8,5)))),a(a(a(a(6,3),a(2,5)),a(a(1,6),a(3,2))),a(a(a(8,7),a(7,9)),a(a(6,2),a(6,2))))))),a(a(a(a(a(8,a(a(2,7),a(7,3))),a(a(a(9,2),a(1,9)),a(a(3,6),a(8,8)))),a(a(a(a(2,6),a(5,0)),a(a(0,0),a(7,7))),a(a(a(9,8),4),a(a(8,9),a(0,1))))),5),a(a(a(a(a(a(7,8),a(4,8)),a(a(9,2),a(4,9))),a(a(a(3,9),a(5,1)),a(a(8,3),a(1,7)))),a(8,a(a(a(5,3),a(7,3)),a(a(3,0),a(4,9))))),a(a(1,a(a(a(7,1),a(1,3)),a(a(6,6),a(2,9)))),a(a(a(a(2,5),a(4,1)),a(a(1,2),a(0,4))),a(a(a(5,3),a(2,2)),a(a(8,1),a(4,1)))))))),a(a(a(a(a(a(a(a(6,3),a(2,7)),a(a(3,1),a(4,3))),a(a(a(9,6),a(8,5)),a(a(1,5),a(2,0)))),a(a(a(a(4,1),a(7,7)),a(a(9,4),a(0,2))),a(a(9,a(3,0)),a(a(4,7),a(4,2))))),a(a(a(a(a(5,1),a(4,3)),a(a(2,3),a(2,3))),a(a(a(3,0),a(1,6)),a(a(7,0),a(4,9)))),a(a(a(a(9,5),a(7,6)),a(a(8,4),a(7,6))),a(a(a(8,0),a(4,4)),a(a(5,9),a(0,1)))))),4),a(a(2,a(a(a(a(a(7,3),a(9,6)),a(a(4,6),a(2,7))),a(7,6)),a(a(a(a(2,3),a(7,1)),a(a(2,9),a(9,0))),a(a(a(5,7),a(6,4)),a(a(6,7),a(4,5)))))),a(a(a(a(5,a(a(4,8),a(1,4))),a(a(a(1,0),a(2,9)),a(a(7,3),a(8,7)))),a(a(a(a(3,6),a(6,0)),a(a(2,1),a(4,9))),a(a(2,a(1,2)),a(a(2,0),a(6,7))))),a(a(1,a(a(a(5,4),a(8,5)),a(a(4,6),a(6,0)))),a(a(a(a(8,7),a(7,6)),a(a(8,3),a(1,1))),a(a(a(7,4),a(8,6)),a(a(6,2),a(7,2))))))))),a(a(a(a(a(a(a(a(a(4,7),a(3,0)),a(a(3,6),a(2,6))),a(a(a(9,1),a(7,3)),a(8,a(0,0)))),a(a(a(8,a(5,9)),a(3,a(7,8))),a(a(a(5,8),a(7,3)),a(a(5,6),a(3,2))))),a(a(a(a(a(6,4),a(1,7)),a(a(4,8),a(4,3))),a(a(a(2,9),a(7,4)),6)),a(a(a(a(8,6),a(3,7)),a(a(6,1),a(8,6))),a(a(a(1,7),a(7,0)),a(a(0,5),a(8,0)))))),a(a(a(a(2,a(1,a(3,7))),a(a(a(6,1),a(5,5)),a(a(5,3),a(3,4)))),a(a(a(a(5,3),a(5,1)),a(a(0,7),a(1,7))),a(a(a(4,9),a(1,4)),a(a(9,5),a(5,1))))),a(a(7,a(a(a(0,7),a(9,9)),a(a(4,6),a(4,9)))),9))),a(a(a(a(a(a(a(7,1),a(8,6)),a(6,a(6,8))),a(7,a(a(4,9),a(1,8)))),a(a(a(a(4,2),0),a(a(0,1),a(1,6))),a(a(a(8,8),a(5,9)),a(1,a(3,8))))),a(a(a(a(a(9,1),a(3,4)),a(a(3,4),a(4,6))),a(5,a(a(4,6),a(7,3)))),a(a(a(0,a(0,9)),a(a(4,1),a(9,2))),a(a(a(1,1),a(5,8)),2)))),a(a(a(a(a(a(6,0),a(2,6)),a(a(0,8),a(9,3))),a(a(3,a(6,4)),a(a(4,0),a(0,0)))),a(a(a(a(8,9),a(3,4)),a(a(4,3),a(0,8))),a(a(a(4,4),a(8,2)),1))),a(a(a(a(a(3,1),a(2,0)),a(a(0,0),a(3,6))),a(a(a(3,6),a(0,6)),a(a(0,5),a(3,1)))),a(a(a(a(4,6),a(2,5)),a(4,a(1,8))),a(a(a(9,8),a(9,7)),a(a(2,9),a(8,2)))))))),a(a(7,a(a(a(a(a(a(4,3),a(3,4)),a(a(9,8),a(5,3))),a(a(a(7,9),a(0,2)),a(a(8,9),a(3,5)))),a(a(a(a(9,8),a(2,1)),a(a(2,2),a(0,9))),a(a(a(7,5),a(8,9)),a(a(3,3),a(0,1))))),a(a(a(4,a(a(8,8),a(7,6))),a(a(a(7,1),a(1,7)),a(a(3,2),8))),a(a(a(a(5,3),a(1,9)),a(a(7,8),a(3,4))),a(a(a(8,9),a(1,9)),a(a(6,6),a(6,3))))))),a(a(a(a(a(a(a(3,2),4),a(a(1,5),a(4,4))),a(a(a(9,0),5),a(a(4,7),a(5,2)))),a(a(a(a(8,1),a(4,1)),a(a(0,1),a(7,1))),a(a(a(1,9),a(1,9)),a(a(4,1),a(6,6))))),a(3,a(a(a(a(3,8),3),a(a(1,2),a(3,3))),a(a(a(1,6),a(2,4)),a(a(2,3),a(2,1)))))),5))))

`, 3000, true);

	} catch (e) {
		console.log(e);
		process.exit(1);
	}

})();

