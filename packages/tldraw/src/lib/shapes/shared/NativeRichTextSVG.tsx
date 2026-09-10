import { useEditor, useSvgExportContext } from '@tldraw/editor'
import { SvgNode, renderSvgTree } from '@tldraw/rich-text-layout'
import { createElement, useEffect, useState } from 'react'
import { flushSync } from 'react-dom'
import { TLNativeTextExportMeasurer } from '../../utils/text/NativeTextExportManager'
import { isLegacyAlign } from './legacyProps'
import { ForeignObjectRichTextSVG, RichTextSVGProps } from './RichTextLabel'

/**
 * The same props as {@link RichTextSVG}.
 *
 * @public
 */
export type NativeRichTextSVGProps = RichTextSVGProps

import { getExportTextMeasurer } from '../../utils/text/NativeTextExportManager'

function svgNodeToJsx(node: SvgNode, key: number): React.ReactElement {
	const props: Record<string, unknown> = { key }
	for (const [name, value] of Object.entries(node.attrs)) {
		if (name === 'style') {
			// React wants style as an object of camelCased properties
			const style: Record<string, string> = {}
			for (const declaration of String(value).split(';')) {
				const [prop, val] = declaration.split(':')
				if (!prop || val === undefined) continue
				style[prop.trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = val.trim()
			}
			props.style = style
			continue
		}
		props[name === 'xml:space' ? 'xmlSpace' : name] = value
	}
	return createElement(
		node.tag,
		props,
		...node.children.map((child, i) => (typeof child === 'string' ? child : svgNodeToJsx(child, i)))
	)
}

/**
 * Lay a label out for export and return its SVG tree. The layout is positioned like
 * `RichTextSVG`'s flex wrapper: padded, wrapped to the bounds and aligned in both axes.
 *
 * @internal
 */
export function layoutLabelForExport(
	measurer: TLNativeTextExportMeasurer,
	props: NativeRichTextSVGProps,
	colors: { link: string; highlight: string; background: string }
): SvgNode {
	const { bounds, padding, fontSize, lineHeight } = props
	// Legacy alignment values are not valid `text-align` values, so the foreignObject export
	// renders their lines start-aligned; match that rather than centring.
	const textAlign = isLegacyAlign(props.textAlign) ? 'start' : props.textAlign
	const innerWidth = Math.max(1, bounds.w - padding * 2)
	const layout = measurer.layoutRichText(props.richText, {
		fontFamily: props.fontFamily,
		fontSize,
		fontWeight: 'normal',
		fontStyle: 'normal',
		lineHeight,
		padding: '0px',
		color: props.labelColor,
		// The foreignObject path stretches the text box to the full inner width, so alignment
		// happens inside it; mirror that by fixing the width.
		maxWidth: innerWidth,
		minWidth: innerWidth,
		textAlign,
		otherStyles: props.wrap === false ? { 'white-space': 'pre' } : undefined,
		colors: { link: colors.link, highlight: colors.highlight },
	})
	const innerHeight = Math.max(0, bounds.h - padding * 2)
	const y =
		props.verticalAlign === 'start'
			? 0
			: props.verticalAlign === 'end'
				? innerHeight - layout.height
				: (innerHeight - layout.height) / 2
	return renderSvgTree(layout, {
		x: bounds.minX + padding,
		y: bounds.minY + padding + y,
		outline: (props.showTextOutline ?? true) ? { color: colors.background, width: 2 } : null,
	})
}

/**
 * `<text>`/`<tspan>` rendering of a rich text label, used by `RichTextSVG` when an export asks
 * for `text: 'native'`. Custom extensions use HTML export unless an explicit layout provider
 * handles their rendering.
 *
 * @public @react
 */
export function NativeRichTextSVG(props: NativeRichTextSVGProps) {
	const editor = useEditor()
	const exportContext = useSvgExportContext()
	const [measurer, setMeasurer] = useState<TLNativeTextExportMeasurer | null | undefined>(undefined)

	useEffect(() => {
		let cancelled = false
		// The export serializes as soon as the promises it waits on settle, so the text has to
		// be committed before this one resolves: flush the state update synchronously.
		const promise = getExportTextMeasurer(editor).then((m) => {
			if (!cancelled) flushSync(() => setMeasurer(m))
		})
		exportContext?.waitUntil(promise)
		return () => {
			cancelled = true
		}
	}, [editor, exportContext])

	if (measurer === undefined) return null
	if (measurer === null) return <ForeignObjectRichTextSVG {...props} />

	const theme = editor.getCurrentTheme()
	const colorMode = exportContext?.colorMode ?? editor.getColorMode()
	const colors = theme.colors[colorMode]
	const tree = layoutLabelForExport(measurer, props, {
		// `.tl-rich-text a` uses --tl-color-primary; `mark` uses #fddd00 in light mode and
		// --tl-color-text-highlight in dark mode (see editor.css).
		link: '#3182ed',
		highlight: colorMode === 'dark' ? '#d1b600' : '#fddd00',
		background: colors.background,
	})
	return svgNodeToJsx(
		{ ...tree, attrs: { ...tree.attrs, fill: props.labelColor, 'data-native-text': 'true' } },
		0
	)
}
