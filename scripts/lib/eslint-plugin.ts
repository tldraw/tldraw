/* eslint-disable @typescript-eslint/no-var-requires */

// eslint plugins can't use esm
const { ESLintUtils } =
	require('@typescript-eslint/utils') as typeof import('@typescript-eslint/utils')
const { SymbolFlags } = require('typescript') as typeof import('typescript')

exports.rules = {
	'no-export-star': ESLintUtils.RuleCreator.withoutDocs({
		create(context) {
			return {
				ExportAllDeclaration(node) {
					if (node.exported !== null) {
						// we're exporting a specific name, so that's OK!
						return
					}

					// 1. Grab the TypeScript program from parser services
					const parserServices = ESLintUtils.getParserServices(context)
					const checker = parserServices.program.getTypeChecker()

					// 2. Find the backing TS node for the ES node, then the symbol for the imported file
					const originalNode = parserServices.esTreeNodeToTSNodeMap.get(node)
					const importedFileSymbol = checker.getSymbolAtLocation(originalNode.moduleSpecifier!)!

					// 3. Find all the imported names from the file
					const importedNames = checker.getExportsOfModule(importedFileSymbol).map((imported) => ({
						name: imported.getEscapedName(),
						isType: !(imported.flags & SymbolFlags.Value),
					}))

					// report the error and offer a fix (listing imported names)
					context.report({
						messageId: 'named',
						node,
						fix: (fixer) => {
							return fixer.replaceText(
								node,
								[
									'export {',
									...importedNames.map(
										(imported) => `  ${imported.isType ? 'type ' : ''}${imported.name},`
									),
									`} from ${JSON.stringify(node.source.value)};`,
								].join('\n')
							)
						},
					})
				},
			}
		},
		meta: {
			messages: {
				named: 'Use specific named exports instead of export *',
			},
			type: 'suggestion',
			schema: [],
			fixable: 'code',
		},
		defaultOptions: [],
	}),
	'no-internal-imports': ESLintUtils.RuleCreator.withoutDocs({
		create(context) {
			return {
				ImportDeclaration(node) {
					const path = node.source.value

					const parts = path.split('/')

					switch (parts[0]) {
						case 'tldraw':
							// 'tldraw'
							if (parts.length === 1) return
							// 'tldraw/**/*.css'
							if (path.endsWith('.css')) return
							break
						case '@tldraw':
							// '@tldraw/*'
							if (parts.length === 2) return
							// '@tldraw/**/*.css'
							if (path.endsWith('.css')) return
							// '@tldraw/assets/*'
							if (parts[1] === 'assets' && parts.length === 3) return
							break
						default:
							return
					}

					context.report({
						messageId: 'internal',
						node: node.source,
						data: { path },
					})
				},
			}
		},
		meta: {
			messages: {
				internal: "Don't import from internal tldraw source ({{path}})",
			},
			type: 'problem',
			schema: [],
		},
		defaultOptions: [],
	}),
}
