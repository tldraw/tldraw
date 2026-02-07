import {
	getColorValue,
	TLDefaultColorStyle,
	TLDefaultColorTheme,
	TLDefaultFillStyle,
	useEditor,
	useSvgExportContext,
	useValue,
} from '@tldraw/editor'
import React from 'react'
import {
	useGetChevronsPatternZoomName,
	useGetCrossesPatternZoomName,
	useGetDenseDotsPatternZoomName,
	useGetDotsPatternZoomName,
	useGetHashPatternZoomName,
	useGetLargeCheckPatternZoomName,
	useGetLinedChevronsPatternZoomName,
	useGetLinedCrossesPatternZoomName,
	useGetLinedDenseDotsPatternZoomName,
	useGetLinedDotsPatternZoomName,
	useGetLinedPatternZoomName,
	useGetLinedSparseDotsPatternZoomName,
	useGetSmallCheckPatternZoomName,
	useGetSparseDotsPatternZoomName,
} from './defaultStyleDefs'

interface ShapeFillProps {
	d: string
	fill: TLDefaultFillStyle
	color: TLDefaultColorStyle
	theme: TLDefaultColorTheme
	scale: number
}

export const ShapeFill = React.memo(function ShapeFill({
	theme,
	d,
	color,
	fill,
	scale,
}: ShapeFillProps) {
	switch (fill) {
		case 'none': {
			return null
		}
		case 'solid': {
			return <path fill={getColorValue(theme, color, 'semi')} d={d} />
		}
		case 'semi': {
			return <path fill={theme.solid} d={d} />
		}
		case 'fill': {
			return <path fill={getColorValue(theme, color, 'fill')} d={d} />
		}
		case 'pattern': {
			return <PatternFill theme={theme} color={color} fill={fill} d={d} scale={scale} />
		}
		case 'dense-dots': {
			return <DenseDotsFill theme={theme} color={color} fill={fill} d={d} scale={scale} />
		}
		case 'dots': {
			return <DotsFill theme={theme} color={color} fill={fill} d={d} scale={scale} />
		}
		case 'sparse-dots': {
			return <SparseDotsFill theme={theme} color={color} fill={fill} d={d} scale={scale} />
		}
		case 'chevrons': {
			return <ChevronsFill theme={theme} color={color} fill={fill} d={d} scale={scale} />
		}
		case 'crosses': {
			return <CrossesFill theme={theme} color={color} fill={fill} d={d} scale={scale} />
		}
		case 'lined-pattern': {
			return <LinedPatternFill theme={theme} color={color} fill={fill} d={d} scale={scale} />
		}
		case 'lined-dense-dots': {
			return <LinedDenseDotsFill theme={theme} color={color} fill={fill} d={d} scale={scale} />
		}
		case 'lined-chevrons': {
			return <LinedChevronsFill theme={theme} color={color} fill={fill} d={d} scale={scale} />
		}
		case 'lined-crosses': {
			return <LinedCrossesFill theme={theme} color={color} fill={fill} d={d} scale={scale} />
		}
		case 'lined-dots': {
			return <LinedDotsFill theme={theme} color={color} fill={fill} d={d} scale={scale} />
		}
		case 'lined-sparse-dots': {
			return <LinedSparseDotsFill theme={theme} color={color} fill={fill} d={d} scale={scale} />
		}
		case 'large-check': {
			return <LargeCheckFill theme={theme} color={color} fill={fill} d={d} scale={scale} />
		}
		case 'small-check': {
			return <SmallCheckFill theme={theme} color={color} fill={fill} d={d} scale={scale} />
		}
		case 'lined-fill': {
			return <path fill={getColorValue(theme, color, 'linedFill')} d={d} />
		}
	}
})

export function PatternFill({ d, color, theme }: ShapeFillProps) {
	const editor = useEditor()
	const svgExport = useSvgExportContext()
	const zoomLevel = useValue('zoomLevel', () => editor.getEfficientZoomLevel(), [editor])
	const getHashPatternZoomName = useGetHashPatternZoomName()

	const teenyTiny = zoomLevel <= 0.18

	return (
		<>
			<path fill={getColorValue(theme, color, 'pattern')} d={d} />
			<path
				fill={
					svgExport
						? `url(#${getHashPatternZoomName(1, theme.id)})`
						: teenyTiny
							? getColorValue(theme, color, 'semi')
							: `url(#${getHashPatternZoomName(zoomLevel, theme.id)})`
				}
				d={d}
			/>
		</>
	)
}

export function DotsFill({ d, color, theme }: ShapeFillProps) {
	const editor = useEditor()
	const svgExport = useSvgExportContext()
	const zoomLevel = useValue('zoomLevel', () => editor.getEfficientZoomLevel(), [editor])
	const getDotsPatternZoomName = useGetDotsPatternZoomName()

	const teenyTiny = zoomLevel <= 0.18

	return (
		<>
			<path fill={getColorValue(theme, color, 'pattern')} d={d} />
			<path
				fill={
					svgExport
						? `url(#${getDotsPatternZoomName(1, theme.id)})`
						: teenyTiny
							? getColorValue(theme, color, 'semi')
							: `url(#${getDotsPatternZoomName(zoomLevel, theme.id)})`
				}
				d={d}
			/>
		</>
	)
}

