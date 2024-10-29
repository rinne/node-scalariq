'use strict';

const compiler = require('./compiler');

module.exports = {
	Lexer: require('./lexer'),
	Parser: require('./parser'),
	Generator: require('./generator'),
	Optimizer: require('./optimizer'),
	Evaluator: require('./evaluator'),
	Linearizer: require('./linearizer'),
	compileString: compiler.compileString,
	compileFile: compiler.compileFile,
	compileReadableStream: compiler.compileReadableStream
};
