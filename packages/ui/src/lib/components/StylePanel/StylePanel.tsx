import {
	Editor,
	TLFrameShape,
	TLNullableShapeProps,
	TLShape,
	TLStyleItem,
	useEditor,
	useReactor,
} from '@tldraw/editor'
import {
	ChangeEvent,
	FocusEvent,
	KeyboardEvent,
	ReactEventHandler,
	memo,
	useCallback,
	useState,
} from 'react'

import { minBy } from '@tldraw/utils'
import { useValue } from 'signia-react'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { Button } from '../primitives/Button'
import { ButtonPicker } from '../primitives/ButtonPicker'
import { Icon } from '../primitives/Icon'
import { Slider } from '../primitives/Slider'
import { DoubleDropdownPicker } from './DoubleDropdownPicker'
import { DropdownPicker } from './DropdownPicker'

interface StylePanelProps {
	isMobile?: boolean
}

/** @internal */
export const StylePanel = function StylePanel({ isMobile }: StylePanelProps) {
	const editor = useEditor()

	const props = useValue('props', () => editor.props, [editor])
	const opacity = useValue('opacity', () => editor.opacity, [editor])
	const toolShapeType = useValue('toolShapeType', () => editor.root.current.value?.shapeType, [
		editor,
	])

	const handlePointerOut = useCallback(() => {
		if (!isMobile) {
			editor.isChangingStyle = false
		}
	}, [editor, isMobile])

	if (!props && !toolShapeType) return null

	const { geo, arrowheadEnd, arrowheadStart, spline, font } = props ?? {}

	const hideGeo = geo === undefined
	const hideArrowHeads = arrowheadEnd === undefined && arrowheadStart === undefined
	const hideSpline = spline === undefined
	const hideText = font === undefined

	return (
		<div className="tlui-style-panel" data-ismobile={isMobile} onPointerLeave={handlePointerOut}>
			<CommonStylePickerSet props={props ?? {}} opacity={opacity} />
			{!hideText && <TextStylePickerSet props={props ?? {}} />}
			{!(hideGeo && hideArrowHeads && hideSpline) && (
				<div className="tlui-style-panel__section" aria-label="style panel styles">
					<GeoStylePickerSet props={props ?? {}} />
					<ArrowheadStylePickerSet props={props ?? {}} />
					<SplineStylePickerSet props={props ?? {}} />
				</div>
			)}
			<FrameShapePropsPicker />
		</div>
	)
}

const { styles } = Editor

function useStyleChangeCallback() {
	const editor = useEditor()

	return useCallback(
		(item: TLStyleItem, squashing: boolean) => {
			editor.batch(() => {
				editor.setProp(item.type, item.id, false, squashing)
				editor.isChangingStyle = true
			})
		},
		[editor]
	)
}

const tldrawSupportedOpacities = [0.1, 0.25, 0.5, 0.75, 1] as const

