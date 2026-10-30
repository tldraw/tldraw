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

	// If there are many shapes in the diff, don't show shadows (for performance reasons)
	const showShadows = numberOfShapes < 20
	const shadow = showShadows ? '-shadow' : ''

	for (const prevShape of Object.values(diff.removed)) {
		if (prevShape.typeName !== 'shape') continue
		diffShapes.push(
			withProps(
				{
					...prevShape,
					opacity: showShadows ? prevShape.opacity : prevShape.opacity / 2,
					meta: { ...prevShape.meta, changeType: `delete${shadow}` },
				},
				{ dash: 'solid' }
			)
		)
	}

	for (const [prevBefore, prevAfter] of Object.values(diff.updated)) {
		if (prevBefore.typeName !== 'shape' || prevAfter.typeName !== 'shape') continue
		diffShapes.push(
			withProps(
				{
					...prevBefore,
					id: `${prevBefore.id}-before` as TLShapeId,
					opacity: prevAfter.opacity / 2,
					meta: { ...prevBefore.meta, changeType: `update-before${shadow}` },
				},
				{ dash: 'dashed', fill: 'none' }
			),
			withProps(
				{ ...prevAfter, meta: { ...prevAfter.meta, changeType: `update-after${shadow}` } },
				{ dash: 'solid' }
			)
		)
	}

	for (const prevShape of Object.values(diff.added)) {
		if (prevShape.typeName !== 'shape') continue
		diffShapes.push(
			withProps(
				{ ...prevShape, meta: { ...prevShape.meta, changeType: `create${shadow}` } },
				{ dash: 'solid' }
			)
		)
	}

	return diffShapes
}

// Only overrides props the shape actually has, so e.g. `fill` is left alone on shapes without one
function withProps(shape: TLShape, overrides: { dash?: 'solid' | 'dashed'; fill?: 'none' }) {
	const props: Record<string, unknown> = { ...shape.props }
	for (const [key, value] of Object.entries(overrides)) {
		if (key in props) props[key] = value
	}
	return { ...shape, props } as TLShape
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
