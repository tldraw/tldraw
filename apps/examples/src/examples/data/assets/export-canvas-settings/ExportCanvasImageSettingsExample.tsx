import { useState } from 'react'
import { Box, Tldraw, TLImageExportOptions, TLUiComponents, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'

const components: TLUiComponents = {
	SharePanel: ExportCanvasButton,
}

export default function ExportCanvasImageSettingsExample() {
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
	const [box, setBox] = useState(() => {
		const v = editor.getViewportPageBounds()
		return { x: Math.round(v.x), y: Math.round(v.y), w: Math.round(v.w), h: Math.round(v.h) }
	})

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

					// [3]
					const { blob } = await editor.toImage([...shapeIds], {
						format: 'png',
						...opts,
						bounds: box.w > 0 && box.h > 0 ? new Box(box.x, box.y, box.w, box.h) : undefined,
					})

					const link = document.createElement('a')
					link.href = URL.createObjectURL(blob)
					link.download = 'every-shape-on-the-canvas.png'
					link.click()
					URL.revokeObjectURL(link.href)
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
[1]
`TLImageExportOptions` controls the export. The built-in export and copy actions fill
these from user preferences (e.g. `editor.user.getIsDarkMode()`), but when you call
`toImage` yourself you choose. `padding` accepts a number of pixels or 'auto', which
trims to the visual bounds of the content; the default here matches
`editor.options.defaultSvgPadding`.

[2]
`bounds` crops the export to a page-space box instead of fitting the shapes. It starts
as the current viewport so the first export matches what you see.

[3]
A box with zero width or height is treated as "no bounds", so the export fits all
shapes.
*/