function CommonStylePickerSet({
	props,
	opacity,
}: {
	props: TLNullableShapeProps
	opacity: number | null
}) {
	const editor = useEditor()
	const msg = useTranslation()

	const handleValueChange = useStyleChangeCallback()

	const handleOpacityValueChange = useCallback(
		(value: number, ephemeral: boolean) => {
			const item = tldrawSupportedOpacities[value]
			editor.setOpacity(item, ephemeral)
			editor.isChangingStyle = true
		},
		[editor]
	)

	const { color, fill, dash, size } = props

	const showPickers = fill !== undefined || dash !== undefined || size !== undefined

	const opacityIndex =
		opacity === null
			? -1
			: tldrawSupportedOpacities.indexOf(
					minBy(tldrawSupportedOpacities, (supportedOpacity) =>
						Math.abs(supportedOpacity - opacity)
					)!
			  )

	return (
		<>
			<div className="tlui-style-panel__section__common" aria-label="style panel styles">
				{color === undefined ? null : (
					<ButtonPicker
						title={msg('style-panel.color')}
						styleType="color"
						data-testid="style.color"
						items={styles.color}
						value={color}
						onValueChange={handleValueChange}
					/>
				)}
				{opacity === undefined ? null : (
					<Slider
						data-testid="style.opacity"
						value={opacityIndex >= 0 ? opacityIndex : tldrawSupportedOpacities.length - 1}
						label={opacity ? `opacity-style.${opacity}` : 'style-panel.mixed'}
						onValueChange={handleOpacityValueChange}
						steps={tldrawSupportedOpacities.length - 1}
						title={msg('style-panel.opacity')}
					/>
				)}
			</div>
			{showPickers && (
				<div className="tlui-style-panel__section" aria-label="style panel styles">
					{fill === undefined ? null : (
						<ButtonPicker
							title={msg('style-panel.fill')}
							styleType="fill"
							data-testid="style.fill"
							items={styles.fill}
							value={fill}
							onValueChange={handleValueChange}
						/>
					)}
					{dash === undefined ? null : (
						<ButtonPicker
							title={msg('style-panel.dash')}
							styleType="dash"
							data-testid="style.dash"
							items={styles.dash}
							value={dash}
							onValueChange={handleValueChange}
						/>
					)}
					{size === undefined ? null : (
						<ButtonPicker
							title={msg('style-panel.size')}
							styleType="size"
							data-testid="style.size"
							items={styles.size}
							value={size}
							onValueChange={handleValueChange}
						/>
					)}
				</div>
			)}
		</>
	)
}

function TextStylePickerSet({ props }: { props: TLNullableShapeProps }) {
	const msg = useTranslation()
	const handleValueChange = useStyleChangeCallback()

	const { font, align, verticalAlign } = props
	if (font === undefined && align === undefined) {
		return null
	}

	return (
		<div className="tlui-style-panel__section" aria-label="style panel text">
			{font === undefined ? null : (
				<ButtonPicker
					title={msg('style-panel.font')}
					styleType="font"
					data-testid="font"
					items={styles.font}
					value={font}
					onValueChange={handleValueChange}
				/>
			)}

			{align === undefined ? null : (
				<div className="tlui-style-panel__row">
					<ButtonPicker
						title={msg('style-panel.align')}
						styleType="align"
						data-testid="align"
						items={styles.align}
						value={align}
						onValueChange={handleValueChange}
					/>
					{verticalAlign === undefined ? (
						<Button
							title={msg('style-panel.vertical-align')}
							data-testid="vertical-align"
							icon="vertical-align-center"
							disabled
						/>
					) : (
						<DropdownPicker
							id="geo-vertical-alignment"
							styleType="verticalAlign"
							data-testid="style-panel.geo-vertical-align"
							items={styles.verticalAlign}
							value={verticalAlign}
							onValueChange={handleValueChange}
						/>
					)}
				</div>
			)}
		</div>
	)
}

function GeoStylePickerSet({ props }: { props: TLNullableShapeProps }) {
	const handleValueChange = useStyleChangeCallback()

	const { geo } = props
	if (geo === undefined) {
		return null
	}

	return (
		<DropdownPicker
			id="geo"
			label={'style-panel.geo'}
			styleType="geo"
			data-testid="style-panel.geo"
			items={styles.geo}
			value={geo}
			onValueChange={handleValueChange}
		/>
	)
}

function SplineStylePickerSet({ props }: { props: TLNullableShapeProps }) {
	const handleValueChange = useStyleChangeCallback()

	const { spline } = props
	if (spline === undefined) {
		return null
	}

	return (
		<DropdownPicker
			id="spline"
			label={'style-panel.spline'}
			styleType="spline"
			data-testid="style.spline"
			items={styles.spline}
			value={spline}
			onValueChange={handleValueChange}
		/>
	)
}

