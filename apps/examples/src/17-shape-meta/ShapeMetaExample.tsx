import { TLShape, Tldraw, track, useEditor } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'

export default function ShapeMetaExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey="shape_meta_example"
				autoFocus
				onMount={(editor) => {
					editor.getInitialMetaForShape = (shape) => {
						return { label: `My ${shape.type} shape` }
					}
				}}
			>
				<ShapeLabelUiWithHelper />
			</Tldraw>
		</div>
	)
}

type WithMeta<T extends TLShape, Meta extends { [key: string]: any }> = T & { meta: Meta }

type ShapeWithMyMeta = WithMeta<TLShape, { label: string }>

export const ShapeLabelUiWithHelper = track(function ShapeLabelUiWithHelper() {
	const editor = useEditor()
	const onlySelectedShape = editor.onlySelectedShape as ShapeWithMyMeta | null

	if (!onlySelectedShape) {
		return null
	}

	function onChange(e: React.ChangeEvent<HTMLInputElement>) {
		if (onlySelectedShape) {
			const { id, type, meta } = onlySelectedShape

			editor.updateShapes<ShapeWithMyMeta>([
				{ id, type, meta: { ...meta, label: e.currentTarget.value } },
			])
		}
	}

	return (
		<div style={{ position: 'absolute', zIndex: 300, top: 64, left: 12 }}>
			shape label: <input value={onlySelectedShape.meta.label} onChange={onChange} />
		</div>
	)
})
