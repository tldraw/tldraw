import { Editor } from '../Editor'

export class WatermarkManager {
	constructor(private editor: Editor) {}
	createWatermark() {
		const watermark = document.createElement('a')
		this.applyStyles(watermark)
		const canvas = document.getElementsByClassName('tldraw__editor')[0].firstChild as HTMLElement
		if (canvas) canvas.appendChild(watermark)
	}
	checkWatermark() {
		// check on an interval if the watermark is still there, if it isn't then add it back

		this.editor.timers.setInterval(() => {
			const canvas = document.getElementsByClassName('tldraw__editor')[0].firstChild as HTMLElement
			const children = [...canvas.children]
			const watermark = children.find(
				(element) => element.innerHTML === 'tldraw.dev'
			) as HTMLAnchorElement
			if (!watermark) {
				this.createWatermark()
			}
			this.applyStyles(watermark)
		}, 5000)
	}
	applyStyles(watermark: HTMLAnchorElement) {
		const watermarkStyle = {
			position: 'absolute',
			bottom: '60px',
			right: '20px',
			backgroundColor: 'rgb(0, 0, 0)',
			color: 'white',
			padding: '12px',
			fontFamily: 'Arial',
			fontSize: '20px',
			zIndex: '201',
			opacity: '1', // Added based on checkWatermark method
		}
		Object.assign(watermark.style, watermarkStyle)
		watermark.innerHTML = 'tldraw.dev'
		watermark.href = 'https://tldraw.dev'
	}
}
