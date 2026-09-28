import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import {
	type ArrowFunction,
	type ClassDeclaration,
	type FunctionDeclaration,
	type InterfaceDeclaration,
	type Node,
	type ObjectLiteralExpression,
	type PropertyName,
	type BindingName,
	type ReturnStatement,
	type SourceFile,
	type TypeAliasDeclaration,
	type VariableDeclaration,
	SyntaxKind,
	getLeadingCommentRanges,
	isArrowFunction,
	isAsExpression,
	isCallExpression,
	isClassDeclaration,
	isConstructorDeclaration,
	isFunctionDeclaration,
	isGetAccessorDeclaration,
	isIdentifier,
	isImportDeclaration,
	isInterfaceDeclaration,
	isMethodDeclaration,
	isMethodSignatureDeclaration,
	isNamedImports,
	isNumericLiteral,
	isObjectLiteralExpression,
	isParameterDeclaration,
	isPropertyAssignment,
	isPropertyDeclaration,
	isPropertySignatureDeclaration,
	isReturnStatement,
	isShorthandPropertyAssignment,
	isSpreadAssignment,
	isStringLiteral,
	isTypeAliasDeclaration,
	isTypeReferenceNode,
	isVariableDeclaration,
	isVariableStatement,
} from 'typescript/unstable/ast'
import {
	API,
	type Checker,
	NodeBuilderFlags,
	type Project,
	SignatureKind,
	SymbolFlags,
	type Symbol as TsSymbol,
	type Type,
} from 'typescript/unstable/sync'

// TypeFormatFlags isn't exported by the TS 7 API.
const NoTruncation = 1
const WriteArrowStyleSignature = 1 << 18
const InTypeAlias = 1 << 23

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
		console.error(`Missing: ${p}\nRun 'pnpm exec lazy build' first to generate .d.ts files.`)
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
	| ClassDeclaration
	| InterfaceDeclaration
	| TypeAliasDeclaration
	| FunctionDeclaration
	| VariableDeclaration

// Class and interface members, read through the node's generic child accessors.
type MemberNode = Node & {
	readonly name?: PropertyName
	readonly type?: Node
	readonly modifiers?: readonly Node[]
	readonly postfixToken?: Node
}