export function SparseDotsFill({ d, color, theme }: ShapeFillProps) {
	const editor = useEditor()
	const svgExport = useSvgExportContext()
	const zoomLevel = useValue('zoomLevel', () => editor.getEfficientZoomLevel(), [editor])
	const getSparseDotsPatternZoomName = useGetSparseDotsPatternZoomName()

	const teenyTiny = zoomLevel <= 0.18

	return (
		<>
			<path fill={getColorValue(theme, color, 'pattern')} d={d} />
			<path
				fill={
					svgExport
						? `url(#${getSparseDotsPatternZoomName(1, theme.id)})`
						: teenyTiny
							? getColorValue(theme, color, 'semi')
							: `url(#${getSparseDotsPatternZoomName(zoomLevel, theme.id)})`
				}
				d={d}
			/>
		</>
	)
}

export function DenseDotsFill({ d, color, theme }: ShapeFillProps) {
	const editor = useEditor()
	const svgExport = useSvgExportContext()
	const zoomLevel = useValue('zoomLevel', () => editor.getEfficientZoomLevel(), [editor])
	const getDenseDotsPatternZoomName = useGetDenseDotsPatternZoomName()

	const teenyTiny = zoomLevel <= 0.18

	return (
		<>
			<path fill={getColorValue(theme, color, 'pattern')} d={d} />
			<path
				fill={
					svgExport
						? `url(#${getDenseDotsPatternZoomName(1, theme.id)})`
						: teenyTiny
							? getColorValue(theme, color, 'semi')
							: `url(#${getDenseDotsPatternZoomName(zoomLevel, theme.id)})`
				}
				d={d}
			/>
		</>
	)
}

export function ChevronsFill({ d, color, theme }: ShapeFillProps) {
	const editor = useEditor()
	const svgExport = useSvgExportContext()
	const zoomLevel = useValue('zoomLevel', () => editor.getEfficientZoomLevel(), [editor])
	const getChevronsPatternZoomName = useGetChevronsPatternZoomName()

	const teenyTiny = zoomLevel <= 0.18

	return (
		<>
			<path fill={getColorValue(theme, color, 'pattern')} d={d} />
			<path
				fill={
					svgExport
						? `url(#${getChevronsPatternZoomName(1, theme.id)})`
						: teenyTiny
							? getColorValue(theme, color, 'semi')
							: `url(#${getChevronsPatternZoomName(zoomLevel, theme.id)})`
				}
				d={d}
			/>
		</>
	)
}

export function CrossesFill({ d, color, theme }: ShapeFillProps) {
	const editor = useEditor()
	const svgExport = useSvgExportContext()
	const zoomLevel = useValue('zoomLevel', () => editor.getEfficientZoomLevel(), [editor])
	const getCrossesPatternZoomName = useGetCrossesPatternZoomName()

	const teenyTiny = zoomLevel <= 0.18

	return (
		<>
			<path fill={getColorValue(theme, color, 'pattern')} d={d} />
			<path
				fill={
					svgExport
						? `url(#${getCrossesPatternZoomName(1, theme.id)})`
						: teenyTiny
							? getColorValue(theme, color, 'semi')
							: `url(#${getCrossesPatternZoomName(zoomLevel, theme.id)})`
				}
				d={d}
			/>
		</>
	)
}

export function LinedPatternFill({ d, color, theme }: ShapeFillProps) {
	const editor = useEditor()
	const svgExport = useSvgExportContext()
	const zoomLevel = useValue('zoomLevel', () => editor.getEfficientZoomLevel(), [editor])
	const getLinedPatternZoomName = useGetLinedPatternZoomName()

	const teenyTiny = zoomLevel <= 0.18

	return (
		<>
			<path fill={getColorValue(theme, color, 'linedFill')} d={d} />
			<path
				fill={
					svgExport
						? `url(#${getLinedPatternZoomName(1, theme.id)})`
						: teenyTiny
							? getColorValue(theme, color, 'fill')
							: `url(#${getLinedPatternZoomName(zoomLevel, theme.id)})`
				}
				d={d}
			/>
		</>
	)
}

export function LinedDenseDotsFill({ d, color, theme }: ShapeFillProps) {
	const editor = useEditor()
	const svgExport = useSvgExportContext()
	const zoomLevel = useValue('zoomLevel', () => editor.getEfficientZoomLevel(), [editor])
	const getLinedDenseDotsPatternZoomName = useGetLinedDenseDotsPatternZoomName()

	const teenyTiny = zoomLevel <= 0.18

	return (
		<>
			<path fill={getColorValue(theme, color, 'linedFill')} d={d} />
			<path
				fill={
					svgExport
						? `url(#${getLinedDenseDotsPatternZoomName(1, theme.id)})`
						: teenyTiny
							? getColorValue(theme, color, 'fill')
							: `url(#${getLinedDenseDotsPatternZoomName(zoomLevel, theme.id)})`
				}
				d={d}
			/>
		</>
	)
}

