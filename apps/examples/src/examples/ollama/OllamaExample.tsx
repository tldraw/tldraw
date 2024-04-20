import { useRef } from 'react'
import { preventDefault, track, useReactor } from 'tldraw'
import 'tldraw/tldraw.css'
import './lm-styles.css'
import { modelManager } from './ollama'

const OllamaExample = track(() => {
	const rChat = useRef<HTMLDivElement>(null)

	useReactor(
		'scroll to bottom when thread changes',
		() => {
			modelManager.getThread()
			rChat.current?.scrollTo(0, rChat.current.scrollHeight)
		},
		[modelManager]
	)

	return (
		<div className="tldraw__editor">
			<div ref={rChat} className="chat">
				{modelManager.getThread().content.map((message, i) => (
					<div key={i} className="message">
						<p className="message__from">{message.from}</p>
						<p className="message__date">{new Date(message.time).toLocaleString()}</p>
						<p className="message__content">{message.content}</p>
					</div>
				))}
				<form
					className="chat__input"
					onSubmit={(e) => {
						preventDefault(e)
						const form = e.currentTarget
						const query = form.query.value
						modelManager.stream(query)
						form.query.value = ''
					}}
				>
					<input name="query" type="text" />
					<button>Submit</button>
					<button
						onClick={(e) => {
							preventDefault(e)
						}}
					>
						Cancel
					</button>
					<button
						onClick={(e) => {
							preventDefault(e)
							modelManager.clear()
						}}
					>
						Clear
					</button>
				</form>
			</div>
		</div>
	)
})

export default OllamaExample
