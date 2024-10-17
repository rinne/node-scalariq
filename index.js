'use strict';

const Lexer = require('./lexer');
const Parser = require('./parser');
const Generator = require('./generator');
const Evaluator = require('./evaluator');
const compiler = require('./compiler');

module.exports = {
	Lexer,
	Parser,
	Generator,
	Evaluator,
	compileString: compiler.compileString,
	compileFile: compiler.compileFile,
	compileReadableStream: compiler.compileReadableStream
};
