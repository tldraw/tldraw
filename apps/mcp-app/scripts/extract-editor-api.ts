import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import ts from 'typescript'

const scriptPath = fileURLToPath(import.meta.url)
const __dirname = path.dirname(scriptPath)
const outPath = path.join(__dirname, '..', 'src', 'editor-api.json')

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

// --- Extraction ---

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

function extractShapeTypes(): {
	shapeCount: number
	shapeTypes: string[]
	shapes: ExtractedShapeType[]
} {
	// Collect all .d.ts files under tlschema .tsbuild to find shape type definitions
	const tlschemaBuildDir = path.dirname(tlschemaDtsPath)
	const allDtsFiles: string[] = []
	function walkDir(dir: string) {
		for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
			const fullPath = path.join(dir, entry.name)
			if (entry.isDirectory()) walkDir(fullPath)
			else if (entry.name.endsWith('.d.ts')) allDtsFiles.push(fullPath)
		}
	}
	walkDir(tlschemaBuildDir)

	const program = ts.createProgram(allDtsFiles, {
		target: ts.ScriptTarget.ES2020,
		moduleResolution: ts.ModuleResolutionKind.Node10,
	})
	const checker = program.getTypeChecker()

	const interfaces = new Map<string, { decl: ts.InterfaceDeclaration; sf: ts.SourceFile }>()
	const typeAliases: Array<{ decl: ts.TypeAliasDeclaration; sf: ts.SourceFile }> = []

	for (const sourceFile of program.getSourceFiles()) {
		if (!sourceFile.fileName.includes('tlschema')) continue
		ts.forEachChild(sourceFile, (node) => {
			if (ts.isInterfaceDeclaration(node)) {
				interfaces.set(node.name.text, { decl: node, sf: sourceFile })
			} else if (ts.isTypeAliasDeclaration(node)) {
				typeAliases.push({ decl: node, sf: sourceFile })
			}
		})
	}

	const shapes: ExtractedShapeType[] = []

	for (const { decl: alias, sf } of typeAliases) {
		if (!/^TL[A-Z].*Shape$/.test(alias.name.text)) continue
		if (!ts.isTypeReferenceNode(alias.type)) continue
		if (alias.type.typeName.getText(sf) !== 'TLBaseShape') continue

		const [shapeTypeNode, propsTypeNode] = alias.type.typeArguments ?? []
		if (
			!shapeTypeNode ||
			!ts.isLiteralTypeNode(shapeTypeNode) ||
			!ts.isStringLiteral(shapeTypeNode.literal)
		) {
			continue
		}

		if (!propsTypeNode || !ts.isTypeReferenceNode(propsTypeNode)) continue

		const shapeType = shapeTypeNode.literal.text
		const propsType = propsTypeNode.typeName.getText(sf)
		const propsEntry = interfaces.get(propsType)
		const propsInterface = propsEntry?.decl
		const propsSf = propsEntry?.sf ?? sf
		const props = propsInterface
			? propsInterface.members
					.map((member) => {
						if (!ts.isPropertySignature(member) && !ts.isPropertyDeclaration(member)) return null
						const name = getPropertyName(member.name)
						if (!name) return null

						const description = extractJsDoc(member, propsSf).description
						let signature = '(unknown)'
						try {
							signature = member.type
								? member.type.getText(propsSf)
								: checker.typeToString(
										checker.getTypeAtLocation(member),
										member,
										ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.WriteArrowStyleSignature
									)
						} catch {
							// keep fallback
						}

						return {
							name,
							signature,
							description,
							optional: !!member.questionToken,
						}
					})
					.filter((prop): prop is ExtractedTypeProperty => prop !== null)
			: []

		shapes.push({
			name: alias.name.text,
			shapeType,
			signature: alias.type.getText(sf),
			description: extractJsDoc(alias, sf).description,
			propsType,
			propsDescription: propsInterface ? extractJsDoc(propsInterface, propsSf).description : '',
			props,
		})
	}

	shapes.sort((a, b) => a.shapeType.localeCompare(b.shapeType))

	return {
		shapeCount: shapes.length,
		shapeTypes: shapes.map((shape) => shape.shapeType),
		shapes,
	}
}

// Hardcoded helper metadata — these are the helpers injected into the exec context.
// We define them here rather than parsing source code, since the MCP app's helpers
// are a known, stable set.
function getExecHelpers() {
	return {
		helperCount: 14,
		helpers: [
			{ name: 'toRichText', source: 'tldraw', signature: '(text: string) => TLRichText' },
			{
				name: 'renderPlaintextFromRichText',
				source: 'tldraw',
				signature: '(richText: TLRichText) => string',
			},
			{ name: 'createShapeId', source: 'tldraw', signature: '(id?: string) => TLShapeId' },
			{
				name: 'createBindingId',
				source: 'tldraw',
				signature: '(id?: string) => TLBindingId',
			},
			{ name: 'Box', source: 'tldraw', signature: 'typeof Box' },
			{ name: 'Vec', source: 'tldraw', signature: 'typeof Vec' },
			{ name: 'Mat', source: 'tldraw', signature: 'typeof Mat' },
			{
				name: 'clamp',
				source: 'tldraw',
				signature: '(value: number, min: number, max: number) => number',
			},
			{
				name: 'degreesToRadians',
				source: 'tldraw',
				signature: '(degrees: number) => number',
			},
			{
				name: 'radiansToDegrees',
				source: 'tldraw',
				signature: '(radians: number) => number',
			},
			{
				name: 'getDefaultColorTheme',
				source: 'tldraw',
				signature: '(opts: { isDarkMode: boolean }) => TLDefaultColorTheme',
			},
			{
				name: 'getArrowBindings',
				source: 'tldraw',
				signature: '(editor: Editor, arrow: TLArrowShape) => TLArrowBindings',
			},
			{
				name: 'fitFrameToContent',
				source: 'tldraw',
				signature: '(editor: Editor, id: TLShapeId, opts?: object) => void',
			},
			{
				name: 'createArrowBetweenShapes',
				source: 'local',
				signature:
					'(fromId: TLShapeId, toId: TLShapeId, opts?: { bend?: number; text?: string }) => Editor',
			},
		],
	}
}

function main() {
	console.error(
		`Extracting Editor API from:\n  ${editorDtsPath}\n  ${storeDtsPath}\n  ${tlschemaDtsPath}`
	)

	const members = extract()
	const types = extractShapeTypes()
	const helpers = getExecHelpers()
	const categories = [...new Set(members.map((m) => m.category))].sort()

	const output = {
		extractedAt: new Date().toISOString(),
		memberCount: members.length,
		categories,
		members,
		types,
		helperCount: helpers.helperCount,
		helpers: helpers.helpers,
	}

	fs.writeFileSync(outPath, JSON.stringify(output, null, 2))
	console.error(
		`Wrote ${members.length} members (${categories.length} categories), ${types.shapeCount} shape types, and ${helpers.helperCount} exec helpers to src/editor-api.json`
	)
}

main()
