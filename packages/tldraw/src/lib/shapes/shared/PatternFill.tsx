import { useColorMode, useEditor, useSvgExportContext, useValue } from '@tldraw/editor'
import { useGetHashPatternZoomName } from './defaultStyleDefs'

export function PatternFill({
	d,
	fillColor,
	patternFillFallbackColor,
}: {
	d: string
	fillColor: string
	patternFillFallbackColor: string
}) {
	const editor = useEditor()
	const svgExport = useSvgExportContext()
	const zoomLevel = useValue('zoomLevel', () => editor.getEfficientZoomLevel(), [editor])
	const colorMode = useColorMode()
	const getHashPatternZoomName = useGetHashPatternZoomName()
	const teenyTiny = zoomLevel <= 0.18

	return (
		<>
			<path fill={fillColor} d={d} />
			<path
				fill={
					svgExport
						? `url(#${getHashPatternZoomName(1, colorMode)})`
						: teenyTiny
							? patternFillFallbackColor
							: `url(#${getHashPatternZoomName(zoomLevel, colorMode)})`
				}
				d={d}
			/>
		</>
	)
}
