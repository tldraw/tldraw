import { useEffect, useLayoutEffect, useState } from 'react'

export function ImageExport({ result, onStartAgain }: { result: Blob; onStartAgain: () => void }) {
	const [src, setSrc] = useState<string | null>(null)
	useLayoutEffect(() => {
		const url = URL.createObjectURL(result)
		setSrc(url)
		return () => URL.revokeObjectURL(url)
	}, [result])

	function onDownload() {
		if (!src) return

		const a = document.createElement('a')
		a.href = src
		a.download = 'annotated-image.png'
		a.click()
	}

	const [didCopy, setDidCopy] = useState(false)
	function onCopy() {
		navigator.clipboard.write([new ClipboardItem({ [result.type]: result })])
		setDidCopy(true)
	}
	useEffect(() => {
		if (!didCopy) return
		const t = setTimeout(() => setDidCopy(false), 2000)
		return () => clearTimeout(t)
	}, [didCopy])

	return (
		<div className="ImageExport">
			{src && <img src={src} />}
			<div className="ImageExport-buttons">
				<button onClick={onCopy}>{didCopy ? 'Copied!' : 'Copy'}</button>
				<button onClick={onDownload}>Download</button>
			</div>
			<button onClick={onStartAgain}>Start Again</button>
		</div>
	)
}
