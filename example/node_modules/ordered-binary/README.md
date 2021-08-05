<a href="https://dev.doctorevidence.com/"><img src="./assets/powers-dre.png" width="203" /></a>

The ordered-binary provides a representation of JavaScript primitives as NodeJS Buffers, such that there binary values are naturally ordered such that it matches primitive ordering. For example, since -2.0321 > -2.04, then `toBufferKey(-2.0321)` will be greater than `toBufferKey(-2.04)` as a binary representation, in left-to-right evaluation. This is particular useful for storing keys as binaries with something like LevelDB, to avoid any custom sorting.

The main module exports two functions:

`toBufferKey(jsPrimitive)` - This accepts a string, number, or boolean as the argument, and returns a `Buffer`.
`fromBufferKey(bufferKey, multiple)` - This accepts a Buffer and returns a JavaScript primitive value. This can also parse buffers that hold multiple values delimited by a byte `30`, by setting the second argument to true (in which case it will return an array).
