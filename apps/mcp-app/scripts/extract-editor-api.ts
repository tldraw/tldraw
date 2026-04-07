import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import ts from 'typescript'

const scriptPath = fileURLToPath(import.meta.url)
const __dirname = path.dirname(scriptPath)
const distDir = path.join(__dirname, '..', 'dist')
const outPath = path.join(distDir, 'editor-api.json')
const methodMapOutPath = path.join(distDir, 'method-map.json')
const formatTsPath = path.join(__dirname, '..', 'src', 'widget', 'focused', 'format.ts')
const execHelpersPath = path.join(__dirname, '..', 'src', 'widget', 'exec-helpers.ts')

// In the tldraw monorepo, packages build to .tsbuild/
const repoRoot = path.resolve(__dirname, '..', '..', '..')
const editorDtsPath = path.join(
	repoRoot,
	'packages',
	'editor',
	'.tsbuild',
	'lib',
	'editor',
	'Editor.d.ts'
)
const storeDtsPath = path.join(repoRoot, 'packages', 'store', '.tsbuild', 'index.d.ts')
const tlschemaDtsPath = path.join(repoRoot, 'packages', 'tlschema', '.tsbuild', 'index.d.ts')

for (const p of [editorDtsPath, storeDtsPath, tlschemaDtsPath]) {
	if (!fs.existsSync(p)) {
		console.error(`Missing: ${p}\nRun 'yarn lazy build' first to generate .d.ts files.`)
		process.exit(1)
	}
}

// --- Types ---

interface ExtractedParam {
	name: string
	description: string
}

interface ExtractedMember {
	name: string
	kind: 'method' | 'property' | 'getter'
	signature: string
	description: string
	params: ExtractedParam[]
	examples: string[]
	category: string
}

interface ExtractedTypeProperty {
	name: string
	signature: string
	description: string
	optional: boolean
}

interface ExtractedShapeType {
	name: string
	shapeType: string
	signature: string
	description: string
	propsType: string
	propsDescription: string
	props: ExtractedTypeProperty[]
}

interface ExtractedTypesSection {
	shapeTypes: string[]
	shapes: ExtractedShapeType[]
}

interface ExtractedTypeMember {
	name: string
	kind: 'method' | 'property' | 'getter'
	signature: string
	description: string
	params: ExtractedParam[]
	examples: string[]
	optional: boolean
	static: boolean
}

interface ExtractedNamedType {
	name: string
	kind: 'class' | 'interface' | 'type' | 'function' | 'const'
	signature: string
	description: string
	params?: ExtractedParam[]
	examples?: string[]
	members?: ExtractedTypeMember[]
	aliasedTo?: string
	resolvedType?: ExtractedNamedType
	relatedTypes?: ExtractedNamedType[]
}

interface ExtractedExecHelper {
	name: string
	source: 'local' | 'tldraw'
	origin: string
	signature: string
	description: string
	params: ExtractedParam[]
	examples: string[]
	typeInfo?: ExtractedNamedType
}

interface ExtractedExecSection {
	helperCount: number
	helpers: ExtractedExecHelper[]
}

type NamedDeclaration =
	| ts.ClassDeclaration
	| ts.InterfaceDeclaration
	| ts.TypeAliasDeclaration
	| ts.FunctionDeclaration
	| ts.VariableDeclaration

interface DeclarationContext {
	program: ts.Program
	checker: ts.TypeChecker
	declarations: Map<string, NamedDeclaration>
	sourceFiles: Map<string, ts.SourceFile>
}

// --- Helpers ---

function categorize(name: string): string {
	if (/camera/i.test(name)) return 'camera'
	if (/viewport|screenToPage|pageToScreen|pageToViewport|viewportToPage/i.test(name))
		return 'viewport'
	if (/^(get|set|create|update|delete|reorder|reparent).*shape/i.test(name)) return 'shapes'
	if (/^(get|has)Shape/i.test(name)) return 'shapes'
	if (/shapeUtil/i.test(name)) return 'shapes'
	if (/^(select|deselect|getSelect|setSelect|clearSelect|getSelectedShape)/i.test(name))
		return 'selection'
	if (/selected/i.test(name)) return 'selection'
	if (/^(get|set|create|delete|move|reorder|duplicate).*page/i.test(name)) return 'pages'
	if (/^(undo|redo|mark|bail|squash|run$|history|batch)/i.test(name)) return 'history'
	if (/^(zoom|pan|stopFollowing|startFollowing|slideCamera|resetZoom|zoomTo)/i.test(name))
		return 'zoom'
	if (/binding/i.test(name)) return 'bindings'
	if (/^(group|ungroup)/i.test(name)) return 'grouping'
	if (
		/^(nudge|align|distribute|stack|stretch|pack|flip|rotate|resize|moveShapes|translate)/i.test(
			name
		)
	)
		return 'transform'
	if (/^(isIn|getPath|setCurrentTool|getCurrentTool)/i.test(name)) return 'tools'
	if (/asset/i.test(name)) return 'assets'
	if (/style|opacity|color|font/i.test(name)) return 'styles'
	if (/^(get|set).*Hinting/i.test(name)) return 'hinting'
	if (/^(get|set).*Erasing/i.test(name)) return 'erasing'
	if (/^(get|set).*Cropping/i.test(name)) return 'cropping'
	if (/^(get|set).*Editing/i.test(name)) return 'editing'
	if (/^(get|set).*Hovering/i.test(name)) return 'hovering'
	if (/^(get|set).*Focus/i.test(name)) return 'focus'
	if (/^(get|set).*Dragging/i.test(name)) return 'dragging'
	if (/snap/i.test(name)) return 'snapping'
	if (/export|toImage|toSvg|toBlobPromise/i.test(name)) return 'export'
	if (/cursor/i.test(name)) return 'cursor'
	if (/instance/i.test(name)) return 'instance'
	if (/store/i.test(name)) return 'store'
	if (/^(dispose|isDisposed)/i.test(name)) return 'lifecycle'
	return 'other'
}

