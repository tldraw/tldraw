import {
	Button,
	DropdownMenu,
	OfflineIndicator,
	TLDocument,
	track,
	useActions,
	useBreakpoint,
	useEditor,
	useTranslation,
} from '@tldraw/tldraw'
import classNames from 'classnames'
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
import { FORK_PROJECT_ACTION, SHARE_PROJECT_ACTION } from '../../utils/sharing'

type NameState = {
	readonly name: string | null
	readonly isEditing: boolean
	readonly saving: 'saving' | 'saved' | null
}

const MAX_TITLE_WIDTH_PX = 420

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

function DocumentNameInner() {
	const [state, setState] = useState<NameState>({ name: null, isEditing: false, saving: null })
	const actions = useActions()
	const fork = actions[FORK_PROJECT_ACTION]
	const share = actions[SHARE_PROJECT_ACTION]
	const msg = useTranslation()

	return (
		<div className="tlui-document-name__inner" data-testid="document-name">
			<DocumentNameEditor state={state} setState={setState} />
			<DropdownMenu.Root id="document name">
				<DropdownMenu.Trigger>
					<Button
						type="icon"
						icon="chevron-down"
						className={classNames('tlui-document-name__menu tlui-menu__trigger flex-none')}
						data-testid="document-name-menu"
						data-state={state.saving ?? 'ready'}
					/>
				</DropdownMenu.Trigger>
				<DropdownMenu.Content align="end" alignOffset={0} sideOffset={6}>
					<DropdownMenu.Group>
						<DropdownMenu.Item
							type="menu"
							onClick={() => {
								share.onSelect('document-name')
							}}
						>
							<span className={'tlui-button__label' as any}>{msg(share.label!)}</span>
						</DropdownMenu.Item>
						<DropdownMenu.Item type="menu" onClick={() => fork.onSelect('document-name')}>
							<span className={'tlui-button__label' as any}>
								{msg(fork.label!)}
								{/* Rename */}
								{/* {msg('document.rename')} */}
							</span>
						</DropdownMenu.Item>
						<DropdownMenu.Item
							type="menu"
							onClick={() => setState((prev) => ({ ...prev, isEditing: true }))}
						>
							<span className={'tlui-button__label' as any}>
								Rename
								{/* {msg('document.rename')} */}
							</span>
						</DropdownMenu.Item>
					</DropdownMenu.Group>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</div>
	)
}

function DocumentTopZoneContainer({ children }: { children: ReactNode }) {
	const ref = useRef<HTMLDivElement>(null)

	const updateLayout = useCallback(() => {
		const element = ref.current
		if (!element) return

		const layoutTop = element.parentElement!.parentElement!
		const leftPanel = layoutTop.querySelector('.tlui-layout__top__left')! as HTMLElement
		const rightPanel = layoutTop.querySelector('.tlui-layout__top__right')! as HTMLElement

		const totalWidth = layoutTop.offsetWidth
		const leftWidth = leftPanel.offsetWidth
		const rightWidth = rightPanel.offsetWidth
		// ignore the width of the button:
		const selfWidth = element.offsetWidth - 44

		let xCoordIfCentered = (totalWidth - selfWidth) / 2

		// Prevent subpixel bullsh
		if (totalWidth % 2 !== 0) {
			xCoordIfCentered -= 0.5
		}

		const xCoordIfLeftAligned = leftWidth + 12
		const xCoord = Math.max(xCoordIfCentered, xCoordIfLeftAligned)
		const maxWidth = Math.min(totalWidth - rightWidth - leftWidth - 16, MAX_TITLE_WIDTH_PX)

		// element.style.setProperty('transform', `translate(${xCoord}px, 0px)`)
		element.style.setProperty('max-width', maxWidth + 'px')
	}, [])

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

function getName(state: NameState, document: TLDocument) {
	let name = state.name
	if (!name) {
		if (document.name === '') {
			name = 'Untitled'
		} else {
			name = document.name
		}
	}
	return name
}

function DocumentNameEditor({
	state,
	setState,
}: {
	state: NameState
	setState: (update: SetStateAction<NameState>) => void
}) {
	// const { raw } = useClientTranslation()
	const inputRef = useRef<HTMLInputElement>(null)
	const editor = useEditor()
	const document = editor.getDocumentSettings()

	useEffect(() => {
		if (state.isEditing && inputRef.current) {
			inputRef.current.select()
		}
	}, [state.isEditing])

	// const { mutate } = useRpcMutation('updateDocument')

	useEffect(() => {
		let isCancelled = false
		let timeout: NodeJS.Timeout | null = null

		const save = () => {
			if (state.name === null) return
			const trimmed = state.name.trim()
			if (!trimmed || trimmed === document.name.trim()) {
				if (!state.isEditing) setState((prev) => ({ ...prev, name: null }))
				return
			}

			setState((prev) => ({ ...prev, saving: 'saving' }))

			editor.updateDocumentSettings({ name: trimmed })
			console.log('updating to', trimmed)
			setState((prev) => ({ ...prev, saving: 'saved', name: null }))
		}

		if (state.isEditing === false) {
			save()
		} else {
			setState((prev) => ({ ...prev, saving: prev.saving === 'saving' ? null : prev.saving }))
			timeout = setTimeout(save, 1000)
		}

		return () => {
			if (timeout !== null) clearTimeout(timeout)
			isCancelled = true
		}
	}, [document.name, editor, state.isEditing, state.name, setState])

	useEffect(() => {
		if (state.saving !== 'saved') return
		const timeout = setTimeout(() => {
			setState((prev) => ({ ...prev, saving: null }))
		}, 3000)
		return () => clearTimeout(timeout)
	}, [state.saving, setState])

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
				e.preventDefault()
				// blur triggers save
				inputRef.current?.blur()
			} else if (e.key === 'Escape') {
				e.preventDefault()
				// revert to original name instantly so that when we blur we don't
				// trigger a save with the new one
				setState((prev) => ({ ...prev, name: null }))
				inputRef.current?.blur()
			}
		},
		[setState]
	)

	const handleBlur = useCallback(() => {
		setState((prev) => ({ ...prev, isEditing: false }))
	}, [setState])

	const name = getName(state, document)

	return (
		<div className="tlui-document-name__input__wrapper">
			{state.isEditing && (
				<input
					ref={inputRef}
					data-testid="document-name-input"
					className="tlui-document-name__input"
					value={state.name ?? document.name}
					onChange={handleChange}
					onBlur={handleBlur}
					onKeyDownCapture={handleKeydownCapture}
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
					{addRealSpaceForWhitespace(name) || ' '}
					{/* {raw(addRealSpaceForWhitespace(state.name ?? document.name) || ' ')} */}
				</div>
			) : (
				<div
					className="tlui-document-name__text"
					onDoubleClick={() => setState((prev) => ({ ...prev, isEditing: true }))}
					data-testid="document-name-text"
				>
					{/* {raw(addRealSpaceForWhitespace(state.name ?? document.name) || ' ')} */}
					{addRealSpaceForWhitespace(name) || ' '}
				</div>
			)}
		</div>
	)
}

function addRealSpaceForWhitespace(string: string) {
	if (string === '') string = ' '
	return string.replace(/ /g, '\u00a0')
}
