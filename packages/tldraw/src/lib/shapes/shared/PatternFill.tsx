import {
	useColorMode,
	useEditor,
	useSvgExportContext,
	useUniqueSafeId,
	useValue,
} from '@tldraw/editor'
import { useGetHashPatternZoomName } from './defaultStyleDefs'

export function PatternFill({
	d,
	fillColor,
	patternFillFallbackColor,
	scale = 1,
}: {
	d: string
	fillColor: string
	patternFillFallbackColor: string
	scale?: number
}) {
	const editor = useEditor()
	const svgExport = useSvgExportContext()
	const zoomLevel = useValue('zoomLevel', () => editor.getEfficientZoomLevel(), [editor])
	const colorMode = useColorMode()
	const getHashPatternZoomName = useGetHashPatternZoomName()
	const scaledPatternId = useUniqueSafeId()

	const effectiveZoom = zoomLevel * scale
	const teenyTiny = effectiveZoom <= 0.18
	const sharedPatternId = getHashPatternZoomName(effectiveZoom, colorMode)

	return (
		<>
			{!svgExport && !teenyTiny && scale !== 1 && (
				<pattern
					id={scaledPatternId}
					href={`#${sharedPatternId}`}
					patternTransform={`scale(${scale})`}
				/>
			)}
			<path fill={fillColor} d={d} />
			<path
				fill={
					svgExport
						? `url(#${getHashPatternZoomName(1, colorMode)})`
						: teenyTiny
							? patternFillFallbackColor
							: scale !== 1
								? `url(#${scaledPatternId})`
								: `url(#${sharedPatternId})`
				}
				d={d}
			/>
		</>
	)
}