function ArrowheadStylePickerSet({ props }: { props: TLNullableShapeProps }) {
	const handleValueChange = useStyleChangeCallback()

	const { arrowheadEnd, arrowheadStart } = props
	if (arrowheadEnd === undefined && arrowheadStart === undefined) {
		return null
	}

	return (
		<DoubleDropdownPicker
			label={'style-panel.arrowheads'}
			styleTypeA="arrowheadStart"
			data-testid="style.arrowheads"
			itemsA={styles.arrowheadStart}
			valueA={arrowheadStart}
			styleTypeB="arrowheadEnd"
			itemsB={styles.arrowheadEnd}
			valueB={arrowheadEnd}
			onValueChange={handleValueChange}
			labelA="style-panel.arrowhead-start"
			labelB="style-panel.arrowhead-end"
		/>
	)
}

const FrameShapePropsPicker = memo(function FrameShapePropsPicker() {
	const editor = useEditor()

	const [currentValue, setCurrentValue] = useState<null | {
		w: number | 'mixed'
		h: number | 'mixed'
	}>(() => ({ w: 'mixed', h: 'mixed' }))

	useReactor(
		'wh',
		() => {
			const wh = getWh(editor.selectedShapes)
			setCurrentValue((v) => (v === wh ? v : wh))
		},
		[editor]
	)

	const handlePresetSelect = useCallback<ReactEventHandler<HTMLSelectElement>>(
		(e) => {
			const item = ALL_PRESETS.find((item) => item.id === e.currentTarget.value)
			if (!item) {
				console.error(`Could not find a preset for ${e.currentTarget.value}`)
				return
			}

			const { selectedShapes } = editor
			if (!selectedShapes.every((shape) => shape.type === 'frame')) return

			editor.updateShapes([
				...selectedShapes.map((shape) => ({
					id: shape.id,
					type: shape.type,
					props: { w: item.width, h: item.height },
				})),
			])
		},
		[editor]
	)

	const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
		const {
			value,
			dataset: { prop },
		} = e.currentTarget
		if (!value) return
		if (!prop) return
		setCurrentValue((wh) => ({ ...wh!, [prop]: +(+value).toFixed() }))
	}, [])

	const handleFocus = useCallback(() => {
		// noop
	}, [])

	const handleBlur = useCallback(
		(e: FocusEvent<HTMLInputElement>) => {
			const { prop } = e.currentTarget.dataset

			if (!prop) return

			const { selectedShapes } = editor
			if (!selectedShapes.every((shape) => shape.type === 'frame')) return

			editor.updateShapes([
				...selectedShapes.map((shape) => ({
					id: shape.id,
					type: shape.type,
					props: { [prop as string]: +Math.max(1, +e.currentTarget.value).toFixed() },
				})),
			])
		},
		[editor]
	)

	const handleKeyDown = useCallback(
		(e: KeyboardEvent<HTMLInputElement>) => {
			if (e.key !== 'Enter') return

			const { prop } = e.currentTarget.dataset
			if (!prop) return

			const { selectedShapes } = editor
			if (!selectedShapes.every((shape) => shape.type === 'frame')) return

			editor.updateShapes([
				...selectedShapes.map((shape) => ({
					id: shape.id,
					type: shape.type,
					props: { [prop as string]: +Math.max(1, +e.currentTarget.value).toFixed() },
				})),
			])
		},
		[editor]
	)

	if (!currentValue) return null

	const { w, h } = currentValue

	const selectedPresetItem = ALL_PRESETS.find(
		(item) => item.type === 'size' && item.width === w && item.height === h
	)

	return (
		<div>
			<div className="tlui-size-pickers">
				<label className="tlui-size-pickers__label">Size</label>
				<div className="tlui-size-picker">
					<input
						className="tlui-input tlui-size-picker__input"
						type="number"
						data-prop="w"
						value={w === 'mixed' ? '' : (w as number).toFixed()}
						placeholder={w === 'mixed' ? 'Mixed' : undefined}
						onChange={handleChange}
						onBlur={handleBlur}
						onFocus={handleFocus}
						onKeyDown={handleKeyDown}
					/>
					<span className="tlui-size-picker__label">W</span>
				</div>
				<div className="tlui-size-picker">
					<input
						className="tlui-input tlui-size-picker__input"
						type="number"
						data-prop="h"
						value={h === 'mixed' ? '' : (h as number).toFixed()}
						placeholder={h === 'mixed' ? 'Mixed' : undefined}
						onChange={handleChange}
						onBlur={handleBlur}
						onFocus={handleFocus}
						onKeyDown={handleKeyDown}
					/>
					<span className="tlui-size-picker__label">H</span>
				</div>
			</div>
			<div className="tlui-size-preset-picker">
				<select
					className="tlui-button tlui-size-preset-picker__select"
					value={selectedPresetItem?.id ?? 'CUSTOM'}
					onChange={handlePresetSelect}
				>
					{selectedPresetItem ? null : (
						<option disabled value="CUSTOM">
							Custom
						</option>
					)}
					{SIZE_PRESETS.map((item, i) => (
						<SizePresetItem key={i} item={item} />
					))}
				</select>
				<Icon className="tlui-size-preset-picker__icon" icon="chevron-down" small />
			</div>
		</div>
	)
})