function extractJsDoc(
	member: ts.Node,
	sourceFile: ts.SourceFile
): { description: string; params: ExtractedParam[]; examples: string[] } {
	const empty = { description: '', params: [], examples: [] }

	const ranges = ts.getLeadingCommentRanges(sourceFile.text, member.getFullStart())
	if (!ranges) return empty

	const jsdocRanges = ranges.filter((r) => sourceFile.text.slice(r.pos, r.pos + 3) === '/**')
	const jsdocRange = jsdocRanges[jsdocRanges.length - 1]
	if (!jsdocRange) return empty

	const raw = sourceFile.text.slice(jsdocRange.pos, jsdocRange.end)

	if (raw.includes('Excluded from this release type')) {
		return { description: '__EXCLUDED__', params: [], examples: [] }
	}

	const lines = raw
		.replace(/^\/\*\*\s*/, '')
		.replace(/\s*\*\/$/, '')
		.split('\n')
		.map((l) => l.replace(/^\s*\*\s?/, ''))

	const descLines: string[] = []
	const tags: Array<{ tag: string; text: string }> = []

	for (const line of lines) {
		const tagMatch = line.match(/^@(\w+)\s*(.*)/)
		if (tagMatch) {
			tags.push({ tag: tagMatch[1], text: tagMatch[2] })
		} else if (tags.length > 0) {
			tags[tags.length - 1].text += '\n' + line
		} else {
			descLines.push(line)
		}
	}

	const description = descLines.join('\n').trim()
	const params = tags
		.filter((t) => t.tag === 'param')
		.map((t) => {
			const m = t.text.match(/^(\w+)\s*-\s*(.*)/)
			return m ? { name: m[1], description: m[2].trim() } : null
		})
		.filter((p): p is ExtractedParam => p !== null)

	const examples = tags
		.filter((t) => t.tag === 'example')
		.map((t) =>
			t.text
				.replace(/```ts\n?/g, '')
				.replace(/```\n?/g, '')
				.trim()
		)
		.filter((e) => e.length > 0)

	return { description, params, examples }
}

function getPropertyName(name: ts.PropertyName | ts.BindingName | undefined): string | undefined {
	if (!name) return undefined
	if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
		return name.text
	}
	return undefined
}

function isExcludedComment(member: ts.Node, sourceFile: ts.SourceFile): boolean {
	const ranges = ts.getLeadingCommentRanges(sourceFile.text, member.getFullStart())
	if (!ranges) return false
	const lastRange = ranges[ranges.length - 1]
	return sourceFile.text
		.slice(lastRange.pos, lastRange.end)
		.includes('Excluded from this release type')
}

// --- Declaration context ---

function createDeclarationContext(entryPaths: string[]): DeclarationContext {
	const program = ts.createProgram(entryPaths, {
		target: ts.ScriptTarget.ES2020,
		jsx: ts.JsxEmit.ReactJSX,
		moduleResolution: ts.ModuleResolutionKind.Node10,
	})
	const declarations = new Map<string, NamedDeclaration>()
	const sourceFiles = new Map<string, ts.SourceFile>()
	const indexedSourceFiles = new Set(entryPaths.map((entryPath) => path.resolve(entryPath)))

	for (const sourceFile of program.getSourceFiles()) {
		sourceFiles.set(sourceFile.fileName, sourceFile)
		const shouldIndex =
			indexedSourceFiles.has(path.resolve(sourceFile.fileName)) ||
			sourceFile.fileName.includes('/packages/') ||
			sourceFile.fileName.includes('/node_modules/@tldraw/') ||
			sourceFile.fileName.includes('/node_modules/tldraw/')
		if (!shouldIndex) continue

		ts.forEachChild(sourceFile, (node) => {
			if (
				(ts.isClassDeclaration(node) ||
					ts.isInterfaceDeclaration(node) ||
					ts.isTypeAliasDeclaration(node) ||
					ts.isFunctionDeclaration(node)) &&
				node.name
			) {
				declarations.set(node.name.text, node)
				return
			}

			if (ts.isVariableStatement(node)) {
				for (const declaration of node.declarationList.declarations) {
					if (ts.isIdentifier(declaration.name)) {
						declarations.set(declaration.name.text, declaration)
					}
				}
			}
		})
	}

	return {
		program,
		checker: program.getTypeChecker(),
		declarations,
		sourceFiles,
	}
}

function getDeclarationSourceFile(declaration: NamedDeclaration): ts.SourceFile {
	return declaration.getSourceFile()
}

function getDeclarationKind(declaration: NamedDeclaration): ExtractedNamedType['kind'] {
	if (ts.isClassDeclaration(declaration)) return 'class'
	if (ts.isInterfaceDeclaration(declaration)) return 'interface'
	if (ts.isFunctionDeclaration(declaration)) return 'function'
	if (ts.isVariableDeclaration(declaration)) return 'const'
	return 'type'
}

