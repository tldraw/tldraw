import { useState } from 'react'
import { DEFAULT_SUPPORTED_MEDIA_TYPE_LIST, FileHelpers, MediaHelpers } from 'tldraw'
import anakin from './assets/anakin.jpeg'
import distractedBf from './assets/distracted-bf.jpeg'
import expandingBrain from './assets/expanding-brain.png'

export function ImagePicker({
	onChooseImage,
}: {
	onChooseImage: (image: { src: string; width: number; height: number; type: string }) => void
}) {
	const [isLoading, setIsLoading] = useState(false)
	function onClickChooseImage() {
		const input = window.document.createElement('input')
		input.type = 'file'
		input.accept = DEFAULT_SUPPORTED_MEDIA_TYPE_LIST
		input.addEventListener('change', async (e) => {
			const fileList = (e.target as HTMLInputElement).files
			if (!fileList || fileList.length === 0) return
			const file = fileList[0]

			setIsLoading(true)
			try {
				const dataUrl = await FileHelpers.blobToDataUrl(file)
				const { w, h } = await MediaHelpers.getImageSize(file)
				onChooseImage({ src: dataUrl, width: w, height: h, type: file.type })
			} finally {
				setIsLoading(false)
			}
		})
		input.click()
	}

	async function onChooseExample(src: string) {
		setIsLoading(true)
		try {
			const image = await fetch(src)
			const blob = await image.blob()
			const { w, h } = await MediaHelpers.getImageSize(blob)
			onChooseImage({ src, width: w, height: h, type: blob.type })
		} finally {
			setIsLoading(false)
		}
	}

	if (isLoading) {
		return <div className="ImagePicker">Loading...</div>
	}

	return (
		<div className="ImagePicker">
			<button onClick={onClickChooseImage}>Choose an image</button>
			<div className="ImagePicker-exampleLabel">or use an example:</div>
			<div className="ImagePicker-examples">
				<img src={anakin} alt="anakin" onClick={() => onChooseExample(anakin)} />
				<img
					src={distractedBf}
					alt="distracted boyfriend"
					onClick={() => onChooseExample(distractedBf)}
				/>
				<img
					src={expandingBrain}
					alt="expanding brain"
					onClick={() => onChooseExample(expandingBrain)}
				/>
			</div>
		</div>
	)
}
