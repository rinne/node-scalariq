# ScalarIQ Executable

This is the documentation of the compiled executable format of
ScalarIQ expressions.

## Presentation

ScalarIQ Executable is a tree format data structure of executable
nodes. The structure is typically contained in a JSON encoded string
when transported over network.

Alternative compact binary form representation is in planning state.

## Executable Node

All nodes have two properties - `op` and `av`.

```
{
  "op": <op-code-string>,
  "av": [ <arguments> ... ]
}
```

Supported `op` values are: `"expression"`, `"add"`, `"sub"`, `"mul"`,
`"div"`, `"mod"`, `"not"`, `"or"`, `"and"`, `"eq"`, `"ne"`, `"lt"`,
`"le"`, `"ge"`, `"gt"`, `"condition"`, `"call"`, `"lookup"`,
`"scope"`, `"coalesce"`, `"isnull"`, and `"typeof"`.

Array `av` is always present in the node. If the node does not have
arguments, then `av` is set to an empty array `[]`.

All arguments in the `av` array are either other executable nodes or
simple scalar values of number (NaN or Inf are not allowed), string,
boolean type, or null.

| Op           | Args   | Description      |
|:-------------|:------:|:-----------------|
| `expression` | 1      | Reduces to the value of the argument, which can be either a scalar or another node. The root node of the ScalarIQ executable tree, must not be a scalar. If the expression directly reduces to a constant scalar value, it must be wrapped into `expression` node. There are no other beneficial use cases for this node type. |
| `add`        | 1..n   | Reduces to the sum of all arguments. All arguments must reduce to number before summation. If there are arguments that reduce to other types, `add` operation will reduce to null. |
| `sub`        | 2..n   | Reduces to the subtraction of all arguments i.e. the sum of all subsequent arguments is subtracted from the first argument. All arguments must reduce to number before calculation. If there are arguments that reduce to other types, `sub` operation will reduce to null. |
| `mul`        | 1..n   | Reduces to the product of all arguments. All arguments must reduce to number before multiplication. If there are arguments that reduce to other types, `mul` operation will reduce to null. |
| `div`        | 2      | Reduces to the result of the division of operation's two arguments. Both arguments must reduce to number before division and the latter one must not be zero. If either argument reduce to other types, `div` operation will reduce to null. |
| `mod`        | 2      | Reduces to the result of the modulo of operation's two arguments. Both arguments must reduce to number before calculation and the latter one must not be zero. If either argument reduce to other types, `mod` operation will reduce to null. |
| `not`        | 1      | Reduces to the logical negation (i.e. NOT) of the argument. If the argument is TRUE it reduces to FALSE, and FALSE reduces to TRUE. If the argument is or reduces to non-boolean scalar, it will first be booleanized with following rules: non-zero number and non-empty string booleanizes to TRUE and number zero and empty string booleanizes to FALSE. null does not booleanize and with null argument, `not` operation reduces to null |
| `or`         | 1..n   | Reduces to the logical OR of arguments. Non-boolean arguments are booleanized like in `and` operation. If any of the arguments is null, `or` operation  reduces to null |
| `and`        | 1..n   | Reduces to the logical ANF of arguments. Non-boolean arguments are booleanized like in `and` operation. If any of the arguments is null, `or` operation  reduces to null |
| `eq`         | 2      | Reduces to TRUE if both arguments reduce to identical scalars, and FALSE otherwise. However, if either of the arguments is null, `eq` operation reduces to null. |
| `ne`         | 2      | Reduces to FALSE if both arguments reduce to identical scalars, and TRUE otherwise. However, if either of the arguments is null, `nq` operation reduces to null. |
| `lt`         | 2      | Requires two arguments that reduce to a number or null. If either is null, then `lt` reduces to null. Otherwise it reduces to TRUE if the first argument's value is less than the second arguments value, and FALSE otherwise. |
| `le`         | 2      | Requires two arguments that reduce to a number or null. If either is null, then `lt` reduces to null. Otherwise it reduces to TRUE if the first argument's value is less or equal than the second arguments value, and FALSE otherwise. |
| `ge`         | 2      | Requires two arguments that reduce to a number or null. If either is null, then `lt` reduces to null. Otherwise it reduces to TRUE if the first argument's value is greater or equal than the second arguments value, and FALSE otherwise. |
| `gt`         | 2      | Requires two arguments that reduce to a number or null. If either is null, then `lt` reduces to null. Otherwise it reduces to TRUE if the first argument's value is greater than the second arguments value, and FALSE otherwise. |
| `condition`  | 2n + 1 | Requires an odd number of arguments. Arguments before the last one are evaluated in pairs, if the first argument of the pair reduces to TRUE (or is booleanized to TRUE), then `condition` operation reduces to the next argument, otherwise the execution proceeds to the next pair. If no positive case is found before the last argument, `condition` reduces to the last argument (i.e. default value). |
| `call`       | 1..n   | Requires a string literal as a first argument. Other arguments are reduced to scalar before proceeding. Operation `call` reduces to the return value of the externally provided function identified by the first argument. Other arguments are passed as parameters to this external call. The external function must return a scalar value (number, string, boolean, or null). |
| `scope`      | 2n + 1 | Requires an odd number of arguments. Creates a new scope. Arguments before the last one are evaluated in pairs. First argument of each pair must be a string literal, which is used as a name, and the second argument is reduced to a scalar value and stored to the scope with the name. All names must be unique in a single scope, but the same name can be used again in the inner scope, in which case the inner definition shadows the outer one. After the scope has been formed, `scope` operation will evaluate the last argument within the defined scope and reduce to the value to which this last argument reduces to. Scopes can be nested arbitrarily. |
| `lookup`     | 1      | Requires a string literal as an argument. Reduces to the scalar value that is looked up from the scope of the operation with the name identified by the argument string. If the value is not found from the current scope, also the enclosing outer scopes are checked in order. |
| `coalesce`   | 0..n   | Reduces to the first non-null argument. If there are no non-null arguments, reduces to null. |
| `isnull`     | 1      | Reduces to TRUE, if the argument reduces to null, otherwise FALSE |
| `typeof`     | 1      | Reduces to string `"number"`, `"boolean"`, `"string"`, or `"null"` according to the type of the value to which the argument reduces to. |

