import { existsSync, readFileSync } from 'fs'
import { dirname, join, relative, resolve } from 'path'

// The default shape utils have no React: the React code is in each shape's view.
const shapeUtilFiles = [
	'arrow/ArrowShapeUtil.ts',
	'bookmark/BookmarkShapeUtil.ts',
	'draw/DrawShapeUtil.ts',
	'embed/EmbedShapeUtil.ts',
	'frame/FrameShapeUtil.ts',
	'geo/GeoShapeUtil.ts',
	'highlight/HighlightShapeUtil.ts',
	'image/ImageShapeUtil.ts',
	'line/LineShapeUtil.ts',
	'note/NoteShapeUtil.ts',
	'text/TextShapeUtil.ts',
	'video/VideoShapeUtil.ts',
]

// `PathBuilder` builds shape geometry, and its public `toSvg` methods return JSX.
const allowedReactModules = new Set(['shared/PathBuilder.tsx'])

describe.each(shapeUtilFiles)('%s', (file) => {
	it('imports no React code', () => {
		// Walk the util's relative imports. Each module must be a .ts module without a React import.
		// Utils import `@tldraw/editor`, which re-exports `@tldraw/core` with the React layer.
		const seen = new Set<string>()
		const visit = (path: string) => {
			if (seen.has(path)) return
			seen.add(path)
			if (allowedReactModules.has(relative(__dirname, path))) return
			expect(path).not.toMatch(/\.tsx$/)
			const source = readFileSync(path, 'utf8')
			expect(source).not.toMatch(/from 'react'/)
			for (const [, spec] of source.matchAll(/from '(\.[^']+)'/g)) {
				const base = resolve(dirname(path), spec)
				const next = [`${base}.ts`, `${base}.tsx`, join(base, 'index.ts')].find(existsSync)
				if (!next) throw Error(`Cannot resolve ${spec} from ${path}`)
				visit(next)
			}
		}
		visit(join(__dirname, file))
	})
})
