/* eslint-disable @typescript-eslint/no-var-requires */

// eslint plugins can't use esm

// @ts-ignore - no import/require
import ts = require('typescript')
// @ts-ignore - no import/require
import utils = require('@typescript-eslint/utils')

const { isReassignmentTarget } = require('tsutils') as typeof import('tsutils')

const { ESLintUtils } = utils
import TSESTree = utils.TSESTree

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
						isType: !(imported.flags & ts.SymbolFlags.Value),
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
	'no-at-internal': ESLintUtils.RuleCreator.withoutDocs({
		create(context) {
			// adapted from https://github.com/gund/eslint-plugin-deprecation

			function identifierRule(id: TSESTree.Identifier | TSESTree.JSXIdentifier) {
				const services = ESLintUtils.getParserServices(context)
				// Don't consider deprecations in certain cases:

				// - On JSX closing elements (only flag the opening element)
				const isClosingElement =
					id.type === 'JSXIdentifier' && id.parent?.type === 'JSXClosingElement'

				if (isClosingElement) {
					return
				}

				// - Inside an import
				const isInsideImport = context.getAncestors().some((anc) => anc.type.includes('Import'))

				if (isInsideImport) {
					return
				}

				const internalMarker = getInternalMarker(id, services)

				if (internalMarker) {
					context.report({
						node: id,
						messageId: 'internal',
						data: {
							name: id.name,
						},
					})
				}
			}

			function getInternalMarker(
				id: TSESTree.Identifier | TSESTree.JSXIdentifier,
				services: utils.ParserServices
			) {
				const tc = services.program.getTypeChecker()
				const callExpression = getCallExpression(id)

				if (callExpression) {
					const tsCallExpression = services.esTreeNodeToTSNodeMap.get(
						callExpression
					) as ts.CallLikeExpression
					const signature = tc.getResolvedSignature(tsCallExpression)
					if (signature) {
						const deprecation = getJsDocInternal(signature.getJsDocTags())
						if (deprecation) {
							return deprecation
						}
					}
				}

				const symbol = getSymbol(id, services, tc)

				if (!symbol) {
					return undefined
				}
				if (callExpression && isFunction(symbol)) {
					return undefined
				}

				return getJsDocInternal(symbol.getJsDocTags())
			}

			function isFunction(symbol: ts.Symbol) {
				const { declarations } = symbol
				if (declarations === undefined || declarations.length === 0) {
					return false
				}
				switch (declarations[0].kind) {
					case ts.SyntaxKind.MethodDeclaration:
					case ts.SyntaxKind.FunctionDeclaration:
					case ts.SyntaxKind.FunctionExpression:
					case ts.SyntaxKind.MethodSignature:
						return true
					default:
						return false
				}
			}

			function getCallExpression(
				id: TSESTree.Node
			): TSESTree.CallExpression | TSESTree.TaggedTemplateExpression | undefined {
				const ancestors = context.getAncestors()
				let callee = id
				let parent = ancestors.length > 0 ? ancestors[ancestors.length - 1] : undefined

				if (parent && parent.type === 'MemberExpression' && parent.property === id) {
					callee = parent
					parent = ancestors.length > 1 ? ancestors[ancestors.length - 2] : undefined
				}

				if (isCallExpression(parent, callee)) {
					return parent
				}
				return undefined
			}

			function isCallExpression(
				node: TSESTree.Node | undefined,
				callee: TSESTree.Node
			): node is TSESTree.CallExpression | TSESTree.TaggedTemplateExpression {
				if (node) {
					if (node.type === 'NewExpression' || node.type === 'CallExpression') {
						return node.callee === callee
					} else if (node.type === 'TaggedTemplateExpression') {
						return node.tag === callee
					} else if (node.type === 'JSXOpeningElement') {
						return node.name === callee
					}
				}
				return false
			}

			function getJsDocInternal(tags: ts.JSDocTagInfo[]) {
				for (const tag of tags) {
					if (tag.name === 'internal') {
						return { reason: ts.displayPartsToString(tag.text) }
					}
				}
				return undefined
			}

			function getSymbol(
				id: TSESTree.Identifier | TSESTree.JSXIdentifier,
				services: utils.ParserServices,
				tc: ts.TypeChecker
			) {
				let symbol: ts.Symbol | undefined
				const tsId = services.esTreeNodeToTSNodeMap.get(id as TSESTree.Node) as ts.Identifier
				const parent = tsId.parent

				if (parent.kind === ts.SyntaxKind.BindingElement) {
					symbol = tc.getTypeAtLocation(parent.parent).getProperty(tsId.text)
				} else if (
					(isPropertyAssignment(parent) && parent.name === tsId) ||
					(isShorthandPropertyAssignment(parent) &&
						parent.name === tsId &&
						isReassignmentTarget(tsId))
				) {
					try {
						symbol = tc.getPropertySymbolOfDestructuringAssignment(tsId)
					} catch (e) {
						// we are in object literal, not destructuring
						// no obvious easy way to check that in advance
						symbol = tc.getSymbolAtLocation(tsId)
					}
				} else {
					symbol = tc.getSymbolAtLocation(tsId)
				}

				if (symbol && (symbol.flags & ts.SymbolFlags.Alias) !== 0) {
					symbol = tc.getAliasedSymbol(symbol)
				}
				return symbol
			}

			function isPropertyAssignment(node: ts.Node): node is ts.PropertyAssignment {
				return node.kind === ts.SyntaxKind.PropertyAssignment
			}

			function isShorthandPropertyAssignment(
				node: ts.Node
			): node is ts.ShorthandPropertyAssignment {
				return node.kind === ts.SyntaxKind.ShorthandPropertyAssignment
			}

			return {
				Identifier: identifierRule,
				JSXIdentifier: identifierRule,
			}
		},
		meta: {
			messages: {
				internal: '"{{name}}" is internal and can\'t be used publicly.',
			},
			type: 'problem',
			schema: [],
		},
		defaultOptions: [],
	}),
}