function getDeclarationSignature(
	declaration: NamedDeclaration,
	sourceFile: ts.SourceFile,
	checker: ts.TypeChecker
): string {
	if (ts.isTypeAliasDeclaration(declaration)) {
		return declaration.type.getText(sourceFile)
	}

	if (ts.isFunctionDeclaration(declaration)) {
		try {
			const signature = checker.getSignatureFromDeclaration(declaration)
			if (signature) {
				return checker.signatureToString(
					signature,
					declaration,
					ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.WriteArrowStyleSignature
				)
			}
			return checker.typeToString(
				checker.getTypeAtLocation(declaration),
				declaration,
				ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.WriteArrowStyleSignature
			)
		} catch {
			return '(unknown)'
		}
	}

	if (ts.isVariableDeclaration(declaration)) {
		try {
			if (declaration.type) return declaration.type.getText(sourceFile)
			return checker.typeToString(
				checker.getTypeAtLocation(declaration),
				declaration,
				ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.WriteArrowStyleSignature
			)
		} catch {
			return '(unknown)'
		}
	}

	const heritage = declaration.heritageClauses
		?.map((clause) => clause.getText(sourceFile))
		.filter(Boolean)
		.join(' ')

	if (ts.isClassDeclaration(declaration)) {
		const abstractPrefix = declaration.modifiers?.some(
			(modifier) => modifier.kind === ts.SyntaxKind.AbstractKeyword
		)
			? 'abstract '
			: ''
		return `${abstractPrefix}class ${declaration.name?.text ?? '(anonymous)'}${
			heritage ? ` ${heritage}` : ''
		}`
	}

	return `interface ${declaration.name.text}${heritage ? ` ${heritage}` : ''}`
}

function getMemberSignature(
	member: ts.ClassElement | ts.TypeElement,
	sourceFile: ts.SourceFile,
	checker: ts.TypeChecker
): string {
	let signature = '(unknown)'
	try {
		if (
			(ts.isPropertyDeclaration(member) ||
				ts.isPropertySignature(member) ||
				ts.isMethodDeclaration(member) ||
				ts.isMethodSignature(member)) &&
			member.type
		) {
			signature = member.type.getText(sourceFile)
		} else {
			signature = checker.typeToString(
				checker.getTypeAtLocation(member),
				member,
				ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.WriteArrowStyleSignature
			)
		}
	} catch {
		// keep fallback
	}
	return signature
}

function extractTypeMembers(
	declaration: ts.ClassDeclaration | ts.InterfaceDeclaration,
	context: DeclarationContext
): ExtractedTypeMember[] {
	const sourceFile = getDeclarationSourceFile(declaration)
	const members: ExtractedTypeMember[] = []

	for (const member of declaration.members) {
		if (isExcludedComment(member, sourceFile)) continue

		if (ts.isClassDeclaration(declaration)) {
			const modifiers = ts.canHaveModifiers(member) ? ts.getModifiers(member) : undefined
			if (
				modifiers?.some(
					(modifier) =>
						modifier.kind === ts.SyntaxKind.PrivateKeyword ||
						modifier.kind === ts.SyntaxKind.ProtectedKeyword
				)
			) {
				continue
			}
		}

		if (ts.isConstructorDeclaration(member)) continue

		const name = 'name' in member ? getPropertyName(member.name) : undefined
		if (!name || name.startsWith('_')) continue

		let kind: ExtractedTypeMember['kind']
		if (ts.isMethodDeclaration(member) || ts.isMethodSignature(member)) {
			kind = 'method'
		} else if (ts.isGetAccessorDeclaration(member) || ts.isGetAccessor(member)) {
			kind = 'getter'
		} else if (ts.isPropertyDeclaration(member) || ts.isPropertySignature(member)) {
			kind = 'property'
		} else {
			continue
		}

		const jsdoc = extractJsDoc(member, sourceFile)
		if (jsdoc.description === '__EXCLUDED__') continue

		members.push({
			name,
			kind,
			signature: getMemberSignature(member, sourceFile, context.checker),
			description: jsdoc.description,
			params: jsdoc.params,
			examples: jsdoc.examples,
			optional: 'questionToken' in member && !!member.questionToken,
			static:
				ts.isClassDeclaration(declaration) &&
				(ts.canHaveModifiers(member) ? ts.getModifiers(member) : undefined)?.some(
					(modifier) => modifier.kind === ts.SyntaxKind.StaticKeyword
				) === true,
		})
	}

	return members
}

function extractNamedType(
	name: string,
	context: DeclarationContext,
	visited = new Set<string>()
): ExtractedNamedType | undefined {
	if (visited.has(name)) return undefined
	const declaration = context.declarations.get(name)
	if (!declaration) return undefined

	visited.add(name)

	const sourceFile = getDeclarationSourceFile(declaration)
	const result: ExtractedNamedType = {
		name,
		kind: getDeclarationKind(declaration),
		signature: getDeclarationSignature(declaration, sourceFile, context.checker),
		description: extractJsDoc(declaration, sourceFile).description,
		params: extractJsDoc(declaration, sourceFile).params,
		examples: extractJsDoc(declaration, sourceFile).examples,
	}

	if (ts.isClassDeclaration(declaration) || ts.isInterfaceDeclaration(declaration)) {
		result.members = extractTypeMembers(declaration, context)
		return result
	}

	if (ts.isFunctionDeclaration(declaration) || ts.isVariableDeclaration(declaration)) {
		return result
	}

	result.aliasedTo = declaration.type.getText(sourceFile)

	if (ts.isTypeReferenceNode(declaration.type)) {
		const baseTypeName = declaration.type.typeName.getText(sourceFile)
		if (baseTypeName !== name) {
			result.resolvedType = extractNamedType(baseTypeName, context, visited)
		}

		const relatedTypeNames = (declaration.type.typeArguments ?? [])
			.filter((arg): arg is ts.TypeReferenceNode => ts.isTypeReferenceNode(arg))
			.map((arg) => arg.getText(sourceFile))
			.filter((typeName) => {
				if (typeName === baseTypeName) return false
				const relatedDeclaration = context.declarations.get(typeName)
				return !!relatedDeclaration && ts.isInterfaceDeclaration(relatedDeclaration)
			})

		const relatedTypes = relatedTypeNames
			.map((typeName) => extractNamedType(typeName, context, visited))
			.filter((type): type is ExtractedNamedType => type !== undefined)

		if (relatedTypes.length > 0) {
			result.relatedTypes = relatedTypes
		}
	}

	return result
}

