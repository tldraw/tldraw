# Change Log
All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning](http://semver.org/).

## [2.2.0] - 2020-03-19
- added the `exportGlobals` option to export global classes and ids

## [2.1.1] - 2019-03-05
### Fixed
- add additional space after the escape sequence (#17)

## [2.1.0] - 2019-03-05
### Fixed
- handles properly selector with escaping characters (like: `.\31 a2b3c { color: red }`)
### Feature
- `generateExportEntry` option (allow to setup key and value for `:export {}` rule)
