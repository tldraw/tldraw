// Custom oxlint JS plugin for the tldraw monorepo.
//
// Replaces all local ESLint rules and several ESLint-only rules that oxlint
// doesn't have built-in equivalents for. Each rule uses the standard
// ESLint-compatible create(context) API so the plugin works in both oxlint
// and ESLint if ever needed.

import { existsSync, readdirSync, readFileSync } from 'fs'
import { dirname, join, relative } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const REPO_ROOT = join(__dirname, '../../..')

const TIPTAP_IMPORT_PREFIX = '@tiptap/'
const CLAUDE_AGENT_ROOTS = ['apps', 'packages', 'templates']
const CLAUDE_FILE_NAME = 'CLAUDE.md'
const AGENTS_FILE_NAME = 'AGENTS.md'
const CLAUDE_AGENT_REFERENCE = '@AGENTS.md'
const SKIPPED_DIR_NAMES = new Set([
	'node_modules',
	'out',
	'dist',
	'dist-cjs',
	'dist-esm',
	'.lazy',
	'.next',
	'.wrangler',
	'.vercel',
	'coverage',
])

let cachedClaudeAgentViolations = null
let hasReportedClaudeAgentViolations = false

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizePath(filePath) {
	return filePath.split('\\').join('/')
}

function shouldSkipDirectory(entryName) {
	return SKIPPED_DIR_NAMES.has(entryName)
}

function collectClaudeAgentViolations() {
	const violations = []

	for (const rootDirName of CLAUDE_AGENT_ROOTS) {
		collectClaudeAgentViolationsInDirectory(join(REPO_ROOT, rootDirName), violations)
	}

	return violations
}

function collectClaudeAgentViolationsInDirectory(dir, violations) {
	if (!existsSync(dir)) return

	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const fullPath = join(dir, entry.name)

		if (entry.isDirectory()) {
			if (shouldSkipDirectory(entry.name)) continue
			collectClaudeAgentViolationsInDirectory(fullPath, violations)
			continue
		}

		if (!entry.isFile() || entry.name.toLowerCase() !== CLAUDE_FILE_NAME.toLowerCase()) {
			continue
		}

		const relativeClaudePath = normalizePath(relative(REPO_ROOT, fullPath))
		const claudeContents = readFileSync(fullPath, 'utf8')
		const agentsPath = join(dir, AGENTS_FILE_NAME)

		if (!existsSync(agentsPath)) {
			violations.push({
				claudePath: relativeClaudePath,
				messageId: 'missingAgents',
			})
		}

		if (!claudeContents.includes(CLAUDE_AGENT_REFERENCE)) {
			violations.push({
				claudePath: relativeClaudePath,
				messageId: 'missingReference',
			})
		}
	}
}

function getClaudeAgentViolations() {
	if (cachedClaudeAgentViolations === null) {
		cachedClaudeAgentViolations = collectClaudeAgentViolations()
	}

	return cachedClaudeAgentViolations
}

function extractParamNames(comment) {
	const params = []
	const regex = /@param\s+(?:\{[^}]*\}\s+)?(\w+)/g
	let match
	while ((match = regex.exec(comment)) !== null) {
		params.push(match[1])
	}
	return params
}

function getParamName(param) {
	switch (param.type) {
		case 'Identifier':
			return param.name
		case 'AssignmentPattern':
			if (param.left.type === 'Identifier') return param.left.name
			return getParamName(param.left)
		case 'RestElement':
			if (param.argument.type === 'Identifier') return param.argument.name
			return null
		default:
			return null
	}
}

function isComponentName(node) {
	return node.type === 'Identifier' && /^[A-Z]/.test(node.name)
}

function findTopLevelParent(node) {
	let current = node
	while (current.parent && current.parent.type !== 'Program') {
		current = current.parent
	}
	return current
}

// ---------------------------------------------------------------------------
// Rules ported from internal/scripts/eslint/eslint-plugin.mts
// ---------------------------------------------------------------------------

