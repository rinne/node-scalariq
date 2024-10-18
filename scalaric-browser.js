'use strict';

const externalFunctions = [ { name: "String", value: "string" }, { name: "Time", value: "time" }, { name: "Math", value: "math" } ];

function compile(input) {
	try {
		let l = new Lexer();
		l.update(input);
		let tokens = l.final();
		let p = new Parser(tokens);
		let tree = p.parse()
		let g = new Generator(tree);
		let expression = g.generate();
		return JSON.stringify(expression, null, 2);
	} catch (e) {
		alert(e.message);
		return undefined;
	}
}

async function evaluate(expression, externalFunctionsEnabled) {

	try {
		let p = JSON.parse(expression);
		let c = new Evaluator(p);
		let r = await c.evaluate(expression);
		return JSON.stringify(r);
	} catch (e) {
		alert(e.message);
		return undefined;
	}

}
