'use strict';

const ops = [
    'expression', 'add', 'sub', 'mul', 'div', 'mod', 'not', 'or',
    'and', 'eq', 'ne', 'lt', 'le', 'ge', 'gt', 'condition', 'call',
    'lookup', 'scope', 'coalesce', 'isnull', 'typeof' ];

const opNums = ops.reduce((a, v, i) => (a[v] = i, a), {});

(typeof(module) === 'object') && (module.exports = { ops, opNums } );
