'use strict';

const { compileString } = require('../index');

(async function() {

    const expression = compileString(`

      WITH (min=18,max=22,t=temperature())
        CASE ISNULL(t) CHOOSE 'safety-mode'
        CASE t<min CHOOSE 'heating-mode'
        CASE t>max CHOOSE 'cooling-mode'
        DEFAULT 'idle-mode'

`);

    const r = await fetch('http://127.0.0.1:3000/evaluate', {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(expression)
    });

    const response = await r.json();

	const result = (response?.status === 'ok') ? response?.result : undefined;

	if (result === undefined) {
		process.exit(1);
	}
	console.log(result);
	process.exit(0);

})();
