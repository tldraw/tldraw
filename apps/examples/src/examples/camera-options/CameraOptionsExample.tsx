import { useEffect } from 'react'
import { TLCameraOptions, Tldraw, clamp, track, useEditor, useLocalStorageState } from 'tldraw'
import 'tldraw/tldraw.css'

const CAMERA_OPTIONS: TLCameraOptions = {
	constraints: {
		fit: 'max',
		bounds: {
			x: 0,
			y: 0,
			w: 1200,
			h: 800,
		},
		fitX: 'contain',
		fitY: 'contain',
		padding: { x: 100, y: 100 },
		origin: { x: 0.5, y: 0.5 },
	},
	panSpeed: 1,
	zoomSteps: [0.1, 0.5, 0.75, 1, 1.5, 2, 4, 8],
	zoomMax: 8,
	zoomMin: 0.1,
	zoomSpeed: 1,
	isLocked: false,
}

export default function CameraOptionsExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				// persistenceKey="camera-options"
				components={components}
			>
				<CameraOptionsControlPanel />
			</Tldraw>
		</div>
	)
}

const PaddingDisplay = track(() => {
	const editor = useEditor()
	const cameraOptions = editor.getCameraOptions()

	if (!cameraOptions.constraints) return null

	const {
		constraints: {
			padding: { x: px, y: py },
		},
	} = cameraOptions

	return (
		<div
			style={{
				position: 'absolute',
				top: py,
				left: px,
				width: `calc(100% - ${px * 2}px)`,
				height: `calc(100% - ${py * 2}px)`,
				border: '1px dotted var(--color-text)',
			}}
		/>
	)
})

const BoundsDisplay = track(() => {
	const editor = useEditor()
	const cameraOptions = editor.getCameraOptions()

	if (!cameraOptions.constraints) return null

	const {
		constraints: {
			bounds: { x, y, w, h },
		},
	} = cameraOptions

	return (
		<>
			<div
				style={{
					position: 'absolute',
					top: y,
					left: x,
					width: w,
					height: h,
					// grey and white stripes
					border: '1px dashed var(--color-text)',
					backgroundImage: `
				linear-gradient(45deg, #AAAAAA44 25%, transparent 25%),
				linear-gradient(-45deg, #AAAAAA44 25%, transparent 25%),
				linear-gradient(45deg, transparent 75%, #AAAAAA44 75%),
				linear-gradient(-45deg, transparent 75%, #AAAAAA44 75%)`,
					backgroundSize: '200px 200px',
					backgroundPosition: '0 0, 0 100px, 100px -100px, -100px 0px',
				}}
			/>
		</>
	)
})

const components = {
	// These components are just included for debugging / visualization!
	OnTheCanvas: BoundsDisplay,
	InFrontOfTheCanvas: PaddingDisplay,
}

const CameraOptionsControlPanel = track(() => {
	const editor = useEditor()

	const [cameraOptions, setCameraOptions] = useLocalStorageState('camera ex', CAMERA_OPTIONS)

	useEffect(() => {
		if (!editor) return
		editor.setCameraOptions(cameraOptions, { immediate: true })
	}, [editor, cameraOptions])

	const { constraints } = cameraOptions

	const updateOptions = (
		options: Partial<
			Omit<TLCameraOptions, 'constraints'> & {
				constraints: Partial<TLCameraOptions['constraints']>
			}
		>
	) => {
		const cameraOptions = editor.getCameraOptions()
		setCameraOptions({
			...cameraOptions,
			...options,
			constraints: options.constraints
				? {
						...cameraOptions.constraints!,
						...options.constraints,
					}
				: undefined,
		})
	}

	return (
		<div
			style={{
				pointerEvents: 'all',
				position: 'absolute',
				top: 50,
				left: 0,
				padding: 4,
				background: 'white',
				zIndex: 1000000,
			}}
		>
			{constraints ? (
				<>
					<div
						style={{
							display: 'grid',
							gridTemplateColumns: 'auto 1fr',
							columnGap: 12,
							rowGap: 4,
							marginBottom: 12,
							alignItems: 'center',
							justifyContent: 'center',
						}}
					>
						<label htmlFor="fit">Fit</label>
						<select
							name="fit"
							value={constraints.fit}
							onChange={(e) => {
								updateOptions({
									constraints: {
										...constraints,
										fit: e.target.value as any,
									},
								})
							}}
						>
							<option>min</option>
							<option>max</option>
							<option> x</option>
							<option> y</option>
							<option>none</option>
						</select>
						<label htmlFor="originX">Origin X</label>
						<input
							name="originX"
							type="number"
							step={0.1}
							value={constraints.origin.x}
							onChange={(e) => {
								const val = clamp(Number(e.target.value), 0, 1)
								updateOptions({
									constraints: {
										origin: {
											...constraints.origin,
											x: val,
										},
									},
								})
							}}
						/>
						<label htmlFor="originY">Origin Y</label>
						<input
							name="originY"
							type="number"
							step={0.1}
							value={constraints.origin.y}
							onChange={(e) => {
								const val = clamp(Number(e.target.value), 0, 1)
								updateOptions({
									constraints: {
										...constraints,
										origin: {
											...constraints.origin,
											y: val,
										},
									},
								})
							}}
						/>
						<label htmlFor="paddingX">Padding X</label>
						<input
							name="paddingX"
							type="number"
							step={10}
							value={constraints.padding.x}
							onChange={(e) => {
								const val = clamp(Number(e.target.value), 0)
								updateOptions({
									constraints: {
										...constraints,
										padding: {
											...constraints.padding,
											x: val,
										},
									},
								})
							}}
						/>
						<label htmlFor="paddingY">Padding Y</label>
						<input
							name="paddingY"
							type="number"
							step={10}
							value={constraints.padding.y}
							onChange={(e) => {
								const val = clamp(Number(e.target.value), 0)
								updateOptions({
									constraints: {
										padding: {
											...constraints.padding,
											y: val,
										},
									},
								})
							}}
						/>
						<label htmlFor="fitx">Fit X</label>
						<select
							name="fitx"
							value={constraints.fitX}
							onChange={(e) => {
								setCameraOptions({
									...cameraOptions,
									constraints: {
										...constraints,
										fitX: e.target.value as any,
									},
								})
							}}
						>
							<option>contain</option>
							<option>inside</option>
							<option>outside</option>
							<option>lock</option>
						</select>
						<label htmlFor="fity">Fit Y</label>
						<select
							name="fity"
							value={constraints.fitY}
							onChange={(e) => {
								setCameraOptions({
									...cameraOptions,
									constraints: {
										...constraints,
										fitY: e.target.value as any,
									},
								})
							}}
						>
							<option>contain</option>
							<option>inside</option>
							<option>outside</option>
							<option>lock</option>
						</select>
					</div>
				</>
			) : null}
			<button
				onClick={() => {
					setCameraOptions(CAMERA_OPTIONS)
				}}
			>
				Reset Camera Options
			</button>
		</div>
	)
})
