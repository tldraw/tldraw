import { useEditor } from 'tldraw'

export function Port({ side }: { side: 'left' | 'right' }) {
	const editor = useEditor()
	return (
		<div
			className={`Port Port_${side}`}
			onPointerDown={() => {
				editor.setCurrentTool('select.pointing_port')
			}}
		/>
	)
}