function getSymbolDeclaration(
	symbol: ts.Symbol | undefined,
	checker: ts.TypeChecker
): NamedDeclaration | undefined {
	if (!symbol) return undefined
	const resolvedSymbol =
		symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol
	const declaration = resolvedSymbol.declarations?.find(
		(declaration): declaration is NamedDeclaration =>
			ts.isClassDeclaration(declaration) ||
			ts.isInterfaceDeclaration(declaration) ||
			ts.isTypeAliasDeclaration(declaration) ||
			ts.isFunctionDeclaration(declaration) ||
			ts.isVariableDeclaration(declaration)
	)
	return declaration
}

function extractNamedTypeFromDeclaration(
	declaration: NamedDeclaration,
	context: DeclarationContext
): ExtractedNamedType | undefined {
	const name = ts.isVariableDeclaration(declaration)
		? ts.isIdentifier(declaration.name)
			? declaration.name.text
			: undefined
		: declaration.name?.text
	if (!name) return undefined
	if (!context.declarations.has(name)) {
		context.declarations.set(name, declaration)
	}
	return extractNamedType(name, context)
}

function findNode<T extends ts.Node>(
	root: ts.Node,
	predicate: (node: ts.Node) => node is T
): T | undefined {
	let result: T | undefined
	const visit = (node: ts.Node) => {
		if (result) return
		if (predicate(node)) {
			result = node
			return
		}
		ts.forEachChild(node, visit)
	}
	visit(root)
	return result
}

// --- Extract exec helpers from exec-helpers.ts ---

function extractExecHelpers(): ExtractedExecSection {
	const context = createDeclarationContext([
		execHelpersPath,
		editorDtsPath,
		storeDtsPath,
		tlschemaDtsPath,
	])
	const sourceFile = context.sourceFiles.get(execHelpersPath)
	if (!sourceFile) {
		throw new Error(`Could not load source file: ${execHelpersPath}`)
	}

	// Find the helpers object inside createExecHelpers function
	const helpersDeclaration = findNode(
		sourceFile,
		(node): node is ts.VariableDeclaration =>
			ts.isVariableDeclaration(node) &&
			ts.isIdentifier(node.name) &&
			node.name.text === 'helpers' &&
			!!node.initializer &&
			ts.isObjectLiteralExpression(node.initializer)
	)

	if (
		!helpersDeclaration ||
		!helpersDeclaration.initializer ||
		!ts.isObjectLiteralExpression(helpersDeclaration.initializer)
	) {
		throw new Error('Could not find helpers object in exec-helpers.ts')
	}

	// Collect tldraw imports
	const tldrawImports = new Map<string, string>()
	for (const statement of sourceFile.statements) {
		if (!ts.isImportDeclaration(statement)) continue
		if (
			!ts.isStringLiteral(statement.moduleSpecifier) ||
			statement.moduleSpecifier.text !== 'tldraw'
		)
			continue
		if (
			!statement.importClause?.namedBindings ||
			!ts.isNamedImports(statement.importClause.namedBindings)
		) {
			continue
		}

		for (const element of statement.importClause.namedBindings.elements) {
			const localName = element.name.text
			const importedName = element.propertyName?.text ?? localName
			tldrawImports.set(localName, importedName)
		}
	}

	const helpers: ExtractedExecHelper[] = []

	for (const property of helpersDeclaration.initializer.properties) {
		if (!ts.isPropertyAssignment(property) && !ts.isShorthandPropertyAssignment(property)) continue

		const helperName = getPropertyName(property.name)
		if (!helperName) continue

		const initializer = ts.isPropertyAssignment(property) ? property.initializer : property.name
		let typeInfo: ExtractedNamedType | undefined
		let source: ExtractedExecHelper['source'] = 'local'
		let origin = helperName

		if (ts.isIdentifier(initializer)) {
			const importedName = tldrawImports.get(initializer.text)
			if (importedName) {
				source = 'tldraw'
				origin = importedName
				typeInfo = extractNamedType(importedName, context)
			}

			if (!typeInfo) {
				const symbol = context.checker.getSymbolAtLocation(initializer)
				const declaration = getSymbolDeclaration(symbol, context.checker)
				typeInfo = declaration ? extractNamedTypeFromDeclaration(declaration, context) : undefined
				if (declaration && declaration.getSourceFile().fileName.includes('/packages/')) {
					source = 'tldraw'
					origin = ts.isVariableDeclaration(declaration)
						? ts.isIdentifier(declaration.name)
							? declaration.name.text
							: 'tldraw'
						: (declaration.name?.text ?? 'tldraw')
				}
			}
		} else if (ts.isCallExpression(initializer) && ts.isIdentifier(initializer.expression)) {
			// Factory function pattern: someFn(editor) — resolve the inner return type
			const factoryName = initializer.expression.text
			const declaration = context.declarations.get(factoryName)
			if (declaration && ts.isFunctionDeclaration(declaration)) {
				const returnStatement = findNode(
					declaration,
					(node): node is ts.ReturnStatement =>
						ts.isReturnStatement(node) && !!node.expression && ts.isArrowFunction(node.expression)
				)
				if (returnStatement?.expression && ts.isArrowFunction(returnStatement.expression)) {
					const returnJsDoc = extractJsDoc(returnStatement, sourceFile)
					const declarationJsDoc = extractJsDoc(declaration, sourceFile)
					typeInfo = {
						name: helperName,
						kind: 'function',
						signature: context.checker.typeToString(
							context.checker.getTypeAtLocation(returnStatement.expression),
							returnStatement.expression,
							ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.WriteArrowStyleSignature
						),
						description: returnJsDoc.description || declarationJsDoc.description,
						params: returnJsDoc.params.length > 0 ? returnJsDoc.params : declarationJsDoc.params,
						examples:
							returnJsDoc.examples.length > 0 ? returnJsDoc.examples : declarationJsDoc.examples,
					}
				}
			}
			source = 'local'
			origin = helperName
		}

		helpers.push({
			name: helperName,
			source,
			origin,
			signature: typeInfo?.signature ?? '(unknown)',
			description: typeInfo?.description ?? '',
			params: typeInfo?.params ?? [],
			examples: typeInfo?.examples ?? [],
			typeInfo,
		})
	}

	return {
		helperCount: helpers.length,
		helpers,
	}
}