## Examples

```
{
    "op": "expression",
    "av": [ 1 ]
}
```

Reduces to number 1. Should be used only as a root node. If any item
in any `av` array is a number, boolean, or string literal or null,
they should be inserted into `av` as is and not enclosed to
`expression` operation.

```
{
    "op": "sub",
    "av": [ { "op": "add", "av": [ 1, 1 ] }, 2 ]
}
```

1 + 1 - 2

Reduces to 0.

```
{
    "op": "scope",
    "av": [ "a", 1,
            "b", 2,
            {
                "op": "add",
                "av": [ { "op": "lookup", "av": [ "a" ] },
                        { "op": "lookup", "av": [ "b" ] } ]
            } ]
}
```

Defines a scope, where `a` is 1 and `b` is 2 and evaluates the sum `a+b` which reduces to 3.

```
{
    "op": "scope",
    "av": [ "temperature", { "op": "call", "av": [ "sensor" ] },
            { "op": "condition",
              "av": [ { "op": "lt", "av": [ { "op": "lookup", "av": [ "temperature" ] },
                                            0 ] },
                      "cold",
                      { "op": "gt", "av": [ { "op": "lookup", "av": [ "temperature" ] },
                                            30 ] },
                      "hot",
                      "ok" ] } ]
}
```

Defines a scope, where `temperature` is set to the return value of the
external function `sensor()` and returns string `"cold"` if
`temperature` is less than zero, or `"hot"` if `tempeature` is greater
than 30 and `"ok"` otherwise.

## Final Note

It is noteworthy that if there are no `call` operation nodes present
in the executable tree, the tree reduces always to the same constant
scalar value.
