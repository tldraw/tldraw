import { createContext, useCallback, useContext, useState } from 'react'
import { Editor, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this page!

// [1]
const focusedEditorContext = createContext(
	{} as {
		focusedEditor: Editor | null
		setFocusedEditor(editor: Editor | null): void
	}
)

// [2]
export default function MultipleExample() {
	const [focusedEditor, _setFocusedEditor] = useState<Editor | null>(null)

	const setFocusedEditor = useCallback(
		(editor: Editor | null) => {
			if (focusedEditor !== editor) {
				if (focusedEditor) {
					focusedEditor.blur()
				}
				if (editor) {
					editor.focus()
				}
				_setFocusedEditor(editor)
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
				padding: 32,
			}}
			// Clicking anywhere on the page outside an editor blurs the focused one
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
				// Keep pointer downs inside the editor from reaching the page-level blur handler
				onPointerDown={(e) => e.stopPropagation()}
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
				development. John had stumbled upon a new whiteboard library called “tldraw”, a seemingly
				simple tool that promised to revolutionize collaborative drawing on the web. Little did he
				know that this discovery would set off a chain of events that would challenge his skills,
				test his perseverance, and blur the line between reality and imagination.
			</p>
			<p>
				With a newfound sense of excitement, John began integrating “tldraw” into his latest
				project. As lines of code danced across his screen, he imagined the possibilities that lay
				ahead. The potential to create virtual spaces where ideas could be shared, concepts could be
				visualized, and teams could collaborate seamlessly from different corners of the world. It
				was a dream that seemed within reach, a vision of a future where creativity and technology
				merged into a harmonious symphony.
			</p>
			<p>
				As the night wore on, John’s mind became consumed with the whiteboard library. He couldn’t
				help but marvel at its elegance and simplicity. With each stroke of his keyboard, he felt a
				surge of inspiration, a connection to something greater than himself. It was as if the lines
				of code he was writing were transforming into a digital canvas, waiting to be filled with
				the strokes of imagination. In that moment, John realized that he was not just building a
				tool, but breathing life into a new form of expression. The whiteboard was no longer just a
				blank slate; it had become a portal to a world where ideas could flourish and dreams could
				take shape.
			</p>
			<p>
				Little did John know, this integration of “tldraw” was only the beginning. It would lead him
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
With several editors on one page, only one should own keyboard focus at a time. Every
editor here has `autoFocus={false}`, and we manage focus ourselves with a context.

The editors are also stashed on `window` (`EDITOR_A`, `EDITOR_B`, `EDITOR_C`) so the
e2e tests can reach them; a real app would keep them in state or refs.

[1]
A context holding the focused editor and a setter.

[2]
The setter blurs the previously focused editor and focuses the new one before
updating state, so exactly one editor has `isFocused` at any time.

[3]
Each editor is wrapped in a focusable div (`tabIndex={-1}`). When it receives DOM
focus, we mark its editor as the focused one. Editor A focuses itself on mount.

[4]
Editors B and C share a persistence key, so they display the same locally
synchronized document.

[5]
A long story that doesn't go anywhere, but it's a good way to test that scrolling
the page doesn't get captured by an unfocused editor.
*/
