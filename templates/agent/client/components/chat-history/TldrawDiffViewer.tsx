import { forwardRef, useMemo } from 'react'
import {
	DefaultShapeWrapper,
	RecordsDiff,
	TLRecord,
	TLShape,
	TLShapeId,
	TLShapeWrapperProps,
} from 'tldraw'
import { TldrawViewer } from './TldrawViewer'

export function TldrawDiffViewer({ diff }: { diff: RecordsDiff<TLRecord> }) {
	const diffShapes = useMemo(() => getDiffShapesFromDiff(diff), [diff])
	return <TldrawViewer shapes={diffShapes} components={{ ShapeWrapper: DiffShapeWrapper }} />
}

function getDiffShapesFromDiff(diff: RecordsDiff<TLRecord>): TLShape[] {
	const diffShapes: TLShape[] = []

	const numberOfShapes =
		Object.keys(diff.added).length +
		Object.keys(diff.updated).length +
		Object.keys(diff.removed).length

	// If there are many shapes in the diff, use a border instead of a shadow for performance reasons
	const mode = numberOfShapes > 20 ? 'border' : 'shadow'

	for (const key in diff.removed) {
		const id = key as TLShapeId
		const prevShape = diff.removed[id]
		if (prevShape.typeName !== 'shape') continue
		const shape = {
			...prevShape,
			props: { ...prevShape.props },
			meta: { ...prevShape.meta, changeType: 'delete-' + mode },
		}

		if ('dash' in shape.props) {
			shape.props.dash = 'solid'
		}

		diffShapes.push(shape)
	}

	for (const key in diff.updated) {
		const id = key as TLShapeId

		const prevBefore = diff.updated[id][0]
		const prevAfter = diff.updated[id][1]
		if (prevBefore.typeName !== 'shape' || prevAfter.typeName !== 'shape') continue

		const before = {
			...prevBefore,
			id: (id + '-before') as TLShapeId,
			opacity: prevAfter.opacity / 2,
			props: { ...prevBefore.props },
			meta: { ...prevBefore.meta, changeType: 'update-before-' + mode },
		}

		const after = {
			...prevAfter,
			props: { ...prevAfter.props },
			meta: { ...prevAfter.meta, changeType: 'update-after-' + mode },
		}

		if ('dash' in before.props) {
			before.props.dash = 'dashed'
		}
		if ('fill' in before.props) {
			before.props.fill = 'none'
		}
		if ('dash' in after.props) {
			after.props.dash = 'solid'
		}

		diffShapes.push(before)
		diffShapes.push(after)
	}

	for (const key in diff.added) {
		const id = key as TLShapeId
		const prevShape = diff.added[id]
		if (prevShape.typeName !== 'shape') continue
		const shape = {
			...prevShape,
			props: { ...prevShape.props },
			meta: { ...prevShape.meta, changeType: 'create-' + mode },
		}
		if ('dash' in shape.props) {
			shape.props.dash = 'solid'
		}
		diffShapes.push(shape)
	}

	return diffShapes
}

const DiffShapeWrapper = forwardRef(function DiffShapeWrapper(
	{ children, shape, isBackground }: TLShapeWrapperProps,
	ref: React.Ref<HTMLDivElement>
) {
	const changeType = shape.meta.changeType

	return (
		<DefaultShapeWrapper
			ref={ref}
			shape={shape}
			isBackground={isBackground}
			className={changeType ? 'diff-shape-' + changeType : undefined}
		>
			{children}
		</DefaultShapeWrapper>
	)
})
