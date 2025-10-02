import { useCallback } from 'react'
import {
	TldrawUiButton,
	TldrawUiIcon,
	TldrawUiSlider,
	useLocalStorageState,
	useValue,
} from 'tldraw'
import { DEFAULT_CONFIG, FluidManagerConfig } from './FluidManager'
import { fluidConfig } from './fluid-config'

export function ConfigPanel() {
	const [isExpanded, setIsExpanded] = useLocalStorageState('shader-config-panel-expanded', true)

	const handleReset = useCallback(() => {
		fluidConfig.set(DEFAULT_CONFIG)
	}, [])

	const toggleExpanded = useCallback(() => {
		setIsExpanded((expanded) => !expanded)
	}, [setIsExpanded])

	return (
		<div
			className={`tlui-style-panel__wrapper tlui-style-panel shader-config-panel ${
				isExpanded ? 'shader-config-panel--expanded' : 'shader-config-panel--collapsed'
			}`}
			onWheelCapture={(e) => {
				e.stopPropagation()
			}}
		>
			{/* Header with collapse/expand button */}
			<div className="shader-config-header" onClick={toggleExpanded}>
				<span className="shader-config-title">Customize</span>
				<span
					className={`shader-config-chevron ${
						isExpanded ? 'shader-config-chevron--expanded' : 'shader-config-chevron--collapsed'
					}`}
				>
					<TldrawUiIcon icon="chevron-down" label="Expand / collapse" />
				</span>
			</div>

			{isExpanded && (
				<div className="shader-config-content">
					{/* Reset Button */}
					<TldrawUiButton type="menu" onClick={handleReset}>
						Reset to Defaults
					</TldrawUiButton>

					{/* General Settings */}
					<NormalizedValueSlider prop="quality" label="Quality" min={0} max={1} />
					<NormalizedValueSlider prop="velocityScale" label="Velocity Scale" min={0} max={0.1} />
					<NumberSlider prop="boundsSampleCount" label="Bounds Sample Count" min={4} max={100} />
					<BooleanControl prop="paused" label="Paused" />
					<BooleanControl prop="transparent" label="Transparent Background" />

					{/* Simulation Settings */}
					<ResolutionSlider prop="simResolution" label="Simulation Resolution" min={32} max={512} />
					<ResolutionSlider prop="dyeResolution" label="Dye Resolution" min={256} max={2048} />
					<NormalizedValueSlider
						prop="densityDissipation"
						label="Density Dissipation"
						min={0}
						max={4}
					/>
					<NormalizedValueSlider
						prop="velocityDissipation"
						label="Velocity Dissipation"
						min={0}
						max={1}
					/>
					<NormalizedValueSlider prop="pressure" label="Pressure" min={0} max={2} />
					<NumberSlider prop="pressureIterations" label="Pressure Iterations" min={1} max={60} />
					<NumberSlider prop="curl" label="Curl (Vorticity)" min={0} max={100} />

					{/* Splat Settings */}
					<NormalizedValueSlider prop="splatRadius" label="Splat Radius" min={0.01} max={1} />
					<NumberSlider prop="splatForce" label="Splat Force" min={1000} max={20000} />
					<BooleanControl prop="shading" label="Shading" />
					<BooleanControl prop="colorful" label="Colorful Mode" />
					<NumberSlider prop="colorUpdateSpeed" label="Color Update Speed" min={1} max={50} />

					{/* Post-Processing */}
					<BooleanControl prop="bloom" label="Bloom Effect" />
					<NumberSlider prop="bloomIterations" label="Bloom Iterations" min={1} max={20} />
					<NumberSlider prop="bloomResolution" label="Bloom Resolution" min={64} max={512} />
					<NormalizedValueSlider prop="bloomIntensity" label="Bloom Intensity" min={0} max={2} />
					<NormalizedValueSlider prop="bloomThreshold" label="Bloom Threshold" min={0} max={1} />
					<NormalizedValueSlider prop="bloomSoftKnee" label="Bloom Soft Knee" min={0} max={1} />

					<BooleanControl prop="sunrays" label="Sunrays Effect" />
					<NumberSlider prop="sunraysResolution" label="Sunrays Resolution" min={64} max={512} />
					<NormalizedValueSlider prop="sunraysWeight" label="Sunrays Weight" min={0} max={2} />
				</div>
			)}
		</div>
	)
}