const rules = {
	'no-whilst': {
		meta: {
			messages: {
				noWhilst: 'Use "while" instead of "whilst" to maintain American English style, sorry.',
			},
			type: 'problem',
			schema: [],
			fixable: 'code',
		},
		create(context) {
			if (context.filename.includes('tldraw-plugin')) return {}

			function check(node, raw, value) {
				if (value.includes('whilst')) {
					context.report({
						messageId: 'noWhilst',
						node,
						fix: (fixer) => fixer.replaceText(node, raw.replace(/whilst/g, 'while')),
					})
				}
			}

			return {
				Literal(node) {
					if (typeof node.value === 'string') check(node, node.raw, node.value)
				},
				JSXText(node) {
					check(node, node.value, node.value)
				},
				TemplateElement(node) {
					check(node, node.value.raw, node.value.raw)
				},
			}
		},
	},

	'claude-agents-pairing': {
		meta: {
			messages: {
				missingAgents:
					'`{{claudePath}}` must have a colocated `AGENTS.md` so the instructions work across coding tools.',
				missingReference:
					'`{{claudePath}}` must reference the colocated `AGENTS.md` using `@AGENTS.md`.',
			},
			type: 'problem',
			schema: [],
		},
		create(context) {
			return {
				Program(node) {
					if (hasReportedClaudeAgentViolations) return
					hasReportedClaudeAgentViolations = true

					for (const violation of getClaudeAgentViolations()) {
						context.report({
							node,
							messageId: violation.messageId,
							data: { claudePath: violation.claudePath },
						})
					}
				},
			}
		},
	},

	'no-tiptap-default-import': {
		meta: {
			messages: {
				noDefault:
					'Use named imports when importing from {{module}} to avoid CommonJS interop issues.',
			},
			type: 'problem',
			schema: [],
		},
		create(context) {
			return {
				ImportDeclaration(node) {
					const source = node.source.value
					if (typeof source !== 'string' || !source.startsWith(TIPTAP_IMPORT_PREFIX)) return

					for (const spec of node.specifiers) {
						if (
							spec.type === 'ImportDefaultSpecifier' ||
							spec.type === 'ImportNamespaceSpecifier'
						) {
							context.report({
								node: spec,
								messageId: 'noDefault',
								data: { module: source },
							})
						}
					}
				},
			}
		},
	},

	'no-export-star': {
		meta: {
			messages: {
				named: 'Use specific named exports instead of export *',
			},
			type: 'suggestion',
			schema: [],
		},
		create(context) {
			return {
				ExportAllDeclaration(node) {
					if (node.exported !== null) return
					context.report({ messageId: 'named', node })
				},
			}
		},
	},

	'no-internal-imports': {
		meta: {
			messages: {
				internal: "Don't import from internal tldraw source ({{path}})",
			},
			type: 'problem',
			schema: [],
		},
		create(context) {
			return {
				ImportDeclaration(node) {
					const importPath = node.source.value
					const parts = importPath.split('/')

					switch (parts[0]) {
						case 'tldraw':
							if (parts.length === 1) return
							if (importPath.endsWith('.css')) return
							break
						case '@tldraw':
							if (parts.length === 2) return
							if (importPath.endsWith('.css')) return
							if (parts[1] === 'assets' && parts.length === 3) return
							break
						default:
							return
					}

					context.report({
						messageId: 'internal',
						node: node.source,
						data: { path: importPath },
					})
				},
			}
		},
	},

	'prefer-class-methods': {
		meta: {
			messages: {
				preferMethod: 'Prefer using a method instead of an arrow function property.',
			},
			type: 'problem',
			schema: [],
			fixable: 'code',
		},
		create(context) {
			return {
				ClassBody(node) {
					for (const member of node.body) {
						if (
							member.type !== 'PropertyDefinition' ||
							!member.value ||
							member.value.type !== 'ArrowFunctionExpression'
						) {
							continue
						}

						const arrow = member.value
						context.report({
							node: member,
							messageId: 'preferMethod',
							fix(fixer) {
								const src = context.sourceCode
								const name = src.getText(member.key)
								const params = arrow.params.map((p) => src.getText(p)).join(', ')
								const async = arrow.async ? 'async ' : ''
								const typeAnn = member.typeAnnotation ? src.getText(member.typeAnnotation) : ''
								const body =
									arrow.body.type === 'BlockStatement'
										? src.getText(arrow.body)
										: `{ return ${src.getText(arrow.body)} }`
								return fixer.replaceText(member, `${async}${name}(${params})${typeAnn} ${body}`)
							},
						})
					}
				},
			}
		},
	},

	'tsdoc-param-matching': {
		meta: {
			type: 'problem',
			schema: [],
			messages: {
				paramMismatch:
					"Parameter '{{ paramName }}' is documented but not present in function definition (in {{ name }}).",
				paramMissing:
					"Parameter '{{ paramName }}' is defined but missing from TSDoc @param (in {{ name }}).",
			},
		},
		create(context) {
			function checkParams(node, params, name) {
				const leadingComments = context.sourceCode.getCommentsBefore(node)
				let tsDocComment = null

				for (let i = leadingComments.length - 1; i >= 0; i--) {
					const comment = leadingComments[i]
					if (
						comment.type === 'Block' &&
						comment.value.includes('* @param') &&
						comment.loc.end.line === node.loc.start.line - 1
					) {
						tsDocComment = '/*' + comment.value + '*/'
						break
					}
				}

				if (!tsDocComment) return

				const docParams = extractParamNames(tsDocComment)
				if (docParams.length === 0) return

				const funcParams = params.map(getParamName).filter(Boolean)

				for (const param of docParams) {
					if (!funcParams.includes(param) && !funcParams.includes(`_${param}`)) {
						context.report({
							node,
							messageId: 'paramMismatch',
							data: { paramName: param, name },
						})
					}
				}

				const adjustedDocParams = new Set(docParams.flatMap((p) => [p, `_${p}`]))
				for (const param of funcParams) {
					if (!adjustedDocParams.has(param)) {
						context.report({
							node,
							messageId: 'paramMissing',
							data: { paramName: param, name },
						})
					}
				}
			}

			return {
				FunctionDeclaration(node) {
					checkParams(node, node.params, node.id?.name || 'anonymous function')
				},
				MethodDefinition(node) {
					if (node.value.type === 'FunctionExpression') {
						checkParams(
							node,
							node.value.params,
							node.key.type === 'Identifier' ? node.key.name : 'anonymous method'
						)
					}
				},
				TSAbstractMethodDefinition(node) {
					checkParams(
						node,
						node.value.params,
						node.key.type === 'Identifier' ? node.key.name : 'anonymous method'
					)
				},
				Property(node) {
					if (
						(node.value.type === 'FunctionExpression' ||
							node.value.type === 'ArrowFunctionExpression') &&
						node.key.type === 'Identifier'
					) {
						checkParams(node, node.value.params, node.key.name)
					}
				},
			}
		},
	},

	'tagged-components': {
		meta: {
			messages: {
				untagged: 'This react component should be tagged with @react',
			},
			type: 'problem',
			schema: [],
			fixable: 'code',
		},
		create(context) {
			function checkComponentDeclaration(node) {
				const declaration = findTopLevelParent(node)
				const comments = context.sourceCode.getCommentsBefore(declaration)
				const publicComment = comments.find((c) => c.value.includes('@public'))
				if (!publicComment) return
				if (publicComment.value.includes('@react')) return

				context.report({
					messageId: 'untagged',
					node: publicComment,
					fix(fixer) {
						const hasLines = publicComment.value.includes('\n')
						let replacement
						if (hasLines) {
							const lines = publicComment.value.split('\n')
							const idx = lines.findIndex((l) => l.includes('@public'))
							if (idx === -1) return null
							const indent = lines[idx].match(/^\s*/)[0]
							lines.splice(idx + 1, 0, `${indent}* @react`)
							replacement = lines.join('\n')
						} else {
							replacement = publicComment.value.replace('@public', '@public @react')
						}
						return fixer.replaceText(publicComment, `/*${replacement}*/`)
					},
				})
			}

			function checkFunctionExpression(node) {
				const parent = node.parent
				if (!parent) return

				if (parent.type === 'VariableDeclarator' && isComponentName(parent.id)) {
					checkComponentDeclaration(parent)
				}

				if (parent.type === 'CallExpression') {
					const callee = parent.callee
					const grandparent = parent.parent
					if (!grandparent) return

					const isMemoOrForwardRef =
						(callee.type === 'Identifier' &&
							(callee.name === 'memo' || callee.name === 'forwardRef')) ||
						(callee.type === 'MemberExpression' &&
							callee.property.type === 'Identifier' &&
							(callee.property.name === 'memo' || callee.property.name === 'forwardRef'))

					if (
						isMemoOrForwardRef &&
						grandparent.type === 'VariableDeclarator' &&
						isComponentName(grandparent.id)
					) {
						checkComponentDeclaration(grandparent)
					}
				}
			}

			return {
				FunctionDeclaration(node) {
					if (node.id && isComponentName(node.id)) checkComponentDeclaration(node)
				},
				FunctionExpression(node) {
					checkFunctionExpression(node)
				},
				ArrowFunctionExpression(node) {
					checkFunctionExpression(node)
				},
			}
		},
	},

	// ---------------------------------------------------------------------------
	// Rules replacing no-restricted-syntax selectors
	// ---------------------------------------------------------------------------

	'no-setter-getter': {
		meta: {
			messages: {
				setter: 'Property setters are not allowed',
				getter: 'Property getters are not allowed',
			},
			type: 'problem',
			schema: [],
		},
		create(context) {
			return {
				MethodDefinition(node) {
					if (node.kind === 'set') context.report({ node, messageId: 'setter' })
					if (node.kind === 'get') context.report({ node, messageId: 'getter' })
				},
			}
		},
	},

	'no-direct-storage': {
		meta: {
			messages: {
				localStorage: 'Use the getFromLocalStorage/setInLocalStorage helpers instead',
				sessionStorage: 'Use the getFromSessionStorage/setInSessionStorage helpers instead',
			},
			type: 'problem',
			schema: [],
		},
		create(context) {
			return {
				Identifier(node) {
					if (node.name === 'localStorage' || node.name === 'sessionStorage') {
						if (node.parent?.type === 'MemberExpression' && node.parent.object !== node) {
							return
						}
						if (node.parent?.type === 'Property' && node.parent.key === node) return
						context.report({ node, messageId: node.name })
					}
				},
			}
		},
	},

	'no-exported-arrow-const': {
		meta: {
			messages: {
				noArrow: 'Use a function declaration instead of an arrow function here.',
			},
			type: 'problem',
			schema: [],
		},
		create(context) {
			return {
				ExportNamedDeclaration(node) {
					if (
						node.declaration?.type === 'VariableDeclaration' &&
						node.declaration.kind === 'const'
					) {
						for (const declarator of node.declaration.declarations) {
							if (declarator.init?.type === 'ArrowFunctionExpression') {
								context.report({ node: declarator, messageId: 'noArrow' })
							}
						}
					}
				},
			}
		},
	},

	'img-referrer-policy': {
		meta: {
			messages: {
				missing: 'You must pass `referrerPolicy` when creating an <img>.',
			},
			type: 'problem',
			schema: [],
		},
		create(context) {
			return {
				JSXOpeningElement(node) {
					if (node.name.type !== 'JSXIdentifier' || node.name.name !== 'img') return
					const hasReferrerPolicy = node.attributes.some(
						(attr) =>
							attr.type === 'JSXAttribute' &&
							attr.name.type === 'JSXIdentifier' &&
							attr.name.name === 'referrerPolicy'
					)
					if (!hasReferrerPolicy) {
						context.report({ node, messageId: 'missing' })
					}
				},
			}
		},
	},

	// ---------------------------------------------------------------------------
	// Rules replacing ESLint built-in rules not available in oxlint
	// ---------------------------------------------------------------------------

	'no-restricted-properties': {
		meta: {
			messages: {
				restricted: '{{message}}',
			},
			type: 'problem',
			schema: [
				{
					type: 'array',
					items: {
						type: 'object',
						properties: {
							object: { type: 'string' },
							property: { type: 'string' },
							message: { type: 'string' },
						},
						required: ['object', 'property', 'message'],
						additionalProperties: false,
					},
				},
			],
		},
		create(context) {
			const restrictions = context.options[0] || []

			return {
				MemberExpression(node) {
					if (node.computed) return
					const objName = node.object.type === 'Identifier' ? node.object.name : null
					const propName = node.property.type === 'Identifier' ? node.property.name : null
					if (!objName || !propName) return

					for (const r of restrictions) {
						if (r.object === objName && r.property === propName) {
							context.report({ node, messageId: 'restricted', data: { message: r.message } })
						}
					}
				},
			}
		},
	},

	'jsx-no-literals': {
		meta: {
			messages: {
				noStrings: 'Strings not allowed in JSX — use react-intl',
			},
			type: 'problem',
			schema: [],
		},
		create(context) {
			function isJSXChild(node) {
				const parent = node.parent
				return parent && (parent.type === 'JSXElement' || parent.type === 'JSXFragment')
			}

			return {
				JSXText(node) {
					if (node.value.trim().length > 0) {
						context.report({ node, messageId: 'noStrings' })
					}
				},
				JSXExpressionContainer(node) {
					if (!isJSXChild(node)) return
					if (
						node.expression.type === 'Literal' &&
						typeof node.expression.value === 'string' &&
						node.expression.value.trim().length > 0
					) {
						context.report({ node, messageId: 'noStrings' })
					}
					if (node.expression.type === 'TemplateLiteral') {
						context.report({ node, messageId: 'noStrings' })
					}
				},
			}
		},
	},

	'method-signature-style': {
		meta: {
			messages: {
				method: 'Shorthand method signature is required. Use `{{name}}(...): ...` instead.',
			},
			type: 'problem',
			schema: [],
			fixable: 'code',
		},
		create(context) {
			return {
				TSPropertySignature(node) {
					const typeAnn = node.typeAnnotation?.typeAnnotation
					if (!typeAnn || typeAnn.type !== 'TSFunctionType') return

					const name =
						node.key.type === 'Identifier' ? node.key.name : context.sourceCode.getText(node.key)

					context.report({
						node,
						messageId: 'method',
						data: { name },
						fix(fixer) {
							const src = context.sourceCode
							const fnType = typeAnn
							const params = fnType.params.map((p) => src.getText(p)).join(', ')
							const typeParams = fnType.typeParameters ? src.getText(fnType.typeParameters) : ''
							const returnType = fnType.returnType ? src.getText(fnType.returnType) : ': void'
							const optional = node.optional ? '?' : ''
							return fixer.replaceText(
								node,
								`${name}${optional}${typeParams}(${params})${returnType}`
							)
						},
					})
				},
			}
		},
	},

	'no-focused-tests': {
		meta: {
			messages: {
				focused: 'Focused tests are not allowed — remove .only',
			},
			type: 'problem',
			schema: [],
		},
		create(context) {
			const TEST_FNS = new Set(['describe', 'it', 'test', 'suite', 'bench'])

			return {
				CallExpression(node) {
					const callee = node.callee
					if (callee.type !== 'MemberExpression') return
					if (callee.property.type !== 'Identifier' || callee.property.name !== 'only') {
						return
					}

					let obj = callee.object
					while (obj.type === 'MemberExpression') obj = obj.object
					if (obj.type === 'Identifier' && TEST_FNS.has(obj.name)) {
						context.report({ node: callee.property, messageId: 'focused' })
					}
				},
			}
		},
	},

	'enforce-default-message': {
		meta: {
			messages: {
				missing: '"defaultMessage" is required in message descriptor',
				literal: '"defaultMessage" must be a string literal',
			},
			type: 'problem',
			schema: [{ enum: ['literal'] }],
		},
		create(context) {
			const mode = context.options[0] || 'literal'

			function checkDescriptor(node, descriptor) {
				if (!descriptor || descriptor.type !== 'ObjectExpression') return

				const dmProp = descriptor.properties.find(
					(p) =>
						p.type === 'Property' && p.key.type === 'Identifier' && p.key.name === 'defaultMessage'
				)

				if (!dmProp) {
					context.report({ node: descriptor, messageId: 'missing' })
					return
				}

				if (mode === 'literal' && dmProp.value.type !== 'Literal') {
					context.report({ node: dmProp.value, messageId: 'literal' })
				}
			}

			function isFormatMessageCall(callee) {
				if (callee.type === 'Identifier' && callee.name === 'formatMessage') return true
				if (
					callee.type === 'MemberExpression' &&
					callee.property.type === 'Identifier' &&
					callee.property.name === 'formatMessage'
				) {
					return true
				}
				return false
			}

			function isDefineCall(callee) {
				return (
					callee.type === 'Identifier' &&
					(callee.name === 'defineMessage' || callee.name === 'defineMessages')
				)
			}

			return {
				CallExpression(node) {
					if (isFormatMessageCall(node.callee)) {
						checkDescriptor(node, node.arguments[0])
					} else if (node.callee.type === 'Identifier' && node.callee.name === 'defineMessage') {
						checkDescriptor(node, node.arguments[0])
					} else if (node.callee.type === 'Identifier' && node.callee.name === 'defineMessages') {
						const arg = node.arguments[0]
						if (arg?.type === 'ObjectExpression') {
							for (const prop of arg.properties) {
								if (prop.type === 'Property') {
									checkDescriptor(node, prop.value)
								}
							}
						}
					}
				},
				JSXOpeningElement(node) {
					if (node.name.type !== 'JSXIdentifier' || node.name.name !== 'FormattedMessage') {
						return
					}
					const dmAttr = node.attributes.find(
						(a) =>
							a.type === 'JSXAttribute' &&
							a.name.type === 'JSXIdentifier' &&
							a.name.name === 'defaultMessage'
					)
					if (!dmAttr) {
						context.report({ node, messageId: 'missing' })
						return
					}
					if (mode === 'literal') {
						const val = dmAttr.value
						if (!val || (val.type !== 'Literal' && val.type !== 'JSXExpressionContainer')) {
							return
						}
						if (val.type === 'JSXExpressionContainer' && val.expression.type !== 'Literal') {
							context.report({ node: val, messageId: 'literal' })
						}
					}
				},
			}
		},
	},
}

// ---------------------------------------------------------------------------
// Plugin export
// ---------------------------------------------------------------------------

const plugin = {
	meta: { name: 'tldraw' },
	rules,
}

export default plugin
