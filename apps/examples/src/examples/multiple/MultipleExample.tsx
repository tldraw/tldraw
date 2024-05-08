import { createContext, useCallback, useContext, useState } from 'react'
import { Editor, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this page!

// [1]
const focusedEditorContext = createContext(
	{} as {
		focusedEditor: Editor | null
		setFocusedEditor: (id: Editor | null) => void
	}
)

// [2]
export default function MultipleExample() {
	const [focusedEditor, _setFocusedEditor] = useState<Editor | null>(null)

	const setFocusedEditor = useCallback(
		(editor: Editor | null) => {
			if (focusedEditor !== editor) {
				focusedEditor?.updateInstanceState({ isFocused: false })
				_setFocusedEditor(editor)
				editor?.updateInstanceState({ isFocused: true })
			}
		},
		[focusedEditor]
	)

	const focusName =
		focusedEditor === (window as any).EDITOR_A
			? 'A'
			: focusedEditor === (window as any).EDITOR_B
				? 'B'
				: focusedEditor === (window as any).EDITOR_C
					? 'C'
					: 'none'

	return (
		<div
			style={{
				backgroundColor: '#fff',
				padding: 32,
			}}
			// Sorry you need to do this yourself
			onPointerDown={() => setFocusedEditor(null)}
		>
			<focusedEditorContext.Provider value={{ focusedEditor, setFocusedEditor }}>
				<h1>Focusing: {focusName}</h1>
				<EditorA />
				<textarea data-testid="textarea" placeholder="type in me" style={{ margin: 10 }} />
				<div
					style={{
						width: '100%',
						display: 'grid',
						gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
						gap: 64,
					}}
				>
					<EditorB />
					<EditorC />
				</div>
				<p>
					These two editors share the same persistence key so they will share a (locally)
					synchronized document.
				</p>
				<ABunchOfText />
			</focusedEditorContext.Provider>
		</div>
	)
}

// [3]
function EditorA() {
	const { setFocusedEditor } = useContext(focusedEditorContext)

	return (
		<div style={{ padding: 32 }}>
			<h2>A</h2>
			<div
				tabIndex={-1}
				onFocus={() => setFocusedEditor((window as any).EDITOR_A)}
				style={{ height: 600 }}
			>
				<Tldraw
					persistenceKey="steve"
					className="A"
					autoFocus={false}
					onMount={(editor) => {
						;(window as any).EDITOR_A = editor
						setFocusedEditor(editor)
					}}
				/>
			</div>
		</div>
	)
}

// [4]
function EditorB() {
	const { setFocusedEditor } = useContext(focusedEditorContext)

	return (
		<div>
			<h2>B</h2>
			<div
				tabIndex={-1}
				onFocus={() => setFocusedEditor((window as any).EDITOR_B)}
				style={{ height: 600 }}
			>
				<Tldraw
					persistenceKey="david"
					className="B"
					autoFocus={false}
					onMount={(editor) => {
						;(window as any).EDITOR_B = editor
					}}
				/>
			</div>
		</div>
	)
}

function EditorC() {
	const { setFocusedEditor } = useContext(focusedEditorContext)

	return (
		<div>
			<h2>C</h2>
			<div
				tabIndex={-1}
				onFocus={() => setFocusedEditor((window as any).EDITOR_C)}
				style={{ height: 600 }}
			>
				<Tldraw
					persistenceKey="david"
					className="C"
					autoFocus={false}
					onMount={(editor) => {
						;(window as any).EDITOR_C = editor
					}}
				/>
			</div>
		</div>
	)
}

// [5]
function ABunchOfText() {
	return (
		<article style={{ maxWidth: 500 }}>
			<h1>White Board</h1>
			<h2>Chapter 1: The First Strokes</h2>
			<p>
				The fluorescent lights flickered overhead as John sat hunched over his desk, his fingers
				tapping rhythmically on the keyboard. He was a software developer, and tonight, he had a
				peculiar mission. A mission that would take him deep into the labyrinthine world of web
				development. John had stumbled upon a new whiteboard library called "tldraw," a seemingly
				simple tool that promised to revolutionize collaborative drawing on the web. Little did he
				know that this discovery would set off a chain of events that would challenge his skills,
				test his perseverance, and blur the line between reality and imagination.
			</p>
			<p>
				With a newfound sense of excitement, John began integrating "tldraw" into his latest
				project. As lines of code danced across his screen, he imagined the possibilities that lay
				ahead. The potential to create virtual spaces where ideas could be shared, concepts could be
				visualized, and teams could collaborate seamlessly from different corners of the world. It
				was a dream that seemed within reach, a vision of a future where creativity and technology
				merged into a harmonious symphony.
			</p>
			<p>
				As the night wore on, John's mind became consumed with the whiteboard library. He couldn't
				help but marvel at its elegance and simplicity. With each stroke of his keyboard, he felt a
				surge of inspiration, a connection to something greater than himself. It was as if the lines
				of code he was writing were transforming into a digital canvas, waiting to be filled with
				the strokes of imagination. In that moment, John realized that he was not just building a
				tool, but breathing life into a new form of expression. The whiteboard was no longer just a
				blank slate; it had become a portal to a world where ideas could flourish and dreams could
				take shape.
			</p>
			<p>
				Little did John know, this integration of "tldraw" was only the beginning. It would lead him
				down a path filled with unforeseen challenges, where he would confront his own limitations
				and question the very nature of creation. The journey ahead would test his resolve, pushing
				him to the edge of his sanity. And as he embarked on this perilous adventure, he could not
				shake the feeling that the whiteboard held secrets far beyond his understanding. Secrets
				that would unfold before his eyes, one stroke at a time.
			</p>
		</article>
	)
}

/* 
This example shows how to use multiple editors on the same page. When doing this, you'll
need to make sure that only one editor is focused at a time. We can manage this using 
the autofocus prop on the tldraw component, along with React's context and set state 
APIs.

[1]
We first create a context that will hold the focused editor id and a setter for that id. 
We'll use this to keep track of which editor is focused.

[2]
Wrap the editors in the context provider. This will make the context available to all
of the editors.

[3]	
Get the focused editor id and the setter from the context. We'll use these to determine
if the editor should be focused or not. We wrap the Tldraw component in a div and use 
the onFocus event to set the focused editor id. 

[4]
Same again, but we're using the same persistence key for editors B and C. This means
that they will share a document. 

[5]
A long story that doesn't really go anywhere, clearly written by a computer. But it's	
a good way to test the scroll behavior of the page.
*/
