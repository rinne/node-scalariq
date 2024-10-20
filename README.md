# ScalarIQ -- A Portable Scalar Expression Language

## CAUTION!!!

This is work in progress.

## In a Nutshell

*ScalarIQ* is a lightweight, portable scalar expression language designed
for evaluating scalar values from diverse external inputs. It is
particularly useful for scenarios like periodically calculating
automation results from sensor data. *ScalarIQ* is not a general-purpose
programming language; it is intentionally not Turing complete, lacking
loops and recursion to ensure predictable and finite execution
time. The language evaluates expressions that reduce to a single
scalar value—number, boolean, string, or NULL.

## Author

Timo J. Rinne <tri@iki.fi>

## Copyright

### Language specification and documentation

    Copyright © 2024 Timo J. Rinne

    Permission is granted to copy, distribute and/or modify this
    document under the terms of the GNU Free Documentation License,
    Version 1.3 or any later version published by the Free Software
    Foundation; with no Invariant Sections, no Front-Cover Texts, and
    no Back-Cover Texts.  A copy of the license is included in the
    section entitled "GNU Free Documentation License".

### Reference implementation

    The MIT License

    Copyright © 2024 Timo J. Rinne <tri@iki.fi>

    Permission is hereby granted, free of charge, to any person
    obtaining a copy of this software and associated documentation
    files (the "Software"), to deal in the Software without
    restriction, including without limitation the rights to use,
    copy, modify, merge, publish, distribute, sublicense, and/or
    sell copies of the Software, and to permit persons to whom
    the Software is furnished to do so, subject to the following
    conditions:

    The above copyright notice and this permission notice shall be
    included in all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
    EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
    OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
    NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
    HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
    WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
    FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
    OTHER DEALINGS IN THE SOFTWARE.

## Rationale

In various applications, especially in automation and data processing,
there is a need to compute scalar values based on dynamic
inputs. Traditional programming languages might be overkill for such
tasks, introducing unnecessary complexity and potential performance
issues. *ScalarIQ* addresses this by providing a simple yet powerful
expression language that can be easily integrated into different
environments. Its design ensures that evaluations always terminate
within a predefined maximum number of operations, making it reliable
for real-time systems and resource-constrained applications.

## Name

*ScalarIQ* is a lightweight and efficient scalar expression language
tailored for calculating scalar values from dynamic inputs. The name
merges "Scalar" highlighting its focus on simple scalar data types
(numbers, booleans, strings, and NULL) with "IQ," signifying that
expression evaluation is an "instant query." Additionally, it reflects
that *ScalarIQ* is the smart choice for high-IQ engineers, offering a
safe and reliable solution for real-time calculations.

## Execution Model

- Every *ScalarIQ* expression reduces to a single scalar value.
- Expressions are compiled into a tree-like data structure, ensuring
  evaluation steps never exceed the number of nodes in the tree.
- The executable tree can be encoded in JSON or YAML, facilitating
  easy storage and transmission via APIs or configuration files.
- No loops nor recursion
  - The language explicitly lacks constructs for loops or
    recursion
  - This ensures finite execution with a predictable maximum number
    of executed operations for expression evaluation.
- WITH statement allows definition of constants and lambda expressions
  (= functions) for the enclosed expression. Lambdas cannot be called
  recursively.
- No built-in utility functions
  - Functions are externally provided to the evaluator.
  - A selection of functions that is offered by the evaluator
    varies according to the use case.
  - A minimum number of functions should be provided.
- Safe server side evaluation of client provided expressions
  - When expressions need to be evaluated on a server
    (e.g., for periodic automation adjustments), best practice
    involves compiling the expression client-side and transmitting
    the serialized tree via API to the server.

## Language Features

### Data Types

- Numbers
  - Internal representation of numbers should have the minimal range similar or
    exceeding to IEEE-754 double precision numbers (i.e. numeric type of e.g.
    Javascript and Python)
  - Number literals
    - Decimal integers (e.g. `42`)
    - Decimal floating poing numbers (e.g. `3.14`)
    - Scientific exponential number notation (e.g. `6.62607015e-34`)
    - Hexadecimal integers (e.g. `0xdeadbeef`)
    - Octal integers (e.g. `0o1234567`)
    - Binary integers (e.g. `0b101010`).
- Strings
  - Single-Quoted: Can include unescaped double quotes; escape with
    backslash (e.g., `'He said "hello"'`)
  - Double-Quoted: Can include unescaped single quotes; escape with
    backslash (e.g., `"It's a test"`)
  - A quote within a string can be escaped by backslash `\"` or `\'`
  - Backslash is also escaped by another backslash `\\`
  - C-language style white-space encodings (`\b`, `\f`, `\n`, `\r`,
    `\t`, `\v`) in string literals are supported.
- Booleans
  - `TRUE`, `FALSE`.
