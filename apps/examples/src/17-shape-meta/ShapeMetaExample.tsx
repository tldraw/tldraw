import { ShapeMeta, Tldraw, track, useEditor } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'

export default function ShapeMetaExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="shape_meta_example" autoFocus>
				<ShapeLabelUiWithHelper />
			</Tldraw>
		</div>
	)
}

const ShapeLabel = ShapeMeta.define<string>('label', {
	getDefaultValue: (shape) => `My ${shape.type} shape`,
})

export const ShapeLabelUiWithHelper = track(function ShapeLabelUiWithHelper() {
	const editor = useEditor()
	const onlySelectedShape = editor.onlySelectedShape

	if (!onlySelectedShape) {
		return null
	}

	const label = editor.getShapeMeta(onlySelectedShape, ShapeLabel)

	function onChange(e: React.ChangeEvent<HTMLInputElement>) {
		editor.updateShapeMeta(onlySelectedShape!, ShapeLabel, e.currentTarget.value)
	}

	return (
		<div style={{ position: 'absolute', zIndex: 300, top: 64, left: 12 }}>
			shape label: <input value={label} onChange={onChange} />
		</div>
	)
})

export const ShapeLabelUiWithoutHelper = track(function ShapeLabelUiWithoutHelper() {
	const editor = useEditor()
	const onlySelectedShape = editor.onlySelectedShape

	if (!onlySelectedShape) {
		return null
	}

	const label = onlySelectedShape.meta.label ?? `My ${onlySelectedShape.type} shape`

	function onChange(e: React.ChangeEvent<HTMLInputElement>) {
		editor.updateShapes([
			{
				id: onlySelectedShape!.id,
				type: onlySelectedShape!.type,
				meta: {
					label: e.currentTarget.value,
				},
			},
		])
	}

	return (
		<div style={{ position: 'absolute', zIndex: 300, top: 64, left: 12 }}>
			{/*
			there's a typescript error on this line if we don't use `as string`! `label` is a
			JsonValue, we don't know if it's a string or not. this example is simple enough that
			it's not a big deal, but in a real app with more complex accesses you'd have to add an
			`as` cast every single time your try to read from `shape.meta`. If you ever wanted to
			change the type/name of one of those properties, you'd have to find and change it 
			everywhere without the IDE helping you.
			*/}
			shape label: <input value={label as string} onChange={onChange} />
		</div>
	)
})
