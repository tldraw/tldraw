# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [1.7.5](https://github.com/davidbonnet/astring/compare/v1.7.4...v1.7.5) (2021-06-02)

### [1.7.4](https://github.com/davidbonnet/astring/compare/v1.7.3...v1.7.4) (2021-04-07)


### Bug Fixes

* **package:** correctly declare module variant ([45203ca](https://github.com/davidbonnet/astring/commit/45203ca5bdd0307cfa3ed9a838d59718de84c6b5)), closes [#505](https://github.com/davidbonnet/astring/issues/505)

### [1.7.3](https://github.com/davidbonnet/astring/compare/v1.7.2...v1.7.3) (2021-04-05)


### Bug Fixes

* **package:** add "exports" field ([e82e873](https://github.com/davidbonnet/astring/commit/e82e87312f51c2cfa1a3c1104091a30352023bc5))

### [1.7.2](https://github.com/davidbonnet/astring/compare/v1.7.1...v1.7.2) (2021-04-05)


### Bug Fixes

* class, ternary, and arrow function miss parentheses ([#504](https://github.com/davidbonnet/astring/issues/504)) ([5037b94](https://github.com/davidbonnet/astring/commit/5037b94b3a447be7d42ae9edeb1e50ef2b2b776c))

### [1.7.1](https://github.com/davidbonnet/astring/compare/v1.7.0...v1.7.1) (2021-04-05)


### Bug Fixes

* **sourcemaps:** missing sourcemaps on debugger statement ([#503](https://github.com/davidbonnet/astring/issues/503)) ([9822a2a](https://github.com/davidbonnet/astring/commit/9822a2a4432ff957ef18c5959f3c71d10f0e361d))

## [1.7.0](https://github.com/davidbonnet/astring/compare/v1.6.2...v1.7.0) (2021-02-06)


### Features

* add typescript definitions ([#346](https://github.com/davidbonnet/astring/issues/346)) ([d2e197a](https://github.com/davidbonnet/astring/commit/d2e197a6b82efeeffc2d7a6fa2f16295c54c8dea))

### [1.6.2](https://github.com/davidbonnet/astring/compare/v1.6.1...v1.6.2) (2021-02-03)


### Bug Fixes

* lower yield operator precedence ([d3af2fc](https://github.com/davidbonnet/astring/commit/d3af2fcd8096401b5618a7e479bfb5b25e129eed))

### [1.6.1](https://github.com/davidbonnet/astring/compare/v1.6.0...v1.6.1) (2021-02-03)


### Bug Fixes

* adjust await and yield operator precendences ([d6166a2](https://github.com/davidbonnet/astring/commit/d6166a256f8e6f1071440b7469b786c18ddf252f)), closes [#435](https://github.com/davidbonnet/astring/issues/435)

## [1.6.0](https://github.com/davidbonnet/astring/compare/v1.5.1...v1.6.0) (2021-01-04)


### Features

* support custom expression precedence ([#427](https://github.com/davidbonnet/astring/issues/427)) ([76ce709](https://github.com/davidbonnet/astring/commit/76ce7099c4ba391ef130ea6010bcce6ae7392cf4))


### Bug Fixes

* unary and update expression precedence ([0b273a6](https://github.com/davidbonnet/astring/commit/0b273a6cfe7c7672de4cf1bd00f423358d0729f4)), closes [#426](https://github.com/davidbonnet/astring/issues/426)

### [1.5.1](https://github.com/davidbonnet/astring/compare/v1.5.0...v1.5.1) (2021-01-03)


### Bug Fixes

* **source-maps:** map nameless nodes ([102e569](https://github.com/davidbonnet/astring/commit/102e5696482d42f5dcccdb2ce088f7361c7dee94))

## [1.5.0](https://github.com/davidbonnet/astring/compare/v1.4.3...v1.5.0) (2021-01-03)


### Features

* add bigint support ([d061997](https://github.com/davidbonnet/astring/commit/d061997b03095bbd864889dd04b6442fae6363ce))
* add identifier support to export all ([a646dfa](https://github.com/davidbonnet/astring/commit/a646dfa9a6d093111f934b306d37ad61cf32fd9b))
* add optional chaining support ([8c3ef44](https://github.com/davidbonnet/astring/commit/8c3ef44ae6d273562f6e03cb890726d2cc02f9b2)), closes [#424](https://github.com/davidbonnet/astring/issues/424)
* support import expression ([#345](https://github.com/davidbonnet/astring/issues/345)) ([56a1574](https://github.com/davidbonnet/astring/commit/56a1574774533764644107a61bf0acc0d1c7d209))


### Bug Fixes

* **demo:** disable spellcheck on input ([b95ef6a](https://github.com/davidbonnet/astring/commit/b95ef6a4a179b031beba27387dd1bba935b2ce72))
* incorrect awaited arrow function render ([11ec06c](https://github.com/davidbonnet/astring/commit/11ec06cd092cabc1a82ccd8b74c8219fcf98dcb7))
* missing space for repeating unary operator ([#315](https://github.com/davidbonnet/astring/issues/315)) ([48e8a2e](https://github.com/davidbonnet/astring/commit/48e8a2e157858df4e1765cc2db9148b5b708216d))
* sourcemaps for multiline strings are incorrect ([f246aff](https://github.com/davidbonnet/astring/commit/f246affc88b57455bc9eaa7f306fc9d2b6fd645f)), closes [#247](https://github.com/davidbonnet/astring/issues/247)

### [1.4.3](https://github.com/davidbonnet/astring/compare/v1.4.2...v1.4.3) (2019-10-13)


### Bug Fixes

* render TemplateElement nodes ([8e5f77b](https://github.com/davidbonnet/astring/commit/8e5f77b)), closes [#129](https://github.com/davidbonnet/astring/issues/129)

### [1.4.2](https://github.com/davidbonnet/astring/compare/v1.4.1...v1.4.2) (2019-09-15)


### Build System

* **deps-dev:** bump @babel/cli from 7.5.5 to 7.6.0 ([#103](https://github.com/davidbonnet/astring/issues/103)) ([e4681cc](https://github.com/davidbonnet/astring/commit/e4681cc))
* **deps-dev:** bump @babel/core from 7.5.5 to 7.6.0 ([#105](https://github.com/davidbonnet/astring/issues/105)) ([08af974](https://github.com/davidbonnet/astring/commit/08af974))
* **deps-dev:** bump @babel/generator from 7.5.5 to 7.6.0 ([#104](https://github.com/davidbonnet/astring/issues/104)) ([d4e29bd](https://github.com/davidbonnet/astring/commit/d4e29bd))
* **deps-dev:** bump @babel/parser from 7.5.5 to 7.6.0 ([#110](https://github.com/davidbonnet/astring/issues/110)) ([df0414b](https://github.com/davidbonnet/astring/commit/df0414b))
* **deps-dev:** bump @babel/preset-env from 7.5.5 to 7.6.0 ([#106](https://github.com/davidbonnet/astring/issues/106)) ([7616978](https://github.com/davidbonnet/astring/commit/7616978))
* **deps-dev:** bump acorn from 6.2.1 to 6.3.0 ([#86](https://github.com/davidbonnet/astring/issues/86)) ([585e4c6](https://github.com/davidbonnet/astring/commit/585e4c6))
* **deps-dev:** bump ava from 2.2.0 to 2.3.0 ([#89](https://github.com/davidbonnet/astring/issues/89)) ([21c90fa](https://github.com/davidbonnet/astring/commit/21c90fa))
* **deps-dev:** bump babel-preset-minify from 0.5.0 to 0.5.1 ([#88](https://github.com/davidbonnet/astring/issues/88)) ([a9c02a2](https://github.com/davidbonnet/astring/commit/a9c02a2))
* **deps-dev:** bump cross-env from 5.2.0 to 5.2.1 ([#99](https://github.com/davidbonnet/astring/issues/99)) ([d24faef](https://github.com/davidbonnet/astring/commit/d24faef))
* **deps-dev:** bump escodegen from 1.11.1 to 1.12.0 ([#84](https://github.com/davidbonnet/astring/issues/84)) ([09d0a59](https://github.com/davidbonnet/astring/commit/09d0a59))
* **deps-dev:** bump eslint from 6.1.0 to 6.2.0 ([#91](https://github.com/davidbonnet/astring/issues/91)) ([63f193d](https://github.com/davidbonnet/astring/commit/63f193d))
* **deps-dev:** bump eslint from 6.2.0 to 6.2.1 ([#93](https://github.com/davidbonnet/astring/issues/93)) ([f36bd83](https://github.com/davidbonnet/astring/commit/f36bd83))
* **deps-dev:** bump eslint from 6.2.1 to 6.2.2 ([#95](https://github.com/davidbonnet/astring/issues/95)) ([7a0c860](https://github.com/davidbonnet/astring/commit/7a0c860))
* **deps-dev:** bump eslint from 6.2.2 to 6.3.0 ([#97](https://github.com/davidbonnet/astring/issues/97)) ([8ba7db9](https://github.com/davidbonnet/astring/commit/8ba7db9))
* **deps-dev:** bump eslint from 6.3.0 to 6.4.0 ([#111](https://github.com/davidbonnet/astring/issues/111)) ([eefe681](https://github.com/davidbonnet/astring/commit/eefe681))
* **deps-dev:** bump eslint-config-prettier from 6.0.0 to 6.1.0 ([#92](https://github.com/davidbonnet/astring/issues/92)) ([82d33dc](https://github.com/davidbonnet/astring/commit/82d33dc))
* **deps-dev:** bump eslint-config-prettier from 6.1.0 to 6.2.0 ([#101](https://github.com/davidbonnet/astring/issues/101)) ([b4198a4](https://github.com/davidbonnet/astring/commit/b4198a4))
* **deps-dev:** bump eslint-config-prettier from 6.2.0 to 6.3.0 ([#108](https://github.com/davidbonnet/astring/issues/108)) ([f63fd0c](https://github.com/davidbonnet/astring/commit/f63fd0c))
* **deps-dev:** bump husky from 3.0.1 to 3.0.2 ([#77](https://github.com/davidbonnet/astring/issues/77)) ([dbb65dc](https://github.com/davidbonnet/astring/commit/dbb65dc))
* **deps-dev:** bump husky from 3.0.2 to 3.0.3 ([#82](https://github.com/davidbonnet/astring/issues/82)) ([f11579c](https://github.com/davidbonnet/astring/commit/f11579c))
* **deps-dev:** bump husky from 3.0.3 to 3.0.4 ([a686998](https://github.com/davidbonnet/astring/commit/a686998))
* **deps-dev:** bump husky from 3.0.4 to 3.0.5 ([#100](https://github.com/davidbonnet/astring/issues/100)) ([2bff815](https://github.com/davidbonnet/astring/commit/2bff815))
* **deps-dev:** bump meriyah from 1.3.5 to 1.6.0 ([#79](https://github.com/davidbonnet/astring/issues/79)) ([2cad1d4](https://github.com/davidbonnet/astring/commit/2cad1d4))
* **deps-dev:** bump meriyah from 1.6.0 to 1.6.2 ([#81](https://github.com/davidbonnet/astring/issues/81)) ([7ce3afd](https://github.com/davidbonnet/astring/commit/7ce3afd))
* **deps-dev:** bump meriyah from 1.6.10 to 1.6.13 ([#94](https://github.com/davidbonnet/astring/issues/94)) ([49f2899](https://github.com/davidbonnet/astring/commit/49f2899))
* **deps-dev:** bump meriyah from 1.6.13 to 1.6.15 ([#96](https://github.com/davidbonnet/astring/issues/96)) ([9a0ce8f](https://github.com/davidbonnet/astring/commit/9a0ce8f))
* **deps-dev:** bump meriyah from 1.6.15 to 1.6.16 ([#98](https://github.com/davidbonnet/astring/issues/98)) ([4085bf9](https://github.com/davidbonnet/astring/commit/4085bf9))
* **deps-dev:** bump meriyah from 1.6.16 to 1.6.17 ([#102](https://github.com/davidbonnet/astring/issues/102)) ([e56c7c6](https://github.com/davidbonnet/astring/commit/e56c7c6))
* **deps-dev:** bump meriyah from 1.6.17 to 1.6.18 ([#107](https://github.com/davidbonnet/astring/issues/107)) ([2c4fc18](https://github.com/davidbonnet/astring/commit/2c4fc18))
* **deps-dev:** bump meriyah from 1.6.18 to 1.7.0 ([#109](https://github.com/davidbonnet/astring/issues/109)) ([ba3c487](https://github.com/davidbonnet/astring/commit/ba3c487))
* **deps-dev:** bump meriyah from 1.6.2 to 1.6.8 ([#85](https://github.com/davidbonnet/astring/issues/85)) ([0c91697](https://github.com/davidbonnet/astring/commit/0c91697))
* **deps-dev:** bump meriyah from 1.6.8 to 1.6.10 ([#87](https://github.com/davidbonnet/astring/issues/87)) ([036c19d](https://github.com/davidbonnet/astring/commit/036c19d))



### [1.4.1](https://github.com/davidbonnet/astring/compare/v1.4.0...v1.4.1) (2019-07-20)


### Bug Fixes

* **#74:** correct exponentiation precedence ([b267927](https://github.com/davidbonnet/astring/commit/b267927)), closes [#74](https://github.com/davidbonnet/astring/issues/74) [#74](https://github.com/davidbonnet/astring/issues/74)



<a name="1.4.0"></a>
# [1.4.0](https://github.com/davidbonnet/astring/compare/v1.3.1...v1.4.0) (2019-03-30)


### Bug Fixes

* remove Node 6 support ([800c07f](https://github.com/davidbonnet/astring/commit/800c07f))


### Features

* support async loops and rest properties ([294021c](https://github.com/davidbonnet/astring/commit/294021c)), closes [#64](https://github.com/davidbonnet/astring/issues/64)



<a name="1.3.1"></a>
## [1.3.1](https://github.com/davidbonnet/astring/compare/v1.3.0...v1.3.1) (2018-06-23)
