import { useQuickReactor, useValue } from '@tldraw/state-react'
import { modulate, objectMapValues } from '@tldraw/utils'
import classNames from 'classnames'
import { JSX, useRef } from 'react'
import { tlenv } from '../../globals/environment'
import { useEditorComponents } from '../../hooks/EditorComponentsContext'
import { useContainer } from '../../hooks/useContainer'
import { useEditor } from '../../hooks/useEditor'
import { useScreenBounds } from '../../hooks/useScreenBounds'
import { toDomPrecision } from '../../primitives/utils'
import { setStyleProperty } from '../../utils/dom'
import { Shape } from '../Shape'
import { TLCanvasComponentProps } from './DefaultCanvas'

/**
 * Minimal canvas for read-only document previews. Renders only shapes inside the
 * viewport, no event handlers, no overlays, no selection, no culling controller.
 *
 * @public @react
 */
export function ViewerCanvas({ className }: TLCanvasComponentProps) {
	const editor = useEditor()
	const { Background, SvgDefs } = useEditorComponents()

	const rCanvas = useRef<HTMLDivElement>(null)
	const rHtmlLayer = useRef<HTMLDivElement>(null)
	const container = useContainer()

	useScreenBounds(rCanvas)

	const rMemoizedStuff = useRef({ lodDisableTextOutline: false, allowTextOutline: true })

	useQuickReactor(
		'position layers',
		function positionLayersWhenCameraMoves() {
			const { x, y, z } = editor.getCamera()

			if (rMemoizedStuff.current.allowTextOutline && tlenv.isSafari) {
				container.style.setProperty('--tl-text-outline', 'none')
				rMemoizedStuff.current.allowTextOutline = false
			}

			if (
				rMemoizedStuff.current.allowTextOutline &&
				z < editor.options.textShadowLod !== rMemoizedStuff.current.lodDisableTextOutline
			) {
				const lodDisableTextOutline = z < editor.options.textShadowLod
				container.style.setProperty(
					'--tl-text-outline',
					lodDisableTextOutline ? 'none' : `var(--tl-text-outline-reference)`
				)
				rMemoizedStuff.current.lodDisableTextOutline = lodDisableTextOutline
			}

			const offset =
				z >= 1 ? modulate(z, [1, 8], [0.125, 0.5], true) : modulate(z, [0.1, 1], [-2, 0.125], true)

			const transform = `scale(${toDomPrecision(z)}) translate(${toDomPrecision(
				x + offset
			)}px,${toDomPrecision(y + offset)}px)`

			setStyleProperty(rHtmlLayer.current, 'transform', transform)
		},
		[editor, container]
	)

	const shapeSvgDefs = useValue(
		'shapeSvgDefs',
		() => {
			const shapeSvgDefsByKey = new Map<string, JSX.Element>()
			for (const util of objectMapValues(editor.shapeUtils)) {
				if (!util) return
				const defs = util.getCanvasSvgDefs()
				for (const { key, component: Component } of defs) {
					if (shapeSvgDefsByKey.has(key)) continue
					shapeSvgDefsByKey.set(key, <Component key={key} />)
				}
			}
			return [...shapeSvgDefsByKey.values()]
		},
		[editor]
	)

	return (
		<div
			ref={rCanvas}
			draggable={false}
			className={classNames('tl-canvas', 'tl-canvas__viewer', className)}
			data-testid="canvas"
		>
			<svg className="tl-svg-context" aria-hidden="true">
				<defs>
					{shapeSvgDefs}
					{SvgDefs && <SvgDefs />}
				</defs>
			</svg>
			{Background && (
				<div className="tl-background__wrapper">
					<Background />
				</div>
			)}
			<div ref={rHtmlLayer} className="tl-html-layer tl-shapes" draggable={false}>
				<ShapesLayer />
			</div>
		</div>
	)
}

function ShapesLayer() {
	const editor = useEditor()
	const visibleShapes = useValue(
		'visible rendering shapes',
		() => {
			const all = editor.getRenderingShapes()
			const culled = editor.getCulledShapes()
			if (culled.size === 0) return all
			return all.filter((s) => !culled.has(s.id))
		},
		[editor]
	)
	return (
		<>
			{visibleShapes.map((result) => (
				<Shape key={result.id + '_shape'} {...result} />
			))}
		</>
	)
}