function SizePresetItem({ item }: { item: SizePresetItem }) {
	switch (item.type) {
		case 'group': {
			return (
				<optgroup label={item.label}>
					{item.children.map((child, i) => (
						<SizePresetItem key={i} item={child} />
					))}
				</optgroup>
			)
		}
		case 'size': {
			return <option value={item.id}>{item.label}</option>
		}
	}
}

type SizePresetItem =
	| {
			type: 'group'
			label: string
			children: SizePresetItem[]
	  }
	| {
			type: 'size'
			id: string
			label: string
			width: number
			height: number
	  }

const SLIDES_PRESETS: Extract<SizePresetItem, { type: 'size' }>[] = [
	{
		type: 'size',
		id: 'slide-16-9',
		label: 'Slide 16:9',
		width: 1920,
		height: 1080,
	},
	{
		type: 'size',
		id: 'slide-4-3',
		label: 'Slide 4:3',
		width: 1024,
		height: 1064,
	},
]

const SOCIAL_MEDIA_PRESETS: Extract<SizePresetItem, { type: 'size' }>[] = [
	{
		id: 'social-media-twitter-post',
		type: 'size',
		label: 'Twitter post',
		width: 1200,
		height: 675,
	},
	{
		id: 'social-media-twitter-header',
		type: 'size',
		label: 'Facebook post',
		width: 1200,
		height: 630,
	},
	{
		id: 'social-media-instagram-post',
		type: 'size',
		label: 'Instagram post',
		width: 1080,
		height: 1080,
	},
]

const PAGES_PRESETS: Extract<SizePresetItem, { type: 'size' }>[] = [
	{
		id: 'page-a4',
		type: 'size',
		label: 'A4',
		width: 595 * 2,
		height: 842 * 2,
	},
	{
		id: 'page-letter',
		type: 'size',
		label: 'Letter',
		width: 612 * 2,
		height: 792 * 2,
	},
]

const ALL_PRESETS: Extract<SizePresetItem, { type: 'size' }>[] = [
	...SLIDES_PRESETS,
	...PAGES_PRESETS,
	...SOCIAL_MEDIA_PRESETS,
]

const SIZE_PRESETS: SizePresetItem[] = [
	{
		type: 'group',
		label: 'Slides',
		children: SLIDES_PRESETS,
	},
	{
		type: 'group',
		label: 'Pages',
		children: PAGES_PRESETS,
	},
	{
		type: 'group',
		label: 'Social media',
		children: SOCIAL_MEDIA_PRESETS,
	},
]

function getWh(shapes: TLShape[]) {
	if (shapes.length === 0) return null

	let w = -1 as number | 'mixed'
	let h = -1 as number | 'mixed'

	for (let i = 0; i < shapes.length; i++) {
		const shape = shapes[i] as TLFrameShape
		if (shape.type !== 'frame') return null

		if (w !== 'mixed') {
			if (w === -1) {
				w = shape.props.w
			} else if (w !== shape.props.w) {
				w = 'mixed'
			}
		}

		if (h !== 'mixed') {
			if (h === -1) {
				h = shape.props.h
			} else if (h !== shape.props.h) {
				h = 'mixed'
			}
		}
	}

	return { w, h }
}
