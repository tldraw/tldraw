import { useEffect } from 'react'
import {
	BoxModel,
	TLCameraOptions,
	Tldraw,
	Vec,
	clamp,
	track,
	useEditor,
	useLocalStorageState,
} from 'tldraw'
import 'tldraw/tldraw.css'

const CAMERA_OPTIONS: TLCameraOptions = {
	isLocked: false,
	wheelBehavior: 'pan',
	panSpeed: 1,
	zoomSpeed: 1,
	zoomSteps: [0.1, 0.25, 0.5, 1, 2, 4, 8],
	constraints: {
		initialZoom: 'fit-max',
		baseZoom: 'fit-max',
		bounds: {
			x: 0,
			y: 0,
			w: 1600,
			h: 900,
		},
		behavior: { x: 'contain', y: 'contain' },
		padding: { x: 100, y: 100 },
		origin: { x: 0.5, y: 0.5 },
	},
}

const BOUNDS_SIZES: Record<string, BoxModel> = {
	a4: { x: 0, y: 0, w: 1050, h: 1485 },
	landscape: { x: 0, y: 0, w: 1600, h: 900 },
	portrait: { x: 0, y: 0, w: 900, h: 1600 },
	square: { x: 0, y: 0, w: 900, h: 900 },
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

	const d = Vec.ToAngle({ x: w, y: h }) * (180 / Math.PI)
	const colB = '#00000002'
	const colA = '#0000001F'

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
			
				`,
					backgroundSize: '200px 200px',
					backgroundPosition: '0 0, 0 100px, 100px -100px, -100px 0px',
				}}
			>
				<div
					style={{
						position: 'absolute',
						top: 0,
						left: 0,
						width: '100%',
						height: '100%',
						backgroundImage: `
						linear-gradient(0deg, ${colB} 0%, ${colA} 50%, ${colB} 50%, ${colA} 100%),
						linear-gradient(90deg, ${colB} 0%, ${colA} 50%, ${colB} 50%, ${colA} 100%),
						linear-gradient(${d}deg, ${colB} 0%, ${colA} 50%, ${colB} 50%, ${colA} 100%),
						linear-gradient(-${d}deg, ${colB} 0%, ${colA} 50%, ${colB} 50%, ${colA} 100%)`,
					}}
				></div>
			</div>
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

	const [cameraOptions, setCameraOptions] = useLocalStorageState('camera ex1', CAMERA_OPTIONS)

	useEffect(() => {
		if (!editor) return
		editor.batch(() => {
			editor.setCameraOptions(cameraOptions)
			editor.setCamera(editor.getCamera(), {
				immediate: true,
			})
		})
	}, [editor, cameraOptions])

	const { constraints } = cameraOptions

	const updateOptions = (
		options: Partial<
			Omit<TLCameraOptions, 'constraints'> & {
				constraints: Partial<TLCameraOptions['constraints']>
			}
		>
	) => {
		const { constraints } = options
		const cameraOptions = editor.getCameraOptions()
		setCameraOptions({
			...cameraOptions,
			...options,
			constraints:
				constraints === undefined
					? cameraOptions.constraints
					: {
							...(cameraOptions.constraints! ?? CAMERA_OPTIONS.constraints),
							...constraints,
						},
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
				<label htmlFor="lock">Lock</label>
				<select
					name="lock"
					value={cameraOptions.isLocked ? 'true' : 'false'}
					onChange={(e) => {
						const value = e.target.value
						updateOptions({
							...CAMERA_OPTIONS,
							isLocked: value === 'true',
						})
					}}
				>
					<option value="true">true</option>
					<option value="false">false</option>
				</select>
				<label htmlFor="wheelBehavior">Wheel behavior</label>
				<select
					name="wheelBehavior"
					value={cameraOptions.wheelBehavior}
					onChange={(e) => {
						const value = e.target.value
						updateOptions({
							...CAMERA_OPTIONS,
							wheelBehavior: value as 'zoom' | 'pan',
						})
					}}
				>
					<option>zoom</option>
					<option>pan</option>
				</select>
				<label htmlFor="panspeed">Pan Speed</label>
				<input
					name="panspeed"
					type="number"
					step={0.1}
					value={cameraOptions.panSpeed}
					onChange={(e) => {
						const val = clamp(Number(e.target.value), 0, 2)
						updateOptions({ panSpeed: val })
					}}
				/>
				<label htmlFor="zoomspeed">Zoom Speed</label>
				<input
					name="zoomspeed"
					type="number"
					step={0.1}
					value={cameraOptions.zoomSpeed}
					onChange={(e) => {
						const val = clamp(Number(e.target.value), 0, 2)
						updateOptions({ zoomSpeed: val })
					}}
				/>
				<label htmlFor="zoomsteps">Zoom Steps</label>
				<input
					name="zoomsteps"
					type="text"
					defaultValue={cameraOptions.zoomSteps.join(', ')}
					onChange={(e) => {
						try {
							const val = e.target.value.split(', ').map((v) => Number(v))
							if (val.every((v) => typeof v === 'number' && Number.isFinite(v))) {
								updateOptions({ zoomSteps: val })
							}
						} catch (e) {
							// ignore
						}
					}}
				/>
				<label htmlFor="bounds">Bounds</label>
				<select
					name="bounds"
					value={
						Object.entries(BOUNDS_SIZES).find(([_, b]) => b.w === constraints?.bounds.w)?.[0] ??
						'none'
					}
					onChange={(e) => {
						const currentConstraints = constraints ?? CAMERA_OPTIONS.constraints
						const value = e.target.value

						if (value === 'none') {
							updateOptions({
								...CAMERA_OPTIONS,
								constraints: undefined,
							})
							return
						}

						updateOptions({
							...CAMERA_OPTIONS,
							constraints: {
								...currentConstraints,
								bounds: BOUNDS_SIZES[value] ?? BOUNDS_SIZES.a4,
							},
						})
					}}
				>
					<option value="none">none</option>
					<option value="a4">A4 Page</option>
					<option value="portrait">Portait</option>
					<option value="landscape">Landscape</option>
					<option value="square">Square</option>
				</select>
				{constraints ? (
					<>
						<label htmlFor="initialZoom">Initial Zoom</label>
						<select
							name="initialZoom"
							value={constraints.initialZoom}
							onChange={(e) => {
								updateOptions({
									constraints: {
										...constraints,
										initialZoom: e.target.value as any,
									},
								})
							}}
						>
							<option>fit-min</option>
							<option>fit-max</option>
							<option>fit-x</option>
							<option>fit-y</option>
							<option>fit-min-100</option>
							<option>fit-max-100</option>
							<option>fit-x-100</option>
							<option>fit-y-100</option>
							<option>default</option>
						</select>
						<label htmlFor="zoomBehavior">Base Zoom</label>
						<select
							name="zoomBehavior"
							value={constraints.baseZoom}
							onChange={(e) => {
								updateOptions({
									constraints: {
										...constraints,
										baseZoom: e.target.value as any,
									},
								})
							}}
						>
							<option>fit-min</option>
							<option>fit-max</option>
							<option>fit-x</option>
							<option>fit-y</option>
							<option>fit-min-100</option>
							<option>fit-max-100</option>
							<option>fit-x-100</option>
							<option>fit-y-100</option>
							<option>default</option>
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
						<label htmlFor="behaviorX">Behavior X</label>
						<select
							name="behaviorX"
							value={(constraints.behavior as { x: any; y: any }).x}
							onChange={(e) => {
								setCameraOptions({
									...cameraOptions,
									constraints: {
										...constraints,
										behavior: {
											...(constraints.behavior as { x: any; y: any }),
											x: e.target.value as any,
										},
									},
								})
							}}
						>
							<option>free</option>
							<option>contain</option>
							<option>inside</option>
							<option>outside</option>
							<option>fixed</option>
						</select>
						<label htmlFor="behaviorY">Behavior Y</label>
						<select
							name="behaviorY"
							value={(constraints.behavior as { x: any; y: any }).y}
							onChange={(e) => {
								setCameraOptions({
									...cameraOptions,
									constraints: {
										...constraints,
										behavior: {
											...(constraints.behavior as { x: any; y: any }),
											y: e.target.value as any,
										},
									},
								})
							}}
						>
							<option>free</option>
							<option>contain</option>
							<option>inside</option>
							<option>outside</option>
							<option>fixed</option>
						</select>
					</>
				) : null}
			</div>
			<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
				<button
					onClick={() => {
						editor.setCamera(editor.getCamera(), { reset: true })
						// eslint-disable-next-line no-console
						console.log(editor.getCameraOptions())
					}}
				>
					Reset Camera
				</button>
				<button
					onClick={() => {
						updateOptions(CAMERA_OPTIONS)
					}}
				>
					Reset Camera Options
				</button>
			</div>
		</div>
	)
})