// --- Extract Editor members ---

function extract(): ExtractedMember[] {
	const program = ts.createProgram([editorDtsPath, storeDtsPath, tlschemaDtsPath], {
		target: ts.ScriptTarget.ES2020,
		moduleResolution: ts.ModuleResolutionKind.Node10,
	})
	const checker = program.getTypeChecker()
	const sourceFile = program.getSourceFile(editorDtsPath)
	if (!sourceFile) {
		throw new Error(`Could not load source file: ${editorDtsPath}`)
	}

	let editorClass: ts.ClassDeclaration | undefined
	ts.forEachChild(sourceFile, (node) => {
		if (ts.isClassDeclaration(node) && node.name?.text === 'Editor') {
			editorClass = node
		}
	})

	if (!editorClass) {
		throw new Error('Could not find Editor class in .d.ts file')
	}

	const members: ExtractedMember[] = []

	for (const member of editorClass.members) {
		const modifiers = ts.canHaveModifiers(member) ? ts.getModifiers(member) : undefined
		if (
			modifiers?.some(
				(m) => m.kind === ts.SyntaxKind.PrivateKeyword || m.kind === ts.SyntaxKind.ProtectedKeyword
			)
		) {
			continue
		}

		if (isExcludedComment(member, sourceFile)) continue

		const name = member.name && ts.isIdentifier(member.name) ? member.name.text : undefined
		if (!name) continue
		if (name.startsWith('_')) continue
		if (ts.isConstructorDeclaration(member)) continue

		let kind: 'method' | 'property' | 'getter'
		if (ts.isMethodDeclaration(member) || ts.isMethodSignature(member)) {
			kind = 'method'
		} else if (ts.isGetAccessorDeclaration(member) || ts.isGetAccessor(member)) {
			kind = 'getter'
		} else if (ts.isPropertyDeclaration(member) || ts.isPropertySignature(member)) {
			kind = 'property'
		} else {
			continue
		}

		const type = checker.getTypeAtLocation(member)
		let signature: string
		try {
			signature = checker.typeToString(
				type,
				member,
				ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.WriteArrowStyleSignature
			)
		} catch {
			signature = '(unknown)'
		}

		const jsdoc = extractJsDoc(member, sourceFile)
		if (jsdoc.description === '__EXCLUDED__') continue

		members.push({
			name,
			kind,
			signature,
			description: jsdoc.description,
			params: jsdoc.params,
			examples: jsdoc.examples,
			category: categorize(name),
		})
	}

	return members
}

// --- Extract focused shape types from format.ts ---

const FOCUSED_SHAPE_INTERFACES = [
	'FocusedGeoShape',
	'FocusedTextShape',
	'FocusedArrowShape',
	'FocusedLineShape',
	'FocusedNoteShape',
	'FocusedDrawShape',
]

function toPascalCase(value: string) {
	return value
		.split(/[^a-zA-Z0-9]+/)
		.filter(Boolean)
		.map((part) => part[0].toUpperCase() + part.slice(1))
		.join('')
}

