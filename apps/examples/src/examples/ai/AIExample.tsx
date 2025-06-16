import { useState } from 'react'
import { Tldraw, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

function SummarizeButton() {
	const [apiKey, setApiKey] = useState(localStorage.getItem('ai-example-openai-api-key') ?? '')
	const [isSending, setIsSending] = useState(false)
	const editor = useEditor()

	async function handleClick() {
		if (!apiKey) return alert('Please enter your OpenAI API key first.')

		const shapes = editor.getCurrentPageShapes()
		if (shapes.length === 0) {
			return alert('Please add something to the canvas first.')
		}

		setIsSending(true)

		// [1]
		const imageBlob = (await editor.toImage(shapes)).blob
		const imageDataUrl = await blobToDataUrl(imageBlob)

		// [2]
		const response = await fetch('https://api.openai.com/v1/responses', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${apiKey}`,
			},
			body: JSON.stringify({
				model: 'gpt-4.1',
				input: [
					{
						role: 'user',
						content: [
							{
								type: 'input_text',
								text: 'Summarize the current canvas content in three sentences or less.',
							},
							{
								type: 'input_image',
								image_url: imageDataUrl,
							},
						],
					},
				],
			}),
		})

		// [3]
		if (!response.ok) {
			setIsSending(false)
			const body = await response.json()
			console.error('Error response from OpenAI:', body.error)
			alert(`Error: ${body.error.message || 'An error occurred while sending the request.'}`)
			return
		}
		const data = await response.json()
		setIsSending(false)

		alert(`Model response:\n\n${data.output[0].content[0].text}`)
	}

	return (
		<div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
			<button
				onClick={handleClick}
				style={{ height: 30, cursor: 'pointer', pointerEvents: 'all', flexShrink: 0 }}
			>
				{isSending ? 'Sending request...' : 'Summarize canvas'}
			</button>

			{/* [4] */}
			<input
				style={{ height: 30, maxWidth: '100%', pointerEvents: 'all' }}
				type="password"
				placeholder="OpenAI API key"
				value={apiKey}
				onInput={(e) => {
					const target = e.target as HTMLInputElement
					setApiKey(target.value)
					localStorage.setItem('ai-example-openai-api-key', target.value)
				}}
			/>
		</div>
	)
}

async function blobToDataUrl(file: Blob): Promise<string> {
	return await new Promise((resolve, reject) => {
		if (file) {
			const reader = new FileReader()
			reader.onload = () => resolve(reader.result as string)
			reader.onerror = (error) => reject(error)
			reader.onabort = (error) => reject(error)
			reader.readAsDataURL(file)
		}
	})
}

export default function AIExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw components={{ TopPanel: SummarizeButton }} persistenceKey="ai-example" />
		</div>
	)
}

/*

[1]
Use the `editor.toImage` function to get the current canvas as an image blob. This example also uses
a helper function `blobToDataUrl` to convert the image to a data URL, which works with the OpenAI
REST API. Depending on what model or library you are using, you may need to convert to a different
format.

[2]
Send a request to the AI model. For simplicity, this example manually calls OpenAI's REST API, but
you might want to use a library like Vercel's AI SDK to handle this on your behalf.

[3]
Handle the response and display it to the user.

[4]
For demonstration purposes, this example uses a password input for your API key, but you will want
to set this up from environment variables instead.

*/
