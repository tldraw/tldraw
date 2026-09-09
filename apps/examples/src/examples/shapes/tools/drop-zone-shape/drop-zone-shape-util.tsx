import { useEffect, useState } from 'react'
import { BaseBoxShapeUtil, HTMLContainer, RecordProps, T, TLShape } from 'tldraw'

// There's a guide at the bottom of this file!

const DROP_ZONE_SHAPE_TYPE = 'drop-zone'

declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[DROP_ZONE_SHAPE_TYPE]: { w: number; h: number }
	}
}

export type IDropZoneShape = TLShape<typeof DROP_ZONE_SHAPE_TYPE>

export class DropZoneShapeUtil extends BaseBoxShapeUtil<IDropZoneShape> {
	static override type = DROP_ZONE_SHAPE_TYPE
	static override props: RecordProps<IDropZoneShape> = {
		w: T.number,
		h: T.number,
	}

	getDefaultProps(): IDropZoneShape['props'] {
		return { w: 300, h: 300 }
	}

	component(shape: IDropZoneShape) {
		return <DropZone shape={shape} />
	}

	getIndicatorPath(shape: IDropZoneShape) {
		const path = new Path2D()
		path.rect(0, 0, shape.props.w, shape.props.h)
		return path
	}
}

function DropZone({ shape }: { shape: IDropZoneShape }) {
	// [1]
	const [imageUrl, setImageUrl] = useState<string | null>(null)
	const [isDragOver, setIsDragOver] = useState(false)

	useEffect(() => {
		if (!imageUrl) return
		return () => URL.revokeObjectURL(imageUrl)
	}, [imageUrl])

	return (
		<HTMLContainer
			className={`drop-zone ${isDragOver ? 'drop-zone__over' : ''}`}
			style={{ width: shape.props.w, height: shape.props.h }}
			// [2]
			onDragOver={(e) => {
				e.preventDefault()
				e.stopPropagation()
				setIsDragOver(true)
			}}
			onDragLeave={() => setIsDragOver(false)}
			onDrop={(e) => {
				e.preventDefault()
				e.stopPropagation()
				setIsDragOver(false)
				// [3]
				const file = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith('image/'))
				if (file) setImageUrl(URL.createObjectURL(file))
			}}
		>
			{imageUrl ? <img src={imageUrl} alt="" /> : <span>Drop an image here</span>}
		</HTMLContainer>
	)
}

/*
This is a custom shape, for a more in-depth look at how to create a custom shape,
see our custom shape example.

[1]
The dropped image lives in component state only, so it isn't persisted or synced and
disappears if the shape remounts. A real app would upload the file and store a URL in the
shape's props instead.

[2]
The shape's container has `pointer-events: all` (see drop-zone-shape.css) so it receives
drag events at all. The browser only fires `drop` on an element whose `dragover` called
`preventDefault`, and `stopPropagation` keeps the canvas from also handling the file and
creating an image shape from it.

[3]
Only the first image file is used; anything else dropped on the shape is ignored.
*/