interface DeclarationContext {
	project: Project
	checker: Checker
	declarations: Map<string, NamedDeclaration>
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
	member: Node,
	sourceFile: SourceFile
): { description: string; params: ExtractedParam[]; examples: string[] } {
	const empty = { description: '', params: [], examples: [] }

	const ranges = getLeadingCommentRanges(sourceFile.text, member.getFullStart())
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

function getPropertyName(name: PropertyName | BindingName | undefined): string | undefined {
	if (!name) return undefined
	if (isIdentifier(name) || isStringLiteral(name) || isNumericLiteral(name)) {
		return name.text
	}
	return undefined
}

function hasModifier(member: MemberNode, ...kinds: SyntaxKind[]): boolean {
	return member.modifiers?.some((modifier) => kinds.includes(modifier.kind)) === true
}

function hasQuestionToken(member: MemberNode): boolean {
	return member.postfixToken?.kind === SyntaxKind.QuestionToken
}

function isExcludedComment(member: Node, sourceFile: SourceFile): boolean {
	const ranges = getLeadingCommentRanges(sourceFile.text, member.getFullStart())
	if (!ranges) return false
	const lastRange = ranges[ranges.length - 1]
	return sourceFile.text
		.slice(lastRange.pos, lastRange.end)
		.includes('Excluded from this release type')
}

// --- Projects ---

// Configs and example snippets are served to tsgo from memory; every other path
// falls through to the real filesystem.
const virtualFiles = new Map<string, string>()

const projectCompilerOptions = {
	target: 'es2020',
	module: 'esnext',
	// TS 7 dropped Node10 resolution. Ignoring `exports` keeps resolution on each
	// package's `types` field (the built .d.ts), as Node10 did.
	moduleResolution: 'bundler',
	resolvePackageJsonExports: false,
	resolvePackageJsonImports: false,
	jsx: 'react-jsx',
}

function createApi(): API {
	return new API({
		cwd: repoRoot,
		fs: {
			readFile: (fileName) => virtualFiles.get(fileName),
			fileExists: (fileName) => (virtualFiles.has(fileName) ? true : undefined),
		},
	})
}

function openProjects(
	api: API,
	rootFilesByName: Record<string, string[]>
): Record<string, Project> {
	const configPaths: Record<string, string> = {}
	for (const [name, files] of Object.entries(rootFilesByName)) {
		const configPath = path.join(__dirname, `tsconfig.extract-${name}.json`)
		virtualFiles.set(configPath, JSON.stringify({ compilerOptions: projectCompilerOptions, files }))
		configPaths[name] = configPath
	}
	const snapshot = api.updateSnapshot({ openProjects: Object.values(configPaths) })
	const projects: Record<string, Project> = {}
	for (const [name, configPath] of Object.entries(configPaths)) {
		const project = snapshot.getProject(configPath)
		if (!project) throw new Error(`Could not open project: ${configPath}`)
		projects[name] = project
	}
	return projects
}

function getSourceFile(project: Project, fileName: string): SourceFile {
	const sourceFile = project.program.getSourceFile(fileName)
	if (!sourceFile) throw new Error(`Could not load source file: ${fileName}`)
	return sourceFile
}

// --- Declaration context ---

function createDeclarationContext(project: Project, entryPaths: string[]): DeclarationContext {
	const declarations = new Map<string, NamedDeclaration>()
	const indexedSourceFiles = new Set(entryPaths.map((entryPath) => path.resolve(entryPath)))

	for (const fileName of project.program.getSourceFileNames()) {
		const shouldIndex =
			indexedSourceFiles.has(path.resolve(fileName)) ||
			fileName.includes('/packages/') ||
			fileName.includes('/node_modules/@tldraw/') ||
			fileName.includes('/node_modules/tldraw/')
		if (!shouldIndex) continue

		getSourceFile(project, fileName).forEachChild((node) => {
			if (
				(isClassDeclaration(node) ||
					isInterfaceDeclaration(node) ||
					isTypeAliasDeclaration(node) ||
					isFunctionDeclaration(node)) &&
				node.name
			) {
				declarations.set(node.name.text, node)
				return
			}

			if (isVariableStatement(node)) {
				for (const declaration of node.declarationList.declarations) {
					if (isIdentifier(declaration.name)) {
						declarations.set(declaration.name.text, declaration)
					}
				}
			}
		})
	}

	return {
		project,
		checker: project.checker,
		declarations,
	}
}

function getDeclarationSourceFile(declaration: NamedDeclaration): SourceFile {
	return declaration.getSourceFile()
}

function getDeclarationKind(declaration: NamedDeclaration): ExtractedNamedType['kind'] {
	if (isClassDeclaration(declaration)) return 'class'
	if (isInterfaceDeclaration(declaration)) return 'interface'
	if (isFunctionDeclaration(declaration)) return 'function'
	if (isVariableDeclaration(declaration)) return 'const'
	return 'type'
}

function typeToString(checker: Checker, node: Node, flags: number): string {
	const type = checker.getTypeAtLocation(node)
	if (!type) throw new Error('No type at location')
	return checker.typeToString(type, node, flags)
}

function getDeclarationSignature(
	declaration: NamedDeclaration,
	sourceFile: SourceFile,
	project: Project
): string {
	const checker = project.checker
	if (isTypeAliasDeclaration(declaration)) {
		return declaration.type.getText(sourceFile)
	}

	if (isFunctionDeclaration(declaration)) {
		try {
			// Print only this overload's signature, like TS 6's `signatureToString`.
			const signature = checker.getSignatureFromDeclaration(declaration)
			const signatureNode =
				signature &&
				checker.signatureToSignatureDeclaration(
					signature,
					SyntaxKind.FunctionType,
					declaration,
					NodeBuilderFlags.NoTruncation |
						NodeBuilderFlags.IgnoreErrors |
						NodeBuilderFlags.WriteTypeParametersInQualifiedName
				)
			// printNode keeps multi-line type literals; TS 6 wrote signatures on one line.
			if (signatureNode) return project.emitter.printNode(signatureNode).replace(/\n\s*/g, ' ')
			return typeToString(checker, declaration, NoTruncation | WriteArrowStyleSignature)
		} catch {
			return '(unknown)'
		}
	}

	if (isVariableDeclaration(declaration)) {
		try {
			if (declaration.type) return declaration.type.getText(sourceFile)
			return typeToString(checker, declaration, NoTruncation | WriteArrowStyleSignature)
		} catch {
			return '(unknown)'
		}
	}

	const heritage = declaration.heritageClauses
		?.map((clause) => clause.getText(sourceFile))
		.filter(Boolean)
		.join(' ')

	if (isClassDeclaration(declaration)) {
		const abstractPrefix = hasModifier(declaration, SyntaxKind.AbstractKeyword) ? 'abstract ' : ''
		return `${abstractPrefix}class ${declaration.name?.text ?? '(anonymous)'}${
			heritage ? ` ${heritage}` : ''
		}`
	}

	return `interface ${declaration.name.text}${heritage ? ` ${heritage}` : ''}`
}

function getMemberSignature(member: MemberNode, sourceFile: SourceFile, checker: Checker): string {
	let signature = '(unknown)'
	try {
		if (
			(isPropertyDeclaration(member) ||
				isPropertySignatureDeclaration(member) ||
				isMethodDeclaration(member) ||
				isMethodSignatureDeclaration(member)) &&
			member.type
		) {
			signature = member.type.getText(sourceFile)
		} else {
			signature = typeToString(checker, member, NoTruncation | WriteArrowStyleSignature)
		}
	} catch {
		// keep fallback
	}
	return signature
}

function extractTypeMembers(
	declaration: ClassDeclaration | InterfaceDeclaration,
	context: DeclarationContext
): ExtractedTypeMember[] {
	const sourceFile = getDeclarationSourceFile(declaration)
	const members: ExtractedTypeMember[] = []

	for (const member of declaration.members as readonly MemberNode[]) {
		if (isExcludedComment(member, sourceFile)) continue

		if (
			isClassDeclaration(declaration) &&
			hasModifier(member, SyntaxKind.PrivateKeyword, SyntaxKind.ProtectedKeyword)
		) {
			continue
		}

		if (isConstructorDeclaration(member)) continue

		const name = getPropertyName(member.name)
		if (!name || name.startsWith('_')) continue

		let kind: ExtractedTypeMember['kind']
		if (isMethodDeclaration(member) || isMethodSignatureDeclaration(member)) {
			kind = 'method'
		} else if (isGetAccessorDeclaration(member)) {
			kind = 'getter'
		} else if (isPropertyDeclaration(member) || isPropertySignatureDeclaration(member)) {
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
			optional: hasQuestionToken(member),
			static: isClassDeclaration(declaration) && hasModifier(member, SyntaxKind.StaticKeyword),
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
		signature: getDeclarationSignature(declaration, sourceFile, context.project),
		description: extractJsDoc(declaration, sourceFile).description,
		params: extractJsDoc(declaration, sourceFile).params,
		examples: extractJsDoc(declaration, sourceFile).examples,
	}

	if (isClassDeclaration(declaration) || isInterfaceDeclaration(declaration)) {
		result.members = extractTypeMembers(declaration, context)
		return result
	}

	if (isFunctionDeclaration(declaration) || isVariableDeclaration(declaration)) {
		return result
	}

	result.aliasedTo = declaration.type.getText(sourceFile)

	if (isTypeReferenceNode(declaration.type)) {
		const baseTypeName = declaration.type.typeName.getText(sourceFile)
		if (baseTypeName !== name) {
			result.resolvedType = extractNamedType(baseTypeName, context, visited)
		}

		const relatedTypeNames = (declaration.type.typeArguments ?? [])
			.filter((arg) => isTypeReferenceNode(arg))
			.map((arg) => arg.getText(sourceFile))
			.filter((typeName) => {
				if (typeName === baseTypeName) return false
				const relatedDeclaration = context.declarations.get(typeName)
				return !!relatedDeclaration && isInterfaceDeclaration(relatedDeclaration)
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
	symbol: TsSymbol | undefined,
	checker: Checker
): NamedDeclaration | undefined {
	if (!symbol) return undefined
	const resolvedSymbol =
		symbol.flags & SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol
	for (const handle of resolvedSymbol.declarations) {
		const declaration = handle.resolve()
		if (
			declaration &&
			(isClassDeclaration(declaration) ||
				isInterfaceDeclaration(declaration) ||
				isTypeAliasDeclaration(declaration) ||
				isFunctionDeclaration(declaration) ||
				isVariableDeclaration(declaration))
		) {
			return declaration
		}
	}
	return undefined
}

function extractNamedTypeFromDeclaration(
	declaration: NamedDeclaration,
	context: DeclarationContext
): ExtractedNamedType | undefined {
	const name = isVariableDeclaration(declaration)
		? isIdentifier(declaration.name)
			? declaration.name.text
			: undefined
		: declaration.name?.text
	if (!name) return undefined
	if (!context.declarations.has(name)) {
		context.declarations.set(name, declaration)
	}
	return extractNamedType(name, context)
}

function findNode<T extends Node>(root: Node, predicate: (node: Node) => node is T): T | undefined {
	let result: T | undefined
	const visit = (node: Node) => {
		if (result) return
		if (predicate(node)) {
			result = node
			return
		}
		node.forEachChild(visit)
	}
	visit(root)
	return result
}

// --- Extract exec helpers from exec-helpers.ts ---

function extractExecHelpers(project: Project): ExtractedExecSection {
	const context = createDeclarationContext(project, [
		execHelpersPath,
		editorDtsPath,
		storeDtsPath,
		tlschemaDtsPath,
	])
	const sourceFile = getSourceFile(project, execHelpersPath)

	// Find the helpers object inside createExecHelpers function
	const helpersDeclaration = findNode(
		sourceFile,
		(node): node is VariableDeclaration =>
			isVariableDeclaration(node) &&
			isIdentifier(node.name) &&
			node.name.text === 'helpers' &&
			!!node.initializer &&
			isObjectLiteralExpression(node.initializer)
	)

	if (
		!helpersDeclaration ||
		!helpersDeclaration.initializer ||
		!isObjectLiteralExpression(helpersDeclaration.initializer)
	) {
		throw new Error('Could not find helpers object in exec-helpers.ts')
	}

	// Collect tldraw imports
	const tldrawImports = new Map<string, string>()
	for (const statement of sourceFile.statements) {
		if (!isImportDeclaration(statement)) continue
		if (!isStringLiteral(statement.moduleSpecifier) || statement.moduleSpecifier.text !== 'tldraw')
			continue
		if (
			!statement.importClause?.namedBindings ||
			!isNamedImports(statement.importClause.namedBindings)
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
		if (!isPropertyAssignment(property) && !isShorthandPropertyAssignment(property)) continue

		const helperName = getPropertyName(property.name)
		if (!helperName) continue

		const initializer = isPropertyAssignment(property) ? property.initializer : property.name
		let typeInfo: ExtractedNamedType | undefined
		let source: ExtractedExecHelper['source'] = 'local'
		let origin = helperName

		if (isIdentifier(initializer)) {
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
					origin = isVariableDeclaration(declaration)
						? isIdentifier(declaration.name)
							? declaration.name.text
							: 'tldraw'
						: (declaration.name?.text ?? 'tldraw')
				}
			}
		} else if (isCallExpression(initializer) && isIdentifier(initializer.expression)) {
			// Factory function pattern: someFn(editor) — resolve the inner return type
			const factoryName = initializer.expression.text
			const declaration = context.declarations.get(factoryName)
			if (declaration && isFunctionDeclaration(declaration)) {
				const returnStatement = findNode(
					declaration,
					(node): node is ReturnStatement & { expression: ArrowFunction } =>
						isReturnStatement(node) && !!node.expression && isArrowFunction(node.expression)
				)
				if (returnStatement) {
					const returnJsDoc = extractJsDoc(returnStatement, sourceFile)
					const declarationJsDoc = extractJsDoc(declaration, sourceFile)
					typeInfo = {
						name: helperName,
						kind: 'function',
						signature: typeToString(
							context.checker,
							returnStatement.expression,
							NoTruncation | WriteArrowStyleSignature
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

function findEditorClass(project: Project): ClassDeclaration {
	let editorClass: ClassDeclaration | undefined
	getSourceFile(project, editorDtsPath).forEachChild((node) => {
		if (isClassDeclaration(node) && node.name?.text === 'Editor') {
			editorClass = node
		}
	})
	if (!editorClass) {
		throw new Error('Could not find Editor class in .d.ts file')
	}
	return editorClass
}

function extract(project: Project): ExtractedMember[] {
	const checker = project.checker
	const sourceFile = getSourceFile(project, editorDtsPath)
	const editorClass = findEditorClass(project)

	const members: ExtractedMember[] = []

	for (const member of editorClass.members as readonly MemberNode[]) {
		if (hasModifier(member, SyntaxKind.PrivateKeyword, SyntaxKind.ProtectedKeyword)) {
			continue
		}

		if (isExcludedComment(member, sourceFile)) continue

		const name = member.name && isIdentifier(member.name) ? member.name.text : undefined
		if (!name) continue
		if (name.startsWith('_')) continue
		if (isConstructorDeclaration(member)) continue

		let kind: 'method' | 'property' | 'getter'
		if (isMethodDeclaration(member) || isMethodSignatureDeclaration(member)) {
			kind = 'method'
		} else if (isGetAccessorDeclaration(member)) {
			kind = 'getter'
		} else if (isPropertyDeclaration(member) || isPropertySignatureDeclaration(member)) {
			kind = 'property'
		} else {
			continue
		}

		let signature: string
		try {
			signature = typeToString(checker, member, NoTruncation | WriteArrowStyleSignature)
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

function extractFocusedShapeTypes(project: Project): ExtractedTypesSection {
	const context = createDeclarationContext(project, [formatTsPath, editorDtsPath, tlschemaDtsPath])

	const allShapeTypes: string[] = []
	const shapes: ExtractedShapeType[] = []

	for (const ifaceName of FOCUSED_SHAPE_INTERFACES) {
		const declaration = context.declarations.get(ifaceName)
		if (!declaration || !isInterfaceDeclaration(declaration)) {
			console.error(`Warning: could not find interface ${ifaceName} in format.ts`)
			continue
		}

		const ifaceSourceFile = declaration.getSourceFile()
		const jsdoc = extractJsDoc(declaration, ifaceSourceFile)

		const props: ExtractedTypeProperty[] = []
		let shapeType = ''
		const unionShapeTypes: string[] = []

		for (const member of declaration.members as readonly MemberNode[]) {
			if (!isPropertySignatureDeclaration(member) && !isPropertyDeclaration(member)) continue
			const propName = getPropertyName(member.name)
			if (!propName) continue

			let signature = '(unknown)'
			try {
				signature = typeToString(context.checker, member, NoTruncation | InTypeAlias)
			} catch {
				if (member.type) signature = member.type.getText(ifaceSourceFile)
			}

			const propJsdoc = extractJsDoc(member, ifaceSourceFile)

			if (propName === '_type') {
				const memberType = context.checker.getTypeAtLocation(member)
				if (memberType?.isStringLiteralType()) {
					shapeType = memberType.value
				} else if (memberType?.isUnionType()) {
					for (const t of memberType.getTypes() ?? []) {
						if (t.isStringLiteralType()) {
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
				optional: hasQuestionToken(member),
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

function generateMethodMap(project: Project): Record<string, MethodMapEntry> {
	const checker = project.checker
	const map: Record<string, MethodMapEntry> = {}

	for (const member of findEditorClass(project).members as readonly MemberNode[]) {
		if (hasModifier(member, SyntaxKind.PrivateKeyword, SyntaxKind.ProtectedKeyword)) continue

		const name = member.name && isIdentifier(member.name) ? member.name.text : undefined
		if (!name || name.startsWith('_')) continue

		const memberType = checker.getTypeAtLocation(member)
		const signatures = memberType ? checker.getSignaturesOfType(memberType, SignatureKind.Call) : []
		if (signatures.length === 0) continue

		const args: ArgKind[] = []
		let ret: RetKind | null = null

		for (const sig of signatures) {
			const parameters = sig.getParameters()
			for (let i = 0; i < parameters.length; i++) {
				const param = parameters[i]
				const paramType = checker.getTypeOfSymbolAtLocation(param, member)
				const paramStr = checker.typeToString(paramType, member, NoTruncation)
				const paramDeclaration = param.declarations[0]?.resolve()
				const isRest = !!(
					paramDeclaration &&
					isParameterDeclaration(paramDeclaration) &&
					paramDeclaration.dotDotDotToken
				)

				if (args[i]) continue

				const argKind = classifyParamType(paramStr, isRest)
				if (argKind) {
					while (args.length < i) args.push('id')
					args[i] = argKind
				}
			}

			if (!ret) {
				const retType = checker.getReturnTypeOfSignature(sig)
				if (retType) {
					const retStr = checker.typeToString(retType, member, NoTruncation)
					ret = classifyReturnType(retType, retStr, checker, member)
				}
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
	retType: Type,
	typeStr: string,
	checker: Checker,
	member: Node
): RetKind | null {
	if (typeStr === 'this') return 'this'

	if (typeStr.includes('Set<') && typeStr.includes('TLShapeId')) return 'id-set'

	let resolvedStr = typeStr
	if (retType.isTypeParameter()) {
		const constraint = checker.getBaseConstraintOfType(retType)
		if (constraint) {
			resolvedStr = checker.typeToString(constraint, member, NoTruncation)
		}
	}

	if (retType.isUnionType()) {
		let hasShapeType = false
		let hasShapeIdType = false
		let hasNullish = false
		for (const t of retType.getTypes() ?? []) {
			let resolved = t
			if (t.isTypeParameter()) {
				const c = checker.getBaseConstraintOfType(t)
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
function readStringRecord(sourceFile: SourceFile, varName: string): Record<string, string> {
	const entries: Record<string, string> = {}
	sourceFile.forEachChild((node) => {
		if (!isVariableStatement(node)) return
		for (const decl of node.declarationList.declarations) {
			if (!isIdentifier(decl.name) || decl.name.text !== varName) continue
			let init = decl.initializer
			if (init && isAsExpression(init)) init = init.expression
			if (!init || !isObjectLiteralExpression(init)) continue
			for (const prop of init.properties) {
				if (!isPropertyAssignment(prop)) continue
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

function isOldFormatExample(example: string): boolean {
	return example.includes('props:') || (example.includes('type:') && !example.includes('_type'))
}

function wrapExample(example: string): string {
	return `const __ex = ${example.includes(';') ? `(() => { ${example} })()` : example}`
}

function convertOldFormatExample(example: string, sf: SourceFile): string {
	try {
		const wrapped = sf.text

		let result = example
		const replacements: Array<{ start: number; end: number; text: string }> = []

		function visitNode(node: Node) {
			if (isObjectLiteralExpression(node)) {
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
			node.forEachChild(visitNode)
		}

		sf.forEachChild(visitNode)

		replacements.sort((a, b) => b.start - a.start)
		for (const rep of replacements) {
			result = result.slice(0, rep.start) + rep.text + result.slice(rep.end)
		}
		return result
	} catch {
		return example
	}
}

function tryConvertShapeObject(node: ObjectLiteralExpression, sf: SourceFile): string | null {
	const props = new Map<string, string>()
	let nestedProps: Map<string, string> | null = null
	let hasSpread = false

	for (const prop of node.properties) {
		if (isSpreadAssignment(prop)) {
			hasSpread = true
			continue
		}
		if (!isPropertyAssignment(prop)) continue
		const name = getPropertyName(prop.name)
		if (!name) continue

		if (name === 'props' && isObjectLiteralExpression(prop.initializer)) {
			nestedProps = new Map()
			for (const inner of prop.initializer.properties) {
				if (!isPropertyAssignment(inner)) continue
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

function postProcessMembers(api: API, members: ExtractedMember[]): ExtractedMember[] {
	// The TS 7 API has no standalone parser, so examples are parsed as virtual files.
	const oldFormatExamples = [
		...new Set(members.flatMap((m) => m.examples).filter(isOldFormatExample)),
	]
	const exampleFiles = oldFormatExamples.map((example, i) => {
		const fileName = path.join(__dirname, `__example-${i}.ts`)
		virtualFiles.set(fileName, wrapExample(example))
		return fileName
	})
	const { examples: project } = openProjects(api, { examples: exampleFiles })
	const converted = new Map(
		oldFormatExamples.map((example, i) => [
			example,
			convertOldFormatExample(example, getSourceFile(project, exampleFiles[i])),
		])
	)

	return members.map((m) => ({
		...m,
		signature: rewriteSignature(m.signature),
		examples: m.examples.map((example) => converted.get(example) ?? example),
	}))
}

// --- Main ---

function main() {
	console.error(
		`Extracting Editor API from:\n  ${editorDtsPath}\n  ${storeDtsPath}\n  ${tlschemaDtsPath}\n  ${formatTsPath}\n  ${execHelpersPath}`
	)
	fs.mkdirSync(distDir, { recursive: true })

	const api = createApi()
	try {
		// Default shapes augment tlschema through 'tldraw', which format.ts and
		// exec-helpers.ts import, so the Editor-only project must stay separate.
		const projects = openProjects(api, {
			editor: [editorDtsPath, storeDtsPath, tlschemaDtsPath],
			focused: [formatTsPath, editorDtsPath, tlschemaDtsPath],
			exec: [execHelpersPath, editorDtsPath, storeDtsPath, tlschemaDtsPath],
		})

		// Read conversion maps from format.ts via AST
		const formatSf = getSourceFile(projects.focused, formatTsPath)
		GEO_TO_FOCUSED = readStringRecord(formatSf, 'GEO_TO_FOCUSED_TYPES')
		TLDRAW_TO_FOCUSED_FILL = readStringRecord(formatSf, 'SHAPE_TO_FOCUSED_FILLS')

		const members = extract(projects.editor)
		const types = extractFocusedShapeTypes(projects.focused)
		const exec = extractExecHelpers(projects.exec)
		const categories = [...new Set(members.map((m) => m.category))].sort()

		const methodMap = generateMethodMap(projects.editor)
		writeMethodMap(methodMap)
		console.error(
			`Wrote ${Object.keys(methodMap).length} method map entries to dist/method-map.json`
		)

		const output = {
			extractedAt: new Date().toISOString(),
			memberCount: members.length,
			categories,
			members: postProcessMembers(api, members),
			types,
			helperCount: exec.helperCount,
			helpers: exec.helpers,
		}

		fs.writeFileSync(outPath, JSON.stringify(output, null, 2))
		console.error(
			`Wrote ${members.length} members (${categories.length} categories), ${types.shapes.length} shape types, and ${exec.helperCount} exec helpers to dist/editor-api.json`
		)
	} finally {
		api.close()
	}
}

main()
