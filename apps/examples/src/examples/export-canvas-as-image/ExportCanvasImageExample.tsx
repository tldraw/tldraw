import { useState } from 'react'
import { Box, exportToBlob, Tldraw, TLImageExportOptions, TLUiComponents, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'

type BoxArrType = [
	X: number | undefined,
	Y: number | undefined,
	W: number | undefined,
	H: number | undefined,
]

const Control = ({
	name,
	type,
	labelWidth = '80px',
	inputWidth,
	value,
	checked,
	onChange,
}: {
	name: string
	type?: React.HTMLInputTypeAttribute
	labelWidth?: React.CSSProperties['width']
	inputWidth?: React.CSSProperties['width']
	value?: string | number | readonly string[]
	checked?: boolean
	onChange?: React.ChangeEventHandler<HTMLInputElement>
}) => {
	return (
		<div>
			<label htmlFor={`opt-${name}`} style={{ width: labelWidth, display: 'inline-block' }}>
				{name}
			</label>
			<input
				id={`opt-${name}`}
				name={name}
				type={type}
				style={{ width: inputWidth }}
				value={value ?? ''}
				checked={!!checked}
				onChange={onChange}
			/>
		</div>
	)
}
function ExportSettings({
	opts,
	setOpts,
	boxArr,
	setBoxArr,
}: {
	opts: TLImageExportOptions
	setOpts: React.Dispatch<React.SetStateAction<TLImageExportOptions>>
	boxArr: BoxArrType
	setBoxArr: React.Dispatch<React.SetStateAction<BoxArrType>>
}) {
	return (
		<div
			style={{
				pointerEvents: 'all',
				display: 'flex',
				flexDirection: 'column',
				gap: '0.25rem',
				border: '1px solid black',
				borderRadius: '5px',
				padding: '5px',
				position: 'absolute',
				right: 0,
				width: '200px',
			}}
		>
			<p>Export settings</p>
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
				inputWidth={'8ch'}
				value={opts.padding}
				onChange={(e) => {
					setOpts({ ...opts, padding: Number(e.target.value) })
				}}
			/>
			<Control
				type="number"
				name="scale"
				inputWidth={'8ch'}
				value={opts.scale}
				onChange={(e) => {
					setOpts({ ...opts, scale: Number(e.target.value) })
				}}
			/>
			<p>Box</p>
			<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
				{['X', 'Y', 'W', 'H'].map((e, i) => (
					<Control
						type="number"
						name={e}
						key={i}
						inputWidth={'8ch'}
						labelWidth={'20px'}
						value={boxArr[i]}
						onChange={(event) => {
							const newBoxArr = [...boxArr] as BoxArrType
							newBoxArr[i] = Number(event.target.value)
							setBoxArr(newBoxArr)
						}}
					/>
				))}
			</div>
		</div>
	)
}

function ExportCanvasButton() {
	const editor = useEditor()
	const [opts, setOpts] = useState<TLImageExportOptions>({ background: false })
	const [boxArr, setBoxArr] = useState<BoxArrType>([undefined, undefined, undefined, undefined])
	const [isOpen, setIsOpen] = useState(false)
	return (
		<div style={{ display: 'flex', alignItems: 'flex-start' }}>
			<div>
				<button
					style={{ pointerEvents: 'all' }}
					onClick={() => {
						setIsOpen(!isOpen)
					}}
				>
					{isOpen ? 'Close' : 'Open'} Export Settings
				</button>
				{isOpen && (
					<div style={{ position: 'relative' }}>
						<ExportSettings opts={opts} setOpts={setOpts} boxArr={boxArr} setBoxArr={setBoxArr} />
					</div>
				)}
			</div>
			<button
				style={{ pointerEvents: 'all', fontSize: 18, backgroundColor: 'thistle' }}
				onClick={async () => {
					const shapeIds = editor.getCurrentPageShapeIds()
					if (shapeIds.size === 0) return alert('No shapes on the canvas')
					const blob = await exportToBlob({
						editor,
						ids: [...shapeIds],
						format: 'png',
						opts: {
							...opts,
							bounds: boxArr.every((value) => value === undefined) ? undefined : new Box(...boxArr),
						},
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

/* 
This example shows how you can use the `exportToBlob()` function to create an image with all the shapes 
on the canvas in it and then download it. The easiest way to download an image is to use the download 
attribute of a link element.

To learn more about overriding UI you can check out our various custom menu examples. For more on handling
assets, check out our Local/Hosted images examples.
*/
