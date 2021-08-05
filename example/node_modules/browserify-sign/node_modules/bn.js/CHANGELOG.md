5.2.0 / 2021-02-23
------------------

- fix: Buffer not using global in browser (#260)
- Fix LE constructor for HEX (#265)

5.1.3 / 2020-08-14
------------------

- Add support for defined but not implemented Symbol.for (#252)

5.1.2 / 2020-05-20
------------------

- Fix BN v5/v4 interoperability issue (#249)

5.1.1 / 2019-12-24
------------------

- Temporary workaround for BN#_move (#236)
- Add eslintrc instead config in package.json (#237)

5.1.0 / 2019-12-23
------------------

- Benchmark for BigInt (#226)
- Add documentation for max/min (#232)
- Update BN#inspect for Symbols (#225)
- Improve performance of toArrayLike (#222)
- temporary disable jumboMulTo in BN#mulTo (#221)
- optimize toBitArray function (#212)
- fix iaddn sign issue (#216)

5.0.0 / 2019-07-04
------------------

- travis: update node versions (#205)
- Refactor buffer constructor (#200)
- lib: fix for negative numbers: imuln, modrn, idivn (#185)
- bn: fix Red#imod (#178)
- check unexpected high bits for invalid characters (#173)
- document support very large integers (#158)
- only define toBuffer if Buffer is defined (#172)
- lib: better validation of string input (#151)
- tests: reject decimal input in constructor (#91)
- bn: make .strip() an internal method (#105)
- lib: deprecate `.modn()` introduce `.modrn()`  (#112 #129 #130)
- bn: don't accept invalid characters (#141)
- package: use `files` insteadof `.npmignore`  (#152)
- bn: improve allocation speed for buffers (#167)
- toJSON to default to interoperable hex (length % 2) (#164)