// Extract keys from FluidManagerConfig where the value type matches T
type KeyForType<U, T> = {
	[K in keyof U]: U[K] extends T ? K : never
}[keyof U]

function NormalizedValueSlider({
	prop,
	label,
	min,
	max,
}: {
	prop: KeyForType<FluidManagerConfig, number>
	label: string
	min: number
	max: number
}) {
	const actualValue = useValue(prop, () => fluidConfig.get()[prop], [])
	// Map actual value (min to max) to slider value (1 to 10)
	const sliderValue = actualValue != null ? 1 + ((actualValue - min) / (max - min)) * 9 : 1

	return (
		<div className="shader-slider-container">
			<PanelLabel>{label}</PanelLabel>
			<TldrawUiSlider
				steps={10}
				min={1}
				value={sliderValue}
				label={label}
				title={label}
				onValueChange={(sliderValue) => {
					// Map slider value (1 to 10) back to actual value (min to max)
					const actualValue = min + ((sliderValue - 1) / 9) * (max - min)
					fluidConfig.update((prev) => ({ ...prev, [prop]: actualValue }))
				}}
			/>
		</div>
	)
}

function NumberSlider({
	prop,
	label,
	min,
	max,
}: {
	prop: KeyForType<FluidManagerConfig, number>
	label: string
	min: number
	max: number
}) {
	const actualValue = useValue(prop, () => fluidConfig.get()[prop], [])
	// Map actual value (min to max) to slider value (1 to 10)
	const sliderValue = actualValue != null ? 1 + ((actualValue - min) / (max - min)) * 9 : 1

	return (
		<div className="shader-slider-container">
			<PanelLabel>{label}</PanelLabel>
			<TldrawUiSlider
				steps={10}
				min={1}
				value={sliderValue}
				label={label}
				title={label}
				onValueChange={(sliderValue) => {
					// Map slider value (1 to 10) back to actual value (min to max)
					const actualValue = min + ((sliderValue - 1) / 9) * (max - min)
					fluidConfig.update((prev) => ({ ...prev, [prop]: Math.round(actualValue) }))
				}}
			/>
		</div>
	)
}

function ResolutionSlider({
	prop,
	label,
	min,
	max,
}: {
	prop: KeyForType<FluidManagerConfig, number>
	label: string
	min: number
	max: number
}) {
	const actualValue = useValue(prop, () => fluidConfig.get()[prop], [])
	// Use logarithmic scale for resolution values
	const logMin = Math.log2(min)
	const logMax = Math.log2(max)
	const logValue = actualValue != null ? Math.log2(actualValue) : logMin
	// Map log value to slider value (1 to 10)
	const sliderValue = 1 + ((logValue - logMin) / (logMax - logMin)) * 9

	return (
		<div className="shader-slider-container">
			<PanelLabel>{label}</PanelLabel>
			<TldrawUiSlider
				steps={10}
				min={1}
				value={sliderValue}
				label={label}
				title={label}
				onValueChange={(sliderValue) => {
					// Map slider value (1 to 10) back to log value, then to actual value
					const logValue = logMin + ((sliderValue - 1) / 9) * (logMax - logMin)
					const actualValue = Math.pow(2, logValue)
					fluidConfig.update((prev) => ({ ...prev, [prop]: Math.round(actualValue) }))
				}}
			/>
		</div>
	)
}

function BooleanControl({
	prop,
	label,
}: {
	prop: KeyForType<FluidManagerConfig, boolean>
	label: string
}) {
	const value = useValue(prop, () => fluidConfig.get()[prop], [])

	return (
		<label className="shader-boolean-control">
			{label}
			<input
				type="checkbox"
				checked={value ?? false}
				onChange={(e) => {
					fluidConfig.update((prev) => ({ ...prev, [prop]: e.target.checked }))
				}}
				className="shader-boolean-input"
			/>
		</label>
	)
}

function PanelLabel({ children }: { children: React.ReactNode }) {
	return <div className="shader-panel-label">{children}</div>
}
