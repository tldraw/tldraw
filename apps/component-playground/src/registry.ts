import { Sketch, Sketchbook } from './sketch'

// The registry holds sketchbooks for many different components, so their props
// types differ per file and can't live in one typed collection. `any` erases them
// at this one boundary — rendering an arbitrary component is inherently untyped,
// and `unknown` won't do because component props are contravariant (a
// `ComponentType<SpecificProps>` is not assignable to `ComponentType<unknown>`).
// Authored sketchbooks stay fully typed via `Sketchbook<Props>`.
type AnySketchbook = Sketchbook<any>
type AnySketch = Sketch<any>

/** One staged sketch, flattened from its sketchbook + named export. */
export interface LoadedSketch {
	/** Stable id, `title/exportName`, e.g. `Comments/Thread/Empty`. */
	id: string
	/** The export name, e.g. `Empty`. */
	name: string
	sketchbook: AnySketchbook
	sketch: AnySketch
}

/** A sketchbook and its loaded sketches, as grouped for the nav. */
export interface LoadedSketchbook {
	title: string
	sketches: LoadedSketch[]
}

type SketchModule = Record<string, unknown> & { default?: AnySketchbook }

// Vite statically discovers every `*.sketchbook.tsx` under `sketchbooks/` at build
// time. `eager` imports them up front, so the registry is plain synchronous data.
const modules = import.meta.glob<SketchModule>('./sketchbooks/**/*.sketchbook.tsx', {
	eager: true,
})

const books: LoadedSketchbook[] = []
const byId = new Map<string, LoadedSketch>()

for (const path in modules) {
	const mod = modules[path]
	const sketchbook = mod.default
	if (!sketchbook || !sketchbook.title) continue

	const sketches: LoadedSketch[] = []
	for (const exportName in mod) {
		if (exportName === 'default') continue
		const sketch = mod[exportName] as AnySketch
		const id = `${sketchbook.title}/${exportName}`
		const loaded: LoadedSketch = { id, name: exportName, sketchbook, sketch }
		sketches.push(loaded)
		byId.set(id, loaded)
	}

	books.push({ title: sketchbook.title, sketches })
}

books.sort((a, b) => a.title.localeCompare(b.title))

export const sketchbooks = books
export const sketchesById = byId
