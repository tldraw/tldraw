export type ArgKind =
	| 'id'
	| 'id-or-shape'
	| 'ids-or-shapes'
	| 'spread-ids'
	| 'shape-partial'
	| 'shape-partials'
	| 'update-partial'
	| 'update-partials'

export type RetKind =
	| 'this'
	| 'shape'
	| 'shape-or-null'
	| 'shapes'
	| 'id'
	| 'id-or-null'
	| 'ids'
	| 'id-set'

export interface MethodSpec {
	args: ArgKind[]
	ret: RetKind
}

export type MethodMap = Record<string, MethodSpec>

export interface EditorApiSpec {
	extractedAt: string
	memberCount: number
	categories: string[]
	members: unknown[]
	types: {
		shapeTypes: string[]
		shapes: unknown[]
	}
	helperCount: number
	helpers: unknown[]
}

interface AssetFetcher {
	fetch(input: Request): Promise<Response>
}

const GENERATED_ASSET_BASE_URL = 'https://assets.local/'

let cachedEmbeddedMethodMap: MethodMap | null | undefined

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseMethodMap(value: unknown): MethodMap {
	if (!isPlainObject(value)) {
		throw new Error('Generated method map is missing or invalid.')
	}

	const entries = Object.entries(value).map(([methodName, spec]) => {
		if (!isPlainObject(spec) || !Array.isArray(spec.args) || typeof spec.ret !== 'string') {
			throw new Error(`Generated method map entry "${methodName}" is invalid.`)
		}

		return [
			methodName,
			{
				args: spec.args as ArgKind[],
				ret: spec.ret as RetKind,
			},
		] as const
	})

	return Object.fromEntries(entries)
}

function parseEditorApiSpec(value: unknown): EditorApiSpec {
	if (!isPlainObject(value)) {
		throw new Error('Generated editor API spec is missing or invalid.')
	}

	if (
		!Array.isArray(value.categories) ||
		!Array.isArray(value.members) ||
		!isPlainObject(value.types) ||
		!Array.isArray(value.types.shapeTypes) ||
		!Array.isArray(value.types.shapes) ||
		!Array.isArray(value.helpers)
	) {
		throw new Error('Generated editor API spec is malformed.')
	}

	return {
		extractedAt: typeof value.extractedAt === 'string' ? value.extractedAt : '',
		memberCount: typeof value.memberCount === 'number' ? value.memberCount : value.members.length,
		categories: value.categories.filter(
			(category): category is string => typeof category === 'string'
		),
		members: value.members,
		types: {
			shapeTypes: value.types.shapeTypes.filter(
				(shapeType): shapeType is string => typeof shapeType === 'string'
			),
			shapes: value.types.shapes,
		},
		helperCount: typeof value.helperCount === 'number' ? value.helperCount : value.helpers.length,
		helpers: value.helpers,
	}
}

async function loadGeneratedJsonFromAssets<T>(
	assets: AssetFetcher,
	filename: string,
	parser: (value: unknown) => T
): Promise<T> {
	const response = await assets.fetch(new Request(new URL(filename, GENERATED_ASSET_BASE_URL)))
	if (!response.ok) {
		throw new Error(`Failed to load generated asset "${filename}": ${response.status}`)
	}

	return parser(await response.json())
}

function readMethodMapFromBootstrap(): MethodMap | null {
	if (typeof window === 'undefined') return null

	const bootstrap = (window as Window & { __TLDRAW_BOOTSTRAP__?: unknown }).__TLDRAW_BOOTSTRAP__
	if (!isPlainObject(bootstrap) || !('methodMap' in bootstrap)) {
		return null
	}

	try {
		return parseMethodMap(bootstrap.methodMap)
	} catch {
		return null
	}
}

export async function loadEditorApiSpecFromAssets(assets: AssetFetcher): Promise<EditorApiSpec> {
	return loadGeneratedJsonFromAssets(assets, 'editor-api.json', parseEditorApiSpec)
}

export async function loadMethodMapFromAssets(assets: AssetFetcher): Promise<MethodMap> {
	return loadGeneratedJsonFromAssets(assets, 'method-map.json', parseMethodMap)
}

export function primeEmbeddedMethodMap(): void {
	if (cachedEmbeddedMethodMap !== undefined) return
	cachedEmbeddedMethodMap = readMethodMapFromBootstrap()
}

export function getRequiredEmbeddedMethodMap(): MethodMap {
	if (cachedEmbeddedMethodMap === undefined) {
		cachedEmbeddedMethodMap = readMethodMapFromBootstrap()
	}

	if (!cachedEmbeddedMethodMap) {
		throw new Error('Missing embedded method map. Rebuild the widget assets and reload the app.')
	}

	return cachedEmbeddedMethodMap
}