- NULL
  - A literal `NULL`
  - Return value from a function typically indicating invalid parameters or failed processing
  - A result of any calculation (arithmetic, logical, comparison) having NULL operands
  
### Operators

- Arithmetic operators
  - Addition (`+`)
  - Subtraction (`-`)
  - Multiplication (`*`)
  - Division (`/`)
  - Modulus (`%`)
- Logical operators
  - Not (`!`)
  - Or (`|`)
  - And (`&`)
- Comparison operators
  - Less Than (`<`),
  - Less Than or Equal (`≤`)
  - Equal (`=`)
  - Not Equal (`≠`)
  - Greater Than or Equal (`≥`)
  - Greater Than (`>`)

### Control structures
  - `CASE` … `CHOOSE` … `DEFAULT`
  - … `?` … `:` …

### Scope structure
  - `WITH`

### CASE Statement

Select the result from the number of choices. Default value must also be provided.

```
CASE condition1 CHOOSE result1
CASE condition2 CHOOSE result2
DEFAULT defaultResult
```

### WITH Statement

Assigns constants and functions for use within an expression.

```
WITH (a=1, b=2) a+b
```

```
WITH (sum(a,b) = a+b) sum(1,2)
```

Supports nesting, with inner WITH statements able to shadow outer constants.

In a single WITH statement, all defned constant names and all defined
function names must be unique respectively. However it's legal to have
a constant and a function with the same name. Function parameter names
must also be unique for each function.

### Nested WITH Statement With Lambdas

```
WITH (a=1,b=2,c(d,e)=d+e)
  WITH (f(g)=g+1)
    c(a,b+1)=f(a+b)
```

- `a` is `1` and `b`is `2`
- `c` returns sum of its two parameters.
- `f` returns its one parameter incdeased by one.
- `c(a,b+1)` = `c(1,2+1)` = `c(1,3)` = `4`
- `f(a+b)` = `f(1+2)` = `f(3)` = `4`
- `4 = 4` = `TRUE`

Recursion is not allowed!

```
# This will cause an error during the execution!!!
WITH (r(x) = (CASE (x > 0) CHOOSE x + r(x - 1) DEFAULT x)) r(10)
```

### Special Functions

`ISNULL(value)`

Returns TRUE if value is NULL, otherwise FALSE.

`COALESCE(value1, value2, ..., valueN)`

Returns the first non-NULL value among the arguments.

Arguments are evaluated only until the first non-NULL argument is reached.

### Comments

Start with # and continue to the end of the line.

### Whitespace

Whitespace is optional except when separating reserved words from variables and function names.

## Best Practices

### Serialization

Compile expressions client-side and serialize them (JSON/YAML) before
sending to a server for evaluation.

When the executable tree is received by the server in JSON format, it
will automatically protect against things like circular references in
the execution tree etc.

The size if the expression should be limited by the server. The
evaluator should also enforce the preset limit of steps that a single
evaluation is not allowed to exceed. This limit depends on the use
case.

### Function Provision

External functions are provided to the evaluator based on the specific
use case. Number of functions should be kept in minimum and only
functions that are actually needed should be porovided.

## Examples

### Example 1: Literal Number

```
1
```

Result: Evaluates to the number 1.

### Example 2: Arithmetic with Function Calls

```
(1 + 2 * foo()) / zap()
```

Explanation:
foo() and zap() are externally provided functions.
Evaluates using C-language precedence rules.

### Example 3: CASE Statement

```
CASE foo() + 1 ≥ 4 CHOOSE 1
CASE bar() < -4 CHOOSE 'foobar'
DEFAULT NULL
```

Explanation: Evaluates conditions sequentially:
- If foo() + 1 ≥ 4, returns 1.
- Else if bar() < -4, returns 'foobar'.
- Else, returns NULL.

### Example 4: String Literal with Double Quotes

```
"Hello world!"
```

Evaluates to the string "Hello world!" (without quotes).

### Example 5: WITH Statement

```
WITH (a=1, b=2) a + b
```

- Assigns a = 1 and b = 2.
- Evaluates a + b, resulting in 3.

### Example 6: DEFAULT Only CASE Statement

```
DEFAULT 'yes'
```

Always evaluates to "yes".

### Example 7: Ternary Condition

```
a ? b : c
```

is equivalent to

```
CASE a CHOOSE b DEFAULT c
```

### Example 8: WITH Statement

```
WITH (a=1)
  WITH (a=a+1, b=a+1)
    a + b
```

- Outer WITH:
  - a = 1.
- Inner WITH:
  - a = a + 1 (uses outer a, so a = 2).
  - b = a + 1 (again uses outer a, so b = 2).
  - Evaluates a + b within the inner scope: 2 + 2 = 4.


### Example 9: Using COALESCE

```
COALESCE(NULL, NULL, 'first non-null', NULL, 2)
```

