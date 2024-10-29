import {
	ChangeEvent,
	KeyboardEvent,
	SetStateAction,
	useCallback,
	useEffect,
	useRef,
	useState,
} from 'react'
import {
	OfflineIndicator,
	preventDefault,
	stopEventPropagation,
	track,
	useBreakpoint,
	useEditor,
	useTranslation,
	useUiEvents,
} from 'tldraw'

interface NameState {
	readonly name: string | null
	readonly isEditing: boolean
}

export const DocumentTopZone = track(function DocumentTopZone({
	isOffline,
}: {
	isOffline: boolean
}) {
	const isDocumentNameVisible = useBreakpoint() >= 4

	return (
		<>
			{isDocumentNameVisible && <DocumentNameInner />}
			{isOffline && <OfflineIndicator />}
		</>
	)
})

export const DocumentNameInner = track(function DocumentNameInner() {
	const [state, setState] = useState<NameState>({ name: null, isEditing: false })
	const editor = useEditor()
	const isReadonly = editor.getIsReadonly()

	return (
		<div className="tlui-document-name__inner">
			<DocumentNameEditor isReadonly={isReadonly} state={state} setState={setState} />
		</div>
	)
})

const DocumentNameEditor = track(function DocumentNameEditor({
	state,
	setState,
	isReadonly,
}: {
	state: NameState
	setState(update: SetStateAction<NameState>): void
	isReadonly: boolean
}) {
	const inputRef = useRef<HTMLInputElement>(null)
	const editor = useEditor()
	const documentSettings = editor.getDocumentSettings()
	const msg = useTranslation()
	const trackEvent = useUiEvents()
	const defaultDocumentName = msg('document.default-name')

	useEffect(() => {
		if (isReadonly) {
			setState((prev) => ({ ...prev, isEditing: false }))
		}
		if (state.isEditing && inputRef.current) {
			inputRef.current.select()
		}
	}, [isReadonly, setState, state.isEditing])

	useEffect(() => {
		const save = () => {
			if (state.name === null) return
			const trimmed = state.name.trim()
			if (trimmed === documentSettings.name.trim()) {
				if (!state.isEditing) setState((prev) => ({ ...prev, name: null }))
				return
			}

			trackEvent('rename-document', { source: 'document-name' })
			editor.updateDocumentSettings({ name: trimmed })
		}

		if (!state.isEditing) {
			save()
		}
	}, [documentSettings.name, editor, state.isEditing, state.name, setState, trackEvent])

	useEffect(() => {
		if (documentSettings.name) {
			document.title = `${documentSettings.name} · tldraw`
		} else {
			document.title = 'tldraw'
		}
	}, [documentSettings.name])

	const handleChange = useCallback(
		(e: ChangeEvent<HTMLInputElement>) => {
			const value = e.currentTarget.value
			setState((prev) => ({ ...prev, name: value }))
		},
		[setState]
	)

	const handleKeydownCapture = useCallback(
		(e: KeyboardEvent) => {
			if (e.key === 'Enter') {
				preventDefault(e)
				// blur triggers save
				inputRef.current?.blur()
			} else if (e.key === 'Escape') {
				preventDefault(e)
				stopEventPropagation(e)
				// revert to original name instantly so that when we blur we don't
				// trigger a save with the new one
				setState((prev) => ({ ...prev, name: null }))
				inputRef.current?.blur()
				editor.focus()
			}
		},
		[setState, editor]
	)

	const handleBlur = useCallback(() => {
		setState((prev) => ({ ...prev, isEditing: false }))
	}, [setState])

	const name = state.name ?? (documentSettings.name || defaultDocumentName)

	return (
		<div className="tlui-document-name__input__wrapper">
			{state.isEditing && (
				<input
					ref={inputRef}
					className="tlui-document-name__input"
					value={state.name ?? documentSettings.name}
					onChange={handleChange}
					onBlur={handleBlur}
					onKeyDownCapture={handleKeydownCapture}
					placeholder={defaultDocumentName}
					autoFocus
				/>
			)}
			{state.isEditing ? (
				<div
					className="tlui-document-name__text tlui-document-name__text__hidden"
					// @ts-expect-error
					inert=""
					aria-hidden
				>
					{addRealSpaceForWhitespace(name)}
				</div>
			) : (
				<div
					className="tlui-document-name__text"
					onDoubleClick={() => {
						if (isReadonly) return
						editor.setEditingShape(null)
						setState((prev) => ({ ...prev, isEditing: true }))
					}}
				>
					{addRealSpaceForWhitespace(name)}
				</div>
			)}
		</div>
	)
})

function addRealSpaceForWhitespace(string: string) {
	if (string === '') string = ' '
	return string.replace(/ /g, '\u00a0')
}