function extractFocusedShapeTypes(): ExtractedTypesSection {
	const context = createDeclarationContext([formatTsPath, editorDtsPath, tlschemaDtsPath])
	const sourceFile = context.sourceFiles.get(formatTsPath)
	if (!sourceFile) {
		throw new Error(`Could not load source file: ${formatTsPath}`)
	}

	const allShapeTypes: string[] = []
	const shapes: ExtractedShapeType[] = []

	for (const ifaceName of FOCUSED_SHAPE_INTERFACES) {
		const declaration = context.declarations.get(ifaceName)
		if (!declaration || !ts.isInterfaceDeclaration(declaration)) {
			console.error(`Warning: could not find interface ${ifaceName} in format.ts`)
			continue
		}

		const ifaceSourceFile = declaration.getSourceFile()
		const jsdoc = extractJsDoc(declaration, ifaceSourceFile)

		const props: ExtractedTypeProperty[] = []
		let shapeType = ''
		const unionShapeTypes: string[] = []

		for (const member of declaration.members) {
			if (!ts.isPropertySignature(member) && !ts.isPropertyDeclaration(member)) continue
			const propName = getPropertyName(member.name)
			if (!propName) continue

			let signature = '(unknown)'
			try {
				const memberType = context.checker.getTypeAtLocation(member)
				signature = context.checker.typeToString(
					memberType,
					member,
					ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.InTypeAlias
				)
			} catch {
				if (member.type) signature = member.type.getText(ifaceSourceFile)
			}

			const propJsdoc = extractJsDoc(member, ifaceSourceFile)

			if (propName === '_type') {
				const memberType = context.checker.getTypeAtLocation(member)
				if (memberType.isStringLiteral()) {
					shapeType = memberType.value
				} else if (memberType.isUnion()) {
					for (const t of memberType.types) {
						if (t.isStringLiteral()) {
							allShapeTypes.push(t.value)
							unionShapeTypes.push(t.value)
						}
					}
				}
			}

			props.push({
				name: propName,
				signature,
				description: propJsdoc.description,
				optional: !!member.questionToken,
			})
		}

		if (shapeType && shapeType !== 'geo') {
			allShapeTypes.push(shapeType)
		}

		const displayName = ifaceName.replace(/^Focused/, '')
		const propNames = props.map((p) => p.name).join(', ')
		const signature = `{ ${propNames} }`

		if (unionShapeTypes.length > 0) {
			for (const concreteShapeType of unionShapeTypes) {
				const concreteName = `${toPascalCase(concreteShapeType)}Shape`
				shapes.push({
					name: concreteName,
					shapeType: concreteShapeType,
					signature,
					description: jsdoc.description,
					propsType: `${concreteName}Props`,
					propsDescription: jsdoc.description,
					props: props.map((prop) =>
						prop.name === '_type'
							? {
									...prop,
									signature: `"${concreteShapeType}"`,
								}
							: prop
					),
				})
			}
			continue
		}

		shapes.push({
			name: displayName,
			shapeType,
			signature,
			description: jsdoc.description,
			propsType: `${displayName}Props`,
			propsDescription: jsdoc.description,
			props,
		})
	}

	return {
		shapeTypes: allShapeTypes,
		shapes,
	}
}

// --- Generate METHOD_MAP ---

type ArgKind =
	| 'id'
	| 'id-or-shape'
	| 'ids-or-shapes'
	| 'spread-ids'
	| 'shape-partial'
	| 'shape-partials'
	| 'update-partial'
	| 'update-partials'
type RetKind =
	| 'this'
	| 'shape'
	| 'shape-or-null'
	| 'shapes'
	| 'id'
	| 'id-or-null'
	| 'ids'
	| 'id-set'

interface MethodMapEntry {
	args: ArgKind[]
	ret: RetKind
}

function generateMethodMap(
	editorClass: ts.ClassDeclaration,
	context: DeclarationContext
): Record<string, MethodMapEntry> {
	const map: Record<string, MethodMapEntry> = {}

	for (const member of editorClass.members) {
		const modifiers = ts.canHaveModifiers(member) ? ts.getModifiers(member) : undefined
		if (
			modifiers?.some(
				(m) => m.kind === ts.SyntaxKind.PrivateKeyword || m.kind === ts.SyntaxKind.ProtectedKeyword
			)
		)
			continue

		const name = member.name && ts.isIdentifier(member.name) ? member.name.text : undefined
		if (!name || name.startsWith('_')) continue

		const memberType = context.checker.getTypeAtLocation(member)
		const signatures = memberType.getCallSignatures()
		if (signatures.length === 0) continue

		const args: ArgKind[] = []
		let ret: RetKind | null = null

		for (const sig of signatures) {
			for (let i = 0; i < sig.parameters.length; i++) {
				const param = sig.parameters[i]
				const paramType = context.checker.getTypeOfSymbolAtLocation(param, member)
				const paramStr = context.checker.typeToString(
					paramType,
					member,
					ts.TypeFormatFlags.NoTruncation
				)
				const isRest = !!(
					param.declarations?.[0] &&
					ts.isParameter(param.declarations[0]) &&
					param.declarations[0].dotDotDotToken
				)

				if (args[i]) continue

				const argKind = classifyParamType(paramStr, isRest)
				if (argKind) {
					while (args.length < i) args.push('id')
					args[i] = argKind
				}
			}

			if (!ret) {
				const retType = sig.getReturnType()
				const retStr = context.checker.typeToString(
					retType,
					member,
					ts.TypeFormatFlags.NoTruncation
				)
				ret = classifyReturnType(retType, retStr, context.checker, member)
			}
		}

		if (args.length > 0 || ret) {
			map[name] = { args, ret: ret ?? 'this' }
		}
	}

	return map
}

function classifyParamType(typeStr: string, isRest: boolean): ArgKind | null {
	if (typeStr.includes('TLCreateShapePartial')) {
		return typeStr.includes('[]') ? 'shape-partials' : 'shape-partial'
	}
	if (typeStr.includes('TLShapePartial')) {
		if (typeStr.includes('[]') || typeStr.includes('Array')) return 'update-partials'
		return 'update-partial'
	}
	if (isRest && (typeStr.includes('TLShapeId') || typeStr.includes('TLShape'))) {
		return 'spread-ids'
	}
	if (
		(typeStr.includes('TLShape[]') || typeStr.includes('TLShapeId[]')) &&
		typeStr.includes('[]')
	) {
		return 'ids-or-shapes'
	}
	if (
		typeStr.includes('TLShape') ||
		typeStr.includes('TLShapeId') ||
		typeStr.includes('TLParentId')
	) {
		return 'id-or-shape'
	}
	return null
}