export function LinedChevronsFill({ d, color, theme }: ShapeFillProps) {
	const editor = useEditor()
	const svgExport = useSvgExportContext()
	const zoomLevel = useValue('zoomLevel', () => editor.getEfficientZoomLevel(), [editor])
	const getLinedChevronsPatternZoomName = useGetLinedChevronsPatternZoomName()

	const teenyTiny = zoomLevel <= 0.18

	return (
		<>
			<path fill={getColorValue(theme, color, 'linedFill')} d={d} />
			<path
				fill={
					svgExport
						? `url(#${getLinedChevronsPatternZoomName(1, theme.id)})`
						: teenyTiny
							? getColorValue(theme, color, 'fill')
							: `url(#${getLinedChevronsPatternZoomName(zoomLevel, theme.id)})`
				}
				d={d}
			/>
		</>
	)
}

export function LinedCrossesFill({ d, color, theme }: ShapeFillProps) {
	const editor = useEditor()
	const svgExport = useSvgExportContext()
	const zoomLevel = useValue('zoomLevel', () => editor.getEfficientZoomLevel(), [editor])
	const getLinedCrossesPatternZoomName = useGetLinedCrossesPatternZoomName()

	const teenyTiny = zoomLevel <= 0.18

	return (
		<>
			<path fill={getColorValue(theme, color, 'linedFill')} d={d} />
			<path
				fill={
					svgExport
						? `url(#${getLinedCrossesPatternZoomName(1, theme.id)})`
						: teenyTiny
							? getColorValue(theme, color, 'fill')
							: `url(#${getLinedCrossesPatternZoomName(zoomLevel, theme.id)})`
				}
				d={d}
			/>
		</>
	)
}

export function LinedDotsFill({ d, color, theme }: ShapeFillProps) {
	const editor = useEditor()
	const svgExport = useSvgExportContext()
	const zoomLevel = useValue('zoomLevel', () => editor.getEfficientZoomLevel(), [editor])
	const getLinedDotsPatternZoomName = useGetLinedDotsPatternZoomName()

	const teenyTiny = zoomLevel <= 0.18

	return (
		<>
			<path fill={getColorValue(theme, color, 'linedFill')} d={d} />
			<path
				fill={
					svgExport
						? `url(#${getLinedDotsPatternZoomName(1, theme.id)})`
						: teenyTiny
							? getColorValue(theme, color, 'fill')
							: `url(#${getLinedDotsPatternZoomName(zoomLevel, theme.id)})`
				}
				d={d}
			/>
		</>
	)
}

export function LinedSparseDotsFill({ d, color, theme }: ShapeFillProps) {
	const editor = useEditor()
	const svgExport = useSvgExportContext()
	const zoomLevel = useValue('zoomLevel', () => editor.getEfficientZoomLevel(), [editor])
	const getLinedSparseDotsPatternZoomName = useGetLinedSparseDotsPatternZoomName()

	const teenyTiny = zoomLevel <= 0.18

	return (
		<>
			<path fill={getColorValue(theme, color, 'linedFill')} d={d} />
			<path
				fill={
					svgExport
						? `url(#${getLinedSparseDotsPatternZoomName(1, theme.id)})`
						: teenyTiny
							? getColorValue(theme, color, 'fill')
							: `url(#${getLinedSparseDotsPatternZoomName(zoomLevel, theme.id)})`
				}
				d={d}
			/>
		</>
	)
}

export function LargeCheckFill({ d, color, theme }: ShapeFillProps) {
	const editor = useEditor()
	const svgExport = useSvgExportContext()
	const zoomLevel = useValue('zoomLevel', () => editor.getEfficientZoomLevel(), [editor])
	const getLargeCheckPatternZoomName = useGetLargeCheckPatternZoomName()

	const teenyTiny = zoomLevel <= 0.18

	return (
		<>
			<path fill={getColorValue(theme, color, 'pattern')} d={d} />
			<path
				fill={
					svgExport
						? `url(#${getLargeCheckPatternZoomName(1, theme.id)})`
						: teenyTiny
							? getColorValue(theme, color, 'semi')
							: `url(#${getLargeCheckPatternZoomName(zoomLevel, theme.id)})`
				}
				d={d}
			/>
		</>
	)
}

export function SmallCheckFill({ d, color, theme }: ShapeFillProps) {
	const editor = useEditor()
	const svgExport = useSvgExportContext()
	const zoomLevel = useValue('zoomLevel', () => editor.getEfficientZoomLevel(), [editor])
	const getSmallCheckPatternZoomName = useGetSmallCheckPatternZoomName()

	const teenyTiny = zoomLevel <= 0.18

	return (
		<>
			<path fill={getColorValue(theme, color, 'pattern')} d={d} />
			<path
				fill={
					svgExport
						? `url(#${getSmallCheckPatternZoomName(1, theme.id)})`
						: teenyTiny
							? getColorValue(theme, color, 'semi')
							: `url(#${getSmallCheckPatternZoomName(zoomLevel, theme.id)})`
				}
				d={d}
			/>
		</>
	)
}
