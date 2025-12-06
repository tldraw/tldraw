import { useState } from 'react'
import { Box, Tldraw, TLImageExportOptions, TLUiComponents, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'

const components: TLUiComponents = {
	SharePanel: ExportCanvasButton,
}

export default function ExportCanvasImageExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw components={components} />
		</div>
	)
}

function ExportCanvasButton() {
	const editor = useEditor()

	// [1]
	const [opts, setOpts] = useState<TLImageExportOptions>({
		scale: 1,
		background: false,
		padding: editor.options.defaultSvgPadding,
	})

	// [2]
	const [box, setBox] = useState({ x: 0, y: 0, w: 0, h: 0 })

	return (
		<div
			style={{
				pointerEvents: 'all',
				border: '1px solid black',
				borderRadius: 5,
				padding: 12,
				position: 'absolute',
				display: 'flex',
				flexDirection: 'column',
				right: 164,
				top: 8,
			}}
		>
			<div
				style={{
					display: 'grid',
					gridTemplateColumns: '1fr auto',
					gridAutoFlow: 'row',
					rowGap: 4,
					columnGap: 16,
				}}
			>
				<Control
					type="checkbox"
					name="background"
					checked={opts.background}
					onChange={(e) => {
						setOpts({ ...opts, background: e.target.checked })
					}}
				/>
				<Control
					type="checkbox"
					name="darkmode"
					checked={opts.darkMode}
					onChange={(e) => {
						setOpts({ ...opts, darkMode: e.target.checked })
					}}
				/>
				<Control
					type="number"
					name="padding"
					value={opts.padding}
					onChange={(e) => {
						setOpts({ ...opts, padding: Math.ceil(Number(e.target.value)) })
					}}
				/>
				<Control
					type="number"
					name="scale"
					value={opts.scale}
					onChange={(e) => {
						setOpts({ ...opts, scale: Math.ceil(Number(e.target.value)) })
					}}
				/>
				<p style={{ gridColumn: '1 / span 2' }}>Box</p>
				{['x', 'y', 'w', 'h'].map((key) => (
					<div key={key} style={{ display: 'flex', gap: 4 }}>
						<Control
							type="number"
							name={key}
							value={box[key as keyof typeof box]}
							onChange={(event) => {
								setBox({
									...box,
									[key]: Math.ceil(Number(event.target.value)),
								})
							}}
						/>
					</div>
				))}
			</div>
			<button
				style={{ pointerEvents: 'all', marginTop: 16 }}
				onClick={async () => {
					const shapeIds = editor.getCurrentPageShapeIds()
					if (shapeIds.size === 0) return alert('No shapes on the canvas')

					const { blob } = await editor.toImage([...shapeIds], {
						format: 'png',
						...opts,
						// If we have numbers for all of the box values, we can use them as bounds
						bounds: Object.values(box).every((b) => !Number.isNaN(b))
							? new Box(box.x, box.y, box.w, box.h)
							: undefined,
					})

					const link = document.createElement('a')
					link.href = window.URL.createObjectURL(blob)
					link.download = 'every-shape-on-the-canvas.jpg'
					link.click()
				}}
			>
				Export canvas as image
			</button>
		</div>
	)
}

const Control = ({
	name,
	type,
	value,
	checked,
	onChange,
}: {
	name: string
	type?: React.HTMLInputTypeAttribute
	value?: string | number | readonly string[]
	checked?: boolean
	onChange?: React.ChangeEventHandler<HTMLInputElement>
}) => {
	return (
		<>
			<label htmlFor={`opt-${name}`} style={{ flexGrow: 2 }}>
				{name}
			</label>
			<input
				id={`opt-${name}`}
				name={name}
				type={type}
				style={{ maxWidth: 64, justifySelf: 'flex-end' }}
				value={value ?? ''}
				checked={!!checked}
				onChange={onChange}
			/>
		</>
	)
}

/* 
This example shows how you can use the image export settings in tldraw when generating an image.

1.
These are our defaults, though the rest of export / copy features use the user preferences,
e.g. editor.user.getIsDarkMode() for whether the user has enabled dark mode or not. But if
you're calling the image functions yourself, you can provide whatever options you wish.

2.
The bounding box is an optional argument that you can use to export a specific part of the canvas
or selection.
*/