function classifyReturnType(
	retType: ts.Type,
	typeStr: string,
	checker: ts.TypeChecker,
	member: ts.ClassElement
): RetKind | null {
	if (typeStr === 'this') return 'this'

	if (typeStr.includes('Set<') && typeStr.includes('TLShapeId')) return 'id-set'

	let resolvedStr = typeStr
	if (retType.isTypeParameter()) {
		const constraint = retType.getConstraint()
		if (constraint) {
			resolvedStr = checker.typeToString(constraint, member, ts.TypeFormatFlags.NoTruncation)
		}
	}

	if (retType.isUnion()) {
		let hasShapeType = false
		let hasShapeIdType = false
		let hasNullish = false
		for (const t of retType.types) {
			let resolved = t
			if (t.isTypeParameter()) {
				const c = t.getConstraint()
				if (c) resolved = c
			}
			const s = checker.typeToString(resolved)
			if (s === 'undefined' || s === 'null') hasNullish = true
			else if (s.includes('TLShapeId')) hasShapeIdType = true
			else if (s.includes('Shape')) hasShapeType = true
		}
		if (hasShapeType && !hasShapeIdType) return 'shape-or-null'
		if (hasShapeIdType && hasNullish) return 'id-or-null'
	}

	if (
		resolvedStr.includes('TLShape') &&
		!resolvedStr.includes('TLShapeId') &&
		(resolvedStr.includes('[]') || typeStr.includes('[]'))
	)
		return 'shapes'

	if (resolvedStr.includes('TLShapeId') && resolvedStr.includes('[]')) return 'ids'

	if (resolvedStr.includes('TLShape') && !resolvedStr.includes('TLShapeId')) {
		if (/\bTLShape\b/.test(resolvedStr)) return 'shape-or-null'
	}

	if (
		resolvedStr.includes('TLShapeId') &&
		(resolvedStr.includes('null') || resolvedStr.includes('undefined'))
	) {
		return 'id-or-null'
	}

	return null
}

function writeMethodMap(map: Record<string, MethodMapEntry>) {
	fs.writeFileSync(methodMapOutPath, JSON.stringify(map, null, 2))
}

// --- Post-processing: signature rewrites + example conversion ---

/**
 * Read a Record<string, string> from an object literal in a source file,
 * unwrapping `as const` if present.
 */
