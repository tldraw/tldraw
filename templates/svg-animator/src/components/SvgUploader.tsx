import React, { useCallback, useRef, useState } from 'react'

interface SvgUploaderProps {
	onSvgLoaded: (svgString: string) => void
}

export function SvgUploader({ onSvgLoaded }: SvgUploaderProps) {
	const [dragOver, setDragOver] = useState(false)
	const [fileName, setFileName] = useState<string | null>(null)
	const fileInputRef = useRef<HTMLInputElement>(null)

	const handleFile = useCallback(
		(file: File) => {
			if (!file.name.endsWith('.svg') && file.type !== 'image/svg+xml') {
				alert('Please upload an SVG file')
				return
			}
			const reader = new FileReader()
			reader.onload = (e) => {
				const text = e.target?.result as string
				setFileName(file.name)
				onSvgLoaded(text)
			}
			reader.readAsText(file)
		},
		[onSvgLoaded]
	)

	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault()
			setDragOver(false)
			const file = e.dataTransfer.files[0]
			if (file) handleFile(file)
		},
		[handleFile]
	)

	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0]
			if (file) handleFile(file)
		},
		[handleFile]
	)

	return (
		<div className="panel-section">
			<h3>SVG input</h3>
			<div
				className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
				onDragOver={(e) => {
					e.preventDefault()
					setDragOver(true)
				}}
				onDragLeave={() => setDragOver(false)}
				onDrop={handleDrop}
				onClick={() => fileInputRef.current?.click()}
			>
				{fileName ? (
					<span className="file-name">{fileName}</span>
				) : (
					<span>Drop SVG here or click to browse</span>
				)}
			</div>
			<input
				ref={fileInputRef}
				type="file"
				accept=".svg,image/svg+xml"
				onChange={handleChange}
				hidden
			/>
			<button
				className="secondary"
				style={{
					marginTop: 6,
					width: '100%',
					padding: '6px 10px',
					border: 'none',
					borderRadius: 5,
					fontSize: 12,
					fontWeight: 500,
					cursor: 'pointer',
					background: '#e8e8e8',
					color: '#333',
				}}
				onClick={async () => {
					const resp = await fetch('/sample.svg')
					const text = await resp.text()
					setFileName('sample.svg')
					onSvgLoaded(text)
				}}
			>
				Load sample SVG
			</button>
		</div>
	)
}
