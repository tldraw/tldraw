// @ts-check

// This script is run within the webview itself
(function () {
	// @ts-ignore
	const vscode = acquireVsCodeApi();

	/**
	 * A drawn line.
	 */
	class Stroke {
		constructor(/** @type {string} */ color, /** @type {Array<[number, number]> | undefined} */ stroke) {
			this.color = color;
			/** @type {Array<[number, number]>} */
			this.stroke = stroke || [];
		}

		addPoint(/** @type {number} */ x, /** @type {number} */ y) {
			this.stroke.push([x, y])
		}
	}

	/**
	 * @param {Uint8Array} initialContent 
	 * @return {Promise<HTMLImageElement>}
	 */
	async function loadImageFromData(initialContent) {
		const blob = new Blob([initialContent], { 'type': 'image/png' });
		const url = URL.createObjectURL(blob);
		try {
			const img = document.createElement('img');
			img.crossOrigin = 'anonymous';
			img.src = url;
			await new Promise((resolve, reject) => {
				img.onload = resolve;
				img.onerror = reject;
			});
			return img;
		} finally {
			URL.revokeObjectURL(url);
		}
	}

	class PawDrawEditor {
		constructor( /** @type {HTMLElement} */ parent) {
			this.ready = false;

			this.editable = false;

			this.drawingColor = 'black';

			/** @type {Array<Stroke>} */
			this.strokes = [];

			/** @type {Stroke | undefined} */
			this.currentStroke = undefined;

			this._initElements(parent);
		}

		addPoint(/** @type {number} */ x, /** @type {number} */ y) {
			if (this.currentStroke) {
				this.currentStroke.addPoint(x, y)
			}
		}

		beginStoke(/** @type {string} */ color) {
			this.currentStroke = new Stroke(color);
			this.strokes.push(this.currentStroke);
		}

		endStroke() {
			const previous = this.currentStroke;
			this.currentStroke = undefined;
			return previous;
		}

		setEditable(editable) {
			this.editable = editable;
			const colorButtons = /** @type {NodeListOf<HTMLButtonElement>} */ (document.querySelectorAll('.drawing-controls button'));
			for (const colorButton of colorButtons) {
				colorButton.disabled = !editable;
			}
		}

		_initElements(/** @type {HTMLElement} */ parent) {
			const colorButtons = /** @type {NodeListOf<HTMLButtonElement>} */ (document.querySelectorAll('.drawing-controls button'));
			for (const colorButton of colorButtons) {
				colorButton.addEventListener('click', e => {
					e.stopPropagation();
					colorButtons.forEach(button => button.classList.remove('active'));
					colorButton.classList.add('active');
					this.drawingColor = colorButton.dataset['color'];
				});
			}

			this.wrapper = document.createElement('div');
			this.wrapper.style.position = 'relative';
			parent.append(this.wrapper);

			this.initialCanvas = document.createElement('canvas');
			this.initialCtx = this.initialCanvas.getContext('2d');
			this.wrapper.append(this.initialCanvas);

			this.drawingCanvas = document.createElement('canvas');
			this.drawingCanvas.style.position = 'absolute';
			this.drawingCanvas.style.top = '0';
			this.drawingCanvas.style.left = '0';
			this.drawingCtx = this.drawingCanvas.getContext('2d');
			this.wrapper.append(this.drawingCanvas);

			let isDrawing = false;

			parent.addEventListener('mousedown', () => {
				if (!this.ready || !this.editable) {
					return;
				}

				this.beginStoke(this.drawingColor);
				this.drawingCtx.strokeStyle = this.drawingColor;

				isDrawing = true;
				document.body.classList.add('isDrawing');
				this.drawingCtx.beginPath();
			});

			document.body.addEventListener('mouseup', async () => {
				if (!isDrawing || !this.ready || !this.editable) {
					return;
				}

				isDrawing = false;
				document.body.classList.remove('isDrawing');
				this.drawingCtx.closePath();

				const edit = this.endStroke();

				if (edit.stroke.length) {
					vscode.postMessage({
						type: 'stroke',
						color: edit.color,
						stroke: edit.stroke,
					});
				}
			});

			parent.addEventListener('mousemove', e => {
				if (!isDrawing || !this.ready || !this.editable) {
					return;
				}
				const rect = this.wrapper.getBoundingClientRect();
				const x = e.clientX - rect.left;
				const y = e.clientY - rect.top;
				this.drawingCtx.lineTo(x, y);
				this.drawingCtx.stroke();
				this.addPoint(x, y);
			});
		}

		_redraw() {
			this.drawingCtx.clearRect(0, 0, this.drawingCanvas.width, this.drawingCanvas.height);
			for (const stroke of this.strokes) {
				this.drawingCtx.strokeStyle = stroke.color;
				this.drawingCtx.beginPath();
				for (const [x, y] of stroke.stroke) {
					this.drawingCtx.lineTo(x, y);
				}
				this.drawingCtx.stroke();
				this.drawingCtx.closePath();
			}
		}

		/**
		 * @param {Uint8Array | undefined} data 
		 * @param {Array<Stroke> | undefined} strokes 
		 */
		async reset(data, strokes = []) {
			if (data) {
				const img = await loadImageFromData(data);
				this.initialCanvas.width = this.drawingCanvas.width = img.naturalWidth;
				this.initialCanvas.height = this.drawingCanvas.height = img.naturalHeight;
				this.initialCtx.drawImage(img, 0, 0);
				this.ready = true;
			}

			this.strokes = strokes;
			this._redraw();
		}

		/**
		 * @param {Array<Stroke> | undefined} strokes 
		 */
		async resetUntitled(strokes = []) {
			const size = 100;
			this.initialCanvas.width = this.drawingCanvas.width = size;
			this.initialCanvas.height = this.drawingCanvas.height = size;

			this.initialCtx.save();
			{
				this.initialCtx.fillStyle = 'white';
				this.initialCtx.fillRect(0, 0, size, size);
			}
			this.initialCtx.restore();

			this.ready = true;

			this.strokes = strokes;
			this._redraw();
		}

		/** @return {Promise<Uint8Array>} */
		async getImageData() {
			const outCanvas = document.createElement('canvas');
			outCanvas.width = this.drawingCanvas.width;
			outCanvas.height = this.drawingCanvas.height;

			const outCtx = outCanvas.getContext('2d');
			outCtx.drawImage(this.initialCanvas, 0, 0);
			outCtx.drawImage(this.drawingCanvas, 0, 0);

			const blob = await new Promise(resolve => {
				outCanvas.toBlob(resolve, 'image/png')
			});

			return new Uint8Array(await blob.arrayBuffer());
		}
	}

	const editor = new PawDrawEditor(document.querySelector('.drawing-canvas'));

	// Handle messages from the extension
	window.addEventListener('message', async e => {
		const { type, body, requestId } = e.data;
		switch (type) {
			case 'init':
				{
					editor.setEditable(body.editable);
					if (body.untitled) {
						await editor.resetUntitled();
						return;
					} else {
						// Load the initial image into the canvas.
						const data = new Uint8Array(body.value.data);
						await editor.reset(data);
						return;
					}
				}
			case 'update':
				{
					const data = body.content ? new Uint8Array(body.content.data) : undefined;
					const strokes = body.edits.map(edit => new Stroke(edit.color, edit.stroke));
					await editor.reset(data, strokes)
					return;
				}
			case 'getFileData':
				{
					// Get the image data for the canvas and post it back to the extension.
					editor.getImageData().then(data => {
						vscode.postMessage({ type: 'response', requestId, body: Array.from(data) });
					});
					return;
				}
		}
	});

	// Signal to VS Code that the webview is initialized.
	vscode.postMessage({ type: 'ready' });
}());
