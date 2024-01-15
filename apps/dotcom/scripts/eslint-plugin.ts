/* eslint-disable @typescript-eslint/no-var-requires */

// eslint plugins can't use esm
const { ESLintUtils: _ESLintUtils } =
	require('@typescript-eslint/utils') as typeof import('@typescript-eslint/utils')

exports.rules = {}
