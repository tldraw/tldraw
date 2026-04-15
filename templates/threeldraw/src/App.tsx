import { useCallback, useMemo, useRef, useState } from 'react'
import { Editor, TLComponents, Tldraw } from 'tldraw'
import { SceneProvider, useSceneSystem } from './scene-system/SceneContext'
import { SceneHost } from './scene-system/SceneHost'
import { SceneSharePanel } from './scene-system/SceneSharePanel'

const components: TLComponents = {
	InFrontOfTheCanvas: SceneHost,
	SharePanel: SceneSharePanel,
}

export function App() {
	const editorRef = useRef<Editor | null>(null)
	const [editor, setEditor] = useState<Editor | null>(null)

	const handleMount = useCallback((editor: Editor) => {
		editorRef.current = editor
		setEditor(editor)
		;(window as Window & { editor?: Editor }).editor = editor

		return () => {
			if (editorRef.current === editor) {
				editorRef.current = null
			}
			setEditor((current: Editor | null) => (current === editor ? null : current))
		}
	}, [])

	return (
		<SceneProvider editor={editor}>
			<AppShell onMount={handleMount} />
		</SceneProvider>
	)
}

function AppShell({ onMount }: { onMount: (editor: Editor) => void | (() => void) }) {
	const { currentScene } = useSceneSystem()

	const stableComponents = useMemo(() => components, [])

	return (
		<div className="threeldraw-app" data-scene={currentScene.id}>
			<Tldraw autoFocus components={stableComponents} onMount={onMount} />
		</div>
	)
}
