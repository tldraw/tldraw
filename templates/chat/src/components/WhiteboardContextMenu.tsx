import {
	createContext,
	RefObject,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from 'react'
import {
	DefaultContextMenu,
	DefaultContextMenuContent,
	TLImageShape,
	TLUiContextMenuProps,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	useEditor,
} from 'tldraw'
import { layerizeImage } from '../utils/layerizeImage'

export const LayerizeContext = createContext({
	cancel: { current: null } as RefObject<(() => void) | null>,
	autoStart: false,
	ready: false,
	onStatus: (_busy: boolean, _message: string | null) => {},
	onComplete: () => {},
})

export function WhiteboardContextMenu(props: TLUiContextMenuProps) {
	const editor = useEditor()
	const context = useContext(LayerizeContext)
	const callbacks = useRef(context)
	callbacks.current = context
	const job = useRef<AbortController | null>(null)
	const started = useRef(false)
	const [busy, setBusy] = useState(false)

	const start = useCallback(
		async (shape: TLImageShape) => {
			if (job.current) return
			const controller = new AbortController()
			job.current = controller
			callbacks.current.cancel.current = () => {
				controller.abort()
				setBusy(false)
				callbacks.current.onStatus(false, null)
			}
			setBusy(true)
			callbacks.current.onStatus(true, 'Layerizing image…')
			try {
				await layerizeImage(editor, shape, controller.signal)
				if (!controller.signal.aborted) {
					callbacks.current.onComplete()
					callbacks.current.onStatus(false, null)
				}
			} catch (error) {
				if (!controller.signal.aborted)
					callbacks.current.onStatus(
						false,
						error instanceof Error ? error.message : 'Could not layerize the image.'
					)
			} finally {
				if (job.current === controller) {
					job.current = null
					callbacks.current.cancel.current = null
				}
				if (!controller.signal.aborted) setBusy(false)
			}
		},
		[editor]
	)

	useEffect(
		() => () => {
			job.current?.abort()
		},
		[]
	)
	useEffect(() => {
		if (!context.autoStart || !context.ready || started.current) return
		started.current = true
		const shape = editor
			.getCurrentPageShapes()
			.find((shape): shape is TLImageShape => shape.type === 'image')
		if (shape) void start(shape)
	}, [context.autoStart, context.ready, editor, start])

	return (
		<DefaultContextMenu {...props}>
			<LayerizeMenuItem busy={busy || !context.ready} onSelect={start} />
			<DefaultContextMenuContent />
		</DefaultContextMenu>
	)
}

function LayerizeMenuItem({
	busy,
	onSelect,
}: {
	busy: boolean
	onSelect: (shape: TLImageShape) => Promise<void>
}) {
	const editor = useEditor()
	const [shape] = useState(() =>
		editor.getShapeAtPoint(editor.inputs.getCurrentPagePoint(), {
			hitLocked: true,
			hitInside: true,
		})
	)
	if (shape?.type !== 'image') return null
	return (
		<TldrawUiMenuGroup id="layerize">
			<TldrawUiMenuItem
				id="layerize"
				label={busy ? 'Layerizing…' : 'Layerize'}
				readonlyOk
				disabled={busy}
				onSelect={() => void onSelect(shape as TLImageShape)}
			/>
		</TldrawUiMenuGroup>
	)
}