function readStringRecord(sourceFile: ts.SourceFile, varName: string): Record<string, string> {
	const entries: Record<string, string> = {}
	ts.forEachChild(sourceFile, (node) => {
		if (!ts.isVariableStatement(node)) return
		for (const decl of node.declarationList.declarations) {
			if (!ts.isIdentifier(decl.name) || decl.name.text !== varName) continue
			let init = decl.initializer
			if (init && ts.isAsExpression(init)) init = init.expression
			if (!init || !ts.isObjectLiteralExpression(init)) continue
			for (const prop of init.properties) {
				if (!ts.isPropertyAssignment(prop)) continue
				const key = getPropertyName(prop.name)
				if (!key) continue
				entries[key] = prop.initializer.getText(sourceFile).replace(/['"]/g, '')
			}
		}
	})
	return entries
}

let GEO_TO_FOCUSED: Record<string, string> = {}
let TLDRAW_TO_FOCUSED_FILL: Record<string, string> = {}

const INTERNAL_PROPS = new Set([
	'typeName',
	'rotation',
	'index',
	'parentId',
	'opacity',
	'isLocked',
	'meta',
	'dash',
	'size',
	'font',
	'scale',
	'growY',
	'labelColor',
	'url',
	'verticalAlign',
	'autoSize',
	'fontSizeAdjustment',
	'elbowMidPoint',
	'labelPosition',
	'arrowheadEnd',
	'arrowheadStart',
	'spline',
])

function convertOldFormatExample(example: string): string {
	if (!example.includes('props:') && !(example.includes('type:') && !example.includes('_type'))) {
		return example
	}

	try {
		const wrapped = `const __ex = ${example.includes(';') ? `(() => { ${example} })()` : example}`
		const sf = ts.createSourceFile(
			'example.ts',
			wrapped,
			ts.ScriptTarget.Latest,
			false,
			ts.ScriptKind.TS
		)

		let result = example
		const replacements: Array<{ start: number; end: number; text: string }> = []

		function visitNode(node: ts.Node) {
			if (ts.isObjectLiteralExpression(node)) {
				const converted = tryConvertShapeObject(node, sf)
				if (converted) {
					const prefixLen = wrapped.indexOf(example)
					const start = node.getStart(sf) - prefixLen
					const end = node.getEnd() - prefixLen
					if (start >= 0 && end <= example.length) {
						replacements.push({ start, end, text: converted })
					}
				}
			}
			ts.forEachChild(node, visitNode)
		}

		ts.forEachChild(sf, visitNode)

		replacements.sort((a, b) => b.start - a.start)
		for (const rep of replacements) {
			result = result.slice(0, rep.start) + rep.text + result.slice(rep.end)
		}
		return result
	} catch {
		return example
	}
}

function tryConvertShapeObject(node: ts.ObjectLiteralExpression, sf: ts.SourceFile): string | null {
	const props = new Map<string, string>()
	let nestedProps: Map<string, string> | null = null
	let hasSpread = false

	for (const prop of node.properties) {
		if (ts.isSpreadAssignment(prop)) {
			hasSpread = true
			continue
		}
		if (!ts.isPropertyAssignment(prop)) continue
		const name = getPropertyName(prop.name)
		if (!name) continue

		if (name === 'props' && ts.isObjectLiteralExpression(prop.initializer)) {
			nestedProps = new Map()
			for (const inner of prop.initializer.properties) {
				if (!ts.isPropertyAssignment(inner)) continue
				const innerName = getPropertyName(inner.name)
				if (innerName) nestedProps.set(innerName, inner.initializer.getText(sf))
			}
		} else {
			props.set(name, prop.initializer.getText(sf))
		}
	}

	const typeVal = props.get('type')
	if (!typeVal) return null
	const typeStr = typeVal.replace(/['"]/g, '')

	const shapeTypes = new Set(['geo', 'text', 'arrow', 'line', 'note', 'draw'])
	if (!shapeTypes.has(typeStr)) return null

	if (hasSpread) return null

	const out: Array<[string, string]> = []

	if (typeStr === 'geo' && nestedProps?.has('geo')) {
		const geoVal = nestedProps.get('geo')!.replace(/['"]/g, '')
		out.push(['_type', `'${GEO_TO_FOCUSED[geoVal] ?? geoVal}'`])
		nestedProps.delete('geo')
	} else {
		out.push(['_type', `'${typeStr}'`])
	}

	if (props.has('id')) {
		let idVal = props.get('id')!
		const match = idVal.match(/createShapeId\(\s*['"]([^'"]*)['"]\s*\)/)
		if (match) idVal = `'${match[1]}'`
		out.push(['shapeId', idVal])
	}

	for (const key of ['x', 'y']) {
		if (props.has(key)) out.push([key, props.get(key)!])
	}

	if (nestedProps) {
		for (const [key, val] of nestedProps) {
			if (INTERNAL_PROPS.has(key)) continue

			if (key === 'richText') {
				const rtMatch = val.match(/toRichText\(\s*(['"].*?['"])\s*\)/)
				if (rtMatch) out.push(['text', rtMatch[1]])
				continue
			}

			if (key === 'fill') {
				const fillStr = val.replace(/['"]/g, '')
				out.push(['fill', `'${TLDRAW_TO_FOCUSED_FILL[fillStr] ?? fillStr}'`])
				continue
			}

			if (key === 'color') {
				out.push(['color', val])
				continue
			}

			out.push([key, val])
		}
	}

	const handled = new Set(['type', 'id', 'x', 'y', 'props'])
	for (const [key, val] of props) {
		if (handled.has(key) || INTERNAL_PROPS.has(key)) continue
		out.push([key, val])
	}

	return '{ ' + out.map(([k, v]) => `${k}: ${v}`).join(', ') + ' }'
}

function rewriteSignature(sig: string): string {
	return sig
		.replace(/TLCreateShapePartial(<[^>]*>)?/g, 'TLShape')
		.replace(/TLShapePartial(<[^>]*>)?/g, 'Partial<TLShape>')
		.replace(/TLShapeId/g, 'string')
		.replace(/TLParentId/g, 'string')
}

function postProcessMembers(members: ExtractedMember[]): ExtractedMember[] {
	return members.map((m) => ({
		...m,
		signature: rewriteSignature(m.signature),
		examples: m.examples.map(convertOldFormatExample),
	}))
}

// --- Main ---

function main() {
	console.error(
		`Extracting Editor API from:\n  ${editorDtsPath}\n  ${storeDtsPath}\n  ${tlschemaDtsPath}\n  ${formatTsPath}\n  ${execHelpersPath}`
	)
	fs.mkdirSync(distDir, { recursive: true })

	// Read conversion maps from format.ts via AST
	const formatSf = ts.createSourceFile(
		formatTsPath,
		fs.readFileSync(formatTsPath, 'utf-8'),
		ts.ScriptTarget.Latest
	)
	GEO_TO_FOCUSED = readStringRecord(formatSf, 'GEO_TO_FOCUSED_TYPES')
	TLDRAW_TO_FOCUSED_FILL = readStringRecord(formatSf, 'SHAPE_TO_FOCUSED_FILLS')

	const members = extract()
	const types = extractFocusedShapeTypes()
	const exec = extractExecHelpers()
	const categories = [...new Set(members.map((m) => m.category))].sort()

	// Generate METHOD_MAP
	const editorContext = createDeclarationContext([editorDtsPath, storeDtsPath, tlschemaDtsPath])
	const editorSourceFile = editorContext.sourceFiles.get(editorDtsPath)
	let editorClass: ts.ClassDeclaration | undefined
	if (editorSourceFile) {
		ts.forEachChild(editorSourceFile, (node) => {
			if (ts.isClassDeclaration(node) && node.name?.text === 'Editor') {
				editorClass = node
			}
		})
	}
	if (editorClass) {
		const methodMap = generateMethodMap(editorClass, editorContext)
		writeMethodMap(methodMap)
		console.error(
			`Wrote ${Object.keys(methodMap).length} method map entries to dist/method-map.json`
		)
	}

	const output = {
		extractedAt: new Date().toISOString(),
		memberCount: members.length,
		categories,
		members: postProcessMembers(members),
		types,
		helperCount: exec.helperCount,
		helpers: exec.helpers,
	}

	fs.writeFileSync(outPath, JSON.stringify(output, null, 2))
	console.error(
		`Wrote ${members.length} members (${categories.length} categories), ${types.shapes.length} shape types, and ${exec.helperCount} exec helpers to dist/editor-api.json`
	)
}

main()
