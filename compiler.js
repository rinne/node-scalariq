'use strict';

const Lexer = require('./lexer');
const Parser = require('./parser');
const Generator = require('./generator');

const { createReadStream } = require('node:fs');

function compileString(input) {
	let l = new Lexer();
	l.update(input);
	let tokens = l.final();
	let p = new Parser(tokens);
	let tree = p.parse()
	let g = new Generator(tree);
	let expression = g.generate();
	return expression;
}

async function compileFile(filename) {
	return compileReadableStream(createReadStream(filename));
}

async function compileReadableStream(readable) {
	let l = new Lexer();
	let tokens = await new Promise(function(resolve, reject) {
		let l = new Lexer();
		function error(e) {
			return reject(e);
		}
		function end() {
			try {
				return resolve(l.final());
			} catch (e) {
				return reject(e);
			}
		}
		function data(d) {
			try {
				l.update(d);
			} catch (e) {
				return reject(e);
			}
		}
		readable.on('error', error);
		readable.on('end', end);
		readable.on('data', data);
	});
	let p = new Parser(tokens);
	let tree = p.parse()
	let g = new Generator(tree);
	let expression = g.generate();
	return expression;
}

module.exports = { compileString, compileFile, compileReadableStream };
