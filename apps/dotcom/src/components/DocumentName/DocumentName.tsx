import {
	ChangeEvent,
	KeyboardEvent,
	ReactNode,
	SetStateAction,
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from 'react'
import {
	OfflineIndicator,
	TLUiTranslationKey,
	TldrawUiButton,
	TldrawUiButtonIcon,
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuGroup,
	TldrawUiDropdownMenuItem,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
	TldrawUiKbd,
	preventDefault,
	stopEventPropagation,
	track,
	useActions,
	useBreakpoint,
	useEditor,
	useTranslation,
} from 'tldraw'
import { FORK_PROJECT_ACTION } from '../../utils/sharing'
import { SAVE_FILE_COPY_ACTION } from '../../utils/useFileSystem'
import { getShareUrl } from '../ShareMenu'

interface NameState {
	readonly name: string | null
	readonly isEditing: boolean
}

const MAX_TITLE_WIDTH_PX = 420
const BUTTON_WIDTH = 44
const STYLE_PANEL_WIDTH = 148
const MARGIN_BETWEEN_ZONES = 12
// the maximum amount the people menu will extend from the style panel
const SQUEEZE_FACTOR = 52

export const DocumentTopZone = track(function DocumentTopZone({
	isOffline,
}: {
	isOffline: boolean
}) {
	const isDocumentNameVisible = useBreakpoint() >= 4

	return (
		<DocumentTopZoneContainer>
			{isDocumentNameVisible && <DocumentNameInner />}
			{isOffline && <OfflineIndicator />}
		</DocumentTopZoneContainer>
	)
})

export const DocumentNameInner = track(function DocumentNameInner() {
	const [state, setState] = useState<NameState>({ name: null, isEditing: false })
	const actions = useActions()
	const forkAction = actions[FORK_PROJECT_ACTION]
	const saveFileAction = actions[SAVE_FILE_COPY_ACTION]
	const editor = useEditor()
	const msg = useTranslation()

	return (
		<div className="tlui-document-name__inner">
			<DocumentNameEditor state={state} setState={setState} />
			<TldrawUiDropdownMenuRoot id="document-name">
				<TldrawUiDropdownMenuTrigger>
					<TldrawUiButton
						type="icon"
						className="tlui-document-name__menu tlui-menu__trigger flex-none"
					>
						<TldrawUiButtonIcon icon="chevron-down" />
					</TldrawUiButton>
				</TldrawUiDropdownMenuTrigger>
				<TldrawUiDropdownMenuContent align="end" alignOffset={4} sideOffset={6}>
					<TldrawUiDropdownMenuGroup>
						<TldrawUiDropdownMenuItem>
							<TldrawUiButton
								type="menu"
								onClick={() => setState((prev) => ({ ...prev, isEditing: true }))}
							>
								{' '}
								<span className={'tlui-button__label' as any}>{msg('action.rename')}</span>
							</TldrawUiButton>
						</TldrawUiDropdownMenuItem>
						<TldrawUiDropdownMenuItem>
							<TldrawUiButton
								type="menu"
								onClick={() => {
									const shareLink = getShareUrl(
										window.location.href,
										editor.getInstanceState().isReadonly
									)
									navigator.clipboard.writeText(shareLink)
								}}
							>
								<span className={'tlui-button__label' as any}>Copy link</span>
							</TldrawUiButton>
						</TldrawUiDropdownMenuItem>
						<TldrawUiDropdownMenuItem>
							<TldrawUiButton type="menu" onClick={() => saveFileAction.onSelect('document-name')}>
								<span className={'tlui-button__label' as any}>
									{msg(saveFileAction.label! as TLUiTranslationKey)}
								</span>
								{saveFileAction.kbd && <TldrawUiKbd>{saveFileAction.kbd}</TldrawUiKbd>}
							</TldrawUiButton>
						</TldrawUiDropdownMenuItem>
						<TldrawUiDropdownMenuItem>
							<TldrawUiButton type="menu" onClick={() => forkAction.onSelect('document-name')}>
								<span className={'tlui-button__label' as any}>
									{msg(forkAction.label! as TLUiTranslationKey)}
								</span>
							</TldrawUiButton>
						</TldrawUiDropdownMenuItem>
					</TldrawUiDropdownMenuGroup>
				</TldrawUiDropdownMenuContent>
			</TldrawUiDropdownMenuRoot>
		</div>
	)
})

function DocumentTopZoneContainer({ children }: { children: ReactNode }) {
	const ref = useRef<HTMLDivElement>(null)
	const breakpoint = useBreakpoint()

	const updateLayout = useCallback(() => {
		const element = ref.current
		if (!element) return

		const layoutTop = element.parentElement!.parentElement!
		const leftPanel = layoutTop.querySelector('.tlui-layout__top__left')! as HTMLElement
		const rightPanel = layoutTop.querySelector('.tlui-layout__top__right')! as HTMLElement

		const totalWidth = layoutTop.offsetWidth
		const leftWidth = leftPanel.offsetWidth
		const rightWidth = rightPanel.offsetWidth

		// Ignore button width
		const selfWidth = element.offsetWidth - BUTTON_WIDTH

		let xCoordIfCentered = (totalWidth - selfWidth) / 2

		// Prevent subpixel bullsh
		if (totalWidth % 2 !== 0) {
			xCoordIfCentered -= 0.5
		}

		const xCoordIfLeftAligned = leftWidth + MARGIN_BETWEEN_ZONES

		const left = element.offsetLeft
		const maxWidth = Math.min(
			totalWidth - rightWidth - leftWidth - 2 * MARGIN_BETWEEN_ZONES,
			MAX_TITLE_WIDTH_PX
		)
		const xCoord = Math.max(xCoordIfCentered, xCoordIfLeftAligned) - left

		// Squeeze the title if the right panel is too wide on small screens
		if (rightPanel.offsetWidth > STYLE_PANEL_WIDTH && breakpoint <= 6) {
			element.style.setProperty('max-width', maxWidth - SQUEEZE_FACTOR + 'px')
		} else {
			element.style.setProperty('max-width', maxWidth + 'px')
		}
		element.style.setProperty('transform', `translate(${xCoord}px, 0px)`)
	}, [breakpoint])

	useLayoutEffect(() => {
		const element = ref.current
		if (!element) return

		const layoutTop = element.parentElement!.parentElement!
		const leftPanel = layoutTop.querySelector('.tlui-layout__top__left')! as HTMLElement
		const rightPanel = layoutTop.querySelector('.tlui-layout__top__right')! as HTMLElement

		// Update layout when the things change
		const observer = new ResizeObserver(updateLayout)
		observer.observe(leftPanel)
		observer.observe(rightPanel)
		observer.observe(layoutTop)
		observer.observe(element)

		// Also update on first layout
		updateLayout()

		return () => {
			observer.disconnect()
		}
	}, [updateLayout])

	// Update after every render, too
	useLayoutEffect(() => {
		updateLayout()
	})

	return (
		<div ref={ref} className="tlui-top-zone__container">
			{children}
		</div>
	)
}

const DocumentNameEditor = track(function DocumentNameEditor({
	state,
	setState,
}: {
	state: NameState
	setState: (update: SetStateAction<NameState>) => void
}) {
	const inputRef = useRef<HTMLInputElement>(null)
	const editor = useEditor()
	const documentSettings = editor.getDocumentSettings()
	const msg = useTranslation()
	const defaultDocumentName = msg('document.default-name')

	useEffect(() => {
		if (state.isEditing && inputRef.current) {
			inputRef.current.select()
		}
	}, [state.isEditing])

	useEffect(() => {
		const save = () => {
			if (state.name === null) return
			const trimmed = state.name.trim()
			if (trimmed === documentSettings.name.trim()) {
				if (!state.isEditing) setState((prev) => ({ ...prev, name: null }))
				return
			}

			editor.updateDocumentSettings({ name: trimmed })
		}

		if (!state.isEditing) {
			save()
		}
	}, [documentSettings.name, editor, state.isEditing, state.name, setState])

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
				editor.getContainer().focus()
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