Evaluates to string "first non-null".

### Example 10: Battery Life Estimation

```
WITH (
  currentCharge = sensor('battery-sensor', 'charge'),
  dischargeRate = sensor('device-sensor', 'dischargeRate'),
  timeRemaining = currentCharge / dischargeRate
  )
    CASE ISNULL(currentCharge) | ISNULL(dischargeRate) CHOOSE 'Unknown Battery Life'
    DEFAULT ceil(timeRemaining)
```

- Estimates how many hours of battery life remain.
- Uses current charge and discharge rate.
- Rounds up to the nearest hour.

### Example 11: Water Heater Power Optimization

```
WITH (
  temp = sensor('ff254fdd-4d6a-4955-b7bd-c83b474c6fbb', 'temperature'),
  price_rate = spot_price('current-price-rate'),
  current_price = spot_price('current-price'),
  next_price = spot_price('next-price')
)
  WITH (
    lower_limit = (ISNULL(current_price) | ISNULL(next_price)) ? 43 :
                  (next_price > current_price ? 45 : 43)
  )
    CASE ISNULL(temp) | ISNULL(price_rate) CHOOSE 'default'
    CASE temp >= 66 CHOOSE 'minimum'
    CASE temp <= lower_limit CHOOSE 'maximum'
    CASE temp < 55 & price_rate <= 2 CHOOSE 'maximum'
    CASE price_rate >= 19 CHOOSE 'minimum'
    DEFAULT 'default'
```

The code controls a water heater by balancing safety,
comfort, and cost-effectiveness. It dynamically adjusts heating levels
based on real-time temperature readings and electricity prices,
ensuring optimal performance while minimizing energy costs.

## Example Usage

Typical use pattern is to do the compilation in the client and submit
the compiled expression for the server either for immediate evaluation
or to be stored to the database and evaluated repeatedly either by
static interval or triggered by some external event.

The example implements a simple client and a simple server. A client
defines an expression which according to the temperature returns a
string that is used for setting up an imaginary AC unit.


### The Client

```
'use strict';

const { compileString } = require('scalariq');

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
```

### The Server

```
'use strict';

const { Evaluator } = require('scalariq');

// Returns a random "temperature" between 10 and 30.
let temperature = (()=>(Math.round((Math.random()*200)+100)/10));

async function handleRequest(req, res) {
    let code, reply;
    try {
        if (req.method === 'POST') {
            let input = await new Promise((resolve, reject) => {
                let body = '';
                req.on('data', function (data) { body += data; });
                req.on('end', function () { try { resolve(JSON.parse(body)); }
                                            catch (e) { reject(e); } });
            });
            switch (req.url) {
            case '/evaluate':
                {
                    try {
                        const config = { calls: { temperature: temperature } };
                        let c = new Evaluator(input, config);
                        let result = await c.evaluate();
                        reply = { status: 'ok', result: result };
                    } catch(e) {
                        code = 400;
                        reply = { status: 'error',
                                  message: ('Evaluator error: ' +
                                            (e?.message ?? 'Internal error')) };
                    }
                }
                break;
            default:
                code = 404;
                reply = { status: 'error', message: 'Not found' };
                
            }
        } else {
            code = 405;
            reply = { status: 'error', message: 'Only POST method is allowed' };
        }
    } catch (e) {
        code = 400;
        reply = { status: 'error', message: e.message };
    } finally {
        if (reply === undefined) {
            code = 500;
            reply = { status: 'error', message: 'Internal error' };
        }
        if (code === undefined) {
            code = 200;
        }
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(reply));
    }
}

(function(host, port) {
    const server = require('node:http').createServer();
    server.on('request', (req, res) => {
        (async function(req, res) { try { await handleRequest(req, res); }
                                    catch (e) { try { res.end(); } catch (e) {} }
                                  } )(req, res); });
    server.listen(port.toString(), host, () => {
        console.log(`Server running at http://${host}:${port}/`);
    });
})('127.0.0.1', 3000);
```

### Run

```
$ for i in $(seq 1 9) ; do echo "${i}: `node client.js`" ; done
1: heating-mode
2: cooling-mode
3: idle-mode
4: heating-mode
5: idle-mode
6: cooling-mode
7: idle-mode
8: cooling-mode
9: cooling-mode
```

## Shameless Self-promotion

*ScalarIQ* offers a streamlined and efficient way to compute scalar values
from dynamic inputs without the overhead and risks of a general
purpose programming language. Its design ensures that evaluations are
quick, safe, and deterministic, making it safe in use cases where
expressions are provided by the client and periodically evaluated by
the server,

The evaluator part is relatively simple to implement, which makes
*ScalarIQ* an excellent choice also for embedded systems. *ScalarIQ* is
also a great match for Versatile automation tasks that require
periodic real-time response calculation.
