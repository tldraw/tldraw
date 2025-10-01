import { useCallback, useState } from 'react'
import { TldrawUiIcon, TldrawUiSlider, useValue } from 'tldraw'
import { DEFAULT_CONFIG } from './FluidManager'
import { fluidConfig } from './fluid-config'

export function ConfigPanel() {
	const [isExpanded, setIsExpanded] = useState(true)

	const handleReset = useCallback(() => {
		fluidConfig.set(DEFAULT_CONFIG)
	}, [])

	const toggleExpanded = useCallback(() => {
		setIsExpanded((expanded) => !expanded)
	}, [])

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
					<div className="shader-reset-container">
						<button onClick={handleReset} className="shader-reset-button">
							Reset to Defaults
						</button>
					</div>

					{/* General Settings */}
					<FloatSlider prop="quality" label="Quality" min={0} max={1} step={0.01} />
					<FloatSlider prop="velocityScale" label="Velocity Scale" min={0} max={1} step={0.001} />
					<IntSlider prop="boundsSampleCount" label="Bounds Sample Count" min={4} max={84} />
					<BooleanControl prop="paused" label="Paused" />
					<BooleanControl prop="transparent" label="Transparent Background" />

					{/* Simulation Settings */}
					<ResolutionSlider prop="simResolution" label="Simulation Resolution" min={32} max={512} />
					<ResolutionSlider prop="dyeResolution" label="Dye Resolution" min={256} max={2048} />
					<FloatSlider
						prop="densityDissipation"
						label="Density Dissipation"
						min={0}
						max={3}
						step={0.1}
					/>
					<FloatSlider
						prop="velocityDissipation"
						label="Velocity Dissipation"
						min={0}
						max={1}
						step={0.01}
					/>
					<FloatSlider prop="pressure" label="Pressure" min={0} max={2} step={0.1} />
					<IntSlider prop="pressureIterations" label="Pressure Iterations" min={1} max={40} />
					<IntSlider prop="curl" label="Curl (Vorticity)" min={0} max={100} />

					{/* Splat Settings */}
					<FloatSlider prop="splatRadius" label="Splat Radius" min={0.01} max={1} step={0.01} />
					<IntSlider prop="splatForce" label="Splat Force" min={1000} max={20000} />
					<BooleanControl prop="shading" label="Shading" />
					<BooleanControl prop="colorful" label="Colorful Mode" />
					<IntSlider prop="colorUpdateSpeed" label="Color Update Speed" min={1} max={50} />

					{/* Post-Processing */}
					<BooleanControl prop="bloom" label="Bloom Effect" />
					<IntSlider prop="bloomIterations" label="Bloom Iterations" min={1} max={20} />
					<IntSlider prop="bloomResolution" label="Bloom Resolution" min={64} max={512} />
					<FloatSlider prop="bloomIntensity" label="Bloom Intensity" min={0} max={2} step={0.1} />
					<FloatSlider prop="bloomThreshold" label="Bloom Threshold" min={0} max={1} step={0.1} />
					<FloatSlider prop="bloomSoftKnee" label="Bloom Soft Knee" min={0} max={1} step={0.1} />

					<BooleanControl prop="sunrays" label="Sunrays Effect" />
					<IntSlider prop="sunraysResolution" label="Sunrays Resolution" min={64} max={512} />
					<FloatSlider prop="sunraysWeight" label="Sunrays Weight" min={0} max={2} step={0.1} />
				</div>
			)}
		</div>
	)
}

function FloatSlider({
	prop,
	label,
	min,
	max,
	step = 0.01,
}: {
	prop: string
	label: string
	min: number
	max: number
	step?: number
}) {
	const value = useValue(prop, () => (fluidConfig.get() as any)[prop], [])
	const steps = Math.ceil((max - min) / step)

	return (
		<div className="shader-slider-container">
			<PanelLabel>{label}</PanelLabel>
			<TldrawUiSlider
				steps={steps}
				min={min}
				value={value ?? min}
				label={label}
				title={label}
				onValueChange={(value) => {
					fluidConfig.update((prev) => ({ ...prev, [prop]: value }))
				}}
			/>
		</div>
	)
}

function IntSlider({
	prop,
	label,
	min,
	max,
}: {
	prop: string
	label: string
	min: number
	max: number
}) {
	const value = useValue(prop, () => (fluidConfig.get() as any)[prop], [])

	return (
		<div className="shader-slider-container">
			<PanelLabel>{label}</PanelLabel>
			<TldrawUiSlider
				steps={max - min}
				min={min}
				value={value ?? min}
				label={label}
				title={label}
				onValueChange={(value) => {
					fluidConfig.update((prev) => ({ ...prev, [prop]: Math.round(value) }))
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
	prop: string
	label: string
	min: number
	max: number
}) {
	const value = useValue(prop, () => (fluidConfig.get() as any)[prop], [])
	const steps = Math.log2(max / min)

	return (
		<div className="shader-slider-container">
			<PanelLabel>{label}</PanelLabel>
			<TldrawUiSlider
				steps={steps}
				min={0}
				value={Math.log2((value ?? min) / min)}
				label={label}
				title={label}
				onValueChange={(logValue) => {
					const actualValue = min * Math.pow(2, logValue)
					fluidConfig.update((prev) => ({ ...prev, [prop]: Math.round(actualValue) }))
				}}
			/>
		</div>
	)
}

function BooleanControl({ prop, label }: { prop: string; label: string }) {
	const value = useValue(prop, () => (fluidConfig.get() as any)[prop], [])

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
