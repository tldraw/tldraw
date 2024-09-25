export {}

// import {
// 	ChangeEvent,
// 	KeyboardEvent,
// 	ReactNode,
// 	useCallback,
// 	useEffect,
// 	useLayoutEffect,
// 	useRef,
// 	useState,
// } from 'react'
// import { useParams } from 'react-router-dom'
// import {
// 	OfflineIndicator,
// 	TLUiTranslationKey,
// 	TldrawUiButton,
// 	TldrawUiButtonIcon,
// 	TldrawUiDropdownMenuContent,
// 	TldrawUiDropdownMenuGroup,
// 	TldrawUiDropdownMenuItem,
// 	TldrawUiDropdownMenuRoot,
// 	TldrawUiDropdownMenuTrigger,
// 	TldrawUiKbd,
// 	preventDefault,
// 	stopEventPropagation,
// 	track,
// 	useActions,
// 	useBreakpoint,
// 	useEditor,
// 	useToasts,
// 	useTranslation,
// 	useValue,
// } from 'tldraw'
// import { getShareUrl } from '../../../components/ShareMenu'
// import { FORK_PROJECT_ACTION } from '../../../utils/sharing'
// import { SAVE_FILE_COPY_ACTION } from '../../../utils/useFileSystem'
// import { useApp } from '../../hooks/useAppState'
// import { TldrawApp } from '../../utils/TldrawApp'
// import { TldrawAppFileId, TldrawAppFileRecordType } from '../../utils/schema/TldrawAppFile'

// const MAX_TITLE_WIDTH_PX = 420
// const BUTTON_WIDTH = 44
// const STYLE_PANEL_WIDTH = 148
// const MARGIN_BETWEEN_ZONES = 12
// // the maximum amount the people menu will extend from the style panel
// const SQUEEZE_FACTOR = 52

// export function TlaDocumentTopZone({ isOffline }: { isOffline: boolean }) {
// 	const isDocumentNameVisible = useBreakpoint() >= 4

// 	return (
// 		<DocumentTopZoneContainer>
// 			{isDocumentNameVisible && <DocumentNameInner />}
// 			{isOffline && <OfflineIndicator />}
// 		</DocumentTopZoneContainer>
// 	)
// }

// export function DocumentNameInner() {
// 	const actions = useActions()
// 	const forkAction = actions[FORK_PROJECT_ACTION]
// 	const saveFileAction = actions[SAVE_FILE_COPY_ACTION]

// 	const editor = useEditor()
// 	const msg = useTranslation()
// 	const toasts = useToasts()

// 	const isReadonly = useValue('is readonly', () => editor.getInstanceState().isReadonly, [editor])

// 	const [isEditing, setIsEditing] = useState(false)

// 	const onEditStart = useCallback(() => {
// 		setIsEditing(true)
// 	}, [])

// 	const onEditEnd = useCallback(() => {
// 		setIsEditing(false)
// 	}, [])

// 	return (
// 		<div className="tlui-document-name__inner">
// 			<DocumentNameEditor
// 				isReadonly={isReadonly}
// 				isEditing={isEditing}
// 				onEditStart={onEditStart}
// 				onEditEnd={onEditEnd}
// 			/>
// 			<TldrawUiDropdownMenuRoot id="document-name">
// 				<TldrawUiDropdownMenuTrigger>
// 					<TldrawUiButton
// 						type="icon"
// 						className="tlui-document-name__menu tlui-menu__trigger flex-none"
// 					>
// 						<TldrawUiButtonIcon icon="chevron-down" />
// 					</TldrawUiButton>
// 				</TldrawUiDropdownMenuTrigger>
// 				<TldrawUiDropdownMenuContent align="end" alignOffset={4} sideOffset={6}>
// 					<TldrawUiDropdownMenuGroup>
// 						{!isReadonly && (
// 							<TldrawUiDropdownMenuItem>
// 								<TldrawUiButton type="menu" onClick={() => setIsEditing(true)}>
// 									{' '}
// 									<span className={'tlui-button__label' as any}>{msg('action.rename')}</span>
// 								</TldrawUiButton>
// 							</TldrawUiDropdownMenuItem>
// 						)}
// 						<TldrawUiDropdownMenuItem>
// 							<TldrawUiButton
// 								type="menu"
// 								onClick={async () => {
// 									const shareLink = await getShareUrl(
// 										window.location.href,
// 										editor.getInstanceState().isReadonly
// 									)
// 									shareLink && navigator.clipboard.writeText(shareLink)
// 									toasts.addToast({
// 										title: msg('share-menu.copied'),
// 										severity: 'success',
// 									})
// 								}}
// 							>
// 								<span className={'tlui-button__label' as any}>Copy link</span>
// 							</TldrawUiButton>
// 						</TldrawUiDropdownMenuItem>
// 						<TldrawUiDropdownMenuItem>
// 							<TldrawUiButton type="menu" onClick={() => saveFileAction.onSelect('document-name')}>
// 								<span className={'tlui-button__label' as any}>
// 									{msg(saveFileAction.label! as TLUiTranslationKey)}
// 								</span>
// 								{saveFileAction.kbd && <TldrawUiKbd>{saveFileAction.kbd}</TldrawUiKbd>}
// 							</TldrawUiButton>
// 						</TldrawUiDropdownMenuItem>
// 						<TldrawUiDropdownMenuItem>
// 							<TldrawUiButton type="menu" onClick={() => forkAction.onSelect('document-name')}>
// 								<span className={'tlui-button__label' as any}>
// 									{msg(forkAction.label! as TLUiTranslationKey)}
// 								</span>
// 							</TldrawUiButton>
// 						</TldrawUiDropdownMenuItem>
// 					</TldrawUiDropdownMenuGroup>
// 				</TldrawUiDropdownMenuContent>
// 			</TldrawUiDropdownMenuRoot>
// 		</div>
// 	)
// }

// function DocumentTopZoneContainer({ children }: { children: ReactNode }) {
// 	const ref = useRef<HTMLDivElement>(null)
// 	const breakpoint = useBreakpoint()

// 	const updateLayout = useCallback(() => {
// 		const element = ref.current
// 		if (!element) return

// 		const layoutTop = element.parentElement!.parentElement!
// 		const leftPanel = layoutTop.querySelector('.tlui-layout__top__left')! as HTMLElement
// 		const rightPanel = layoutTop.querySelector('.tlui-layout__top__right')! as HTMLElement

// 		const totalWidth = layoutTop.offsetWidth
// 		const leftWidth = leftPanel.offsetWidth
// 		const rightWidth = rightPanel.offsetWidth

// 		// Ignore button width
// 		const selfWidth = element.offsetWidth - BUTTON_WIDTH

// 		let xCoordIfCentered = (totalWidth - selfWidth) / 2

// 		// Prevent subpixel bullsh
// 		if (totalWidth % 2 !== 0) {
// 			xCoordIfCentered -= 0.5
// 		}

// 		const xCoordIfLeftAligned = leftWidth + MARGIN_BETWEEN_ZONES

// 		const left = element.offsetLeft
// 		const maxWidth = Math.min(
// 			totalWidth - rightWidth - leftWidth - 2 * MARGIN_BETWEEN_ZONES,
// 			MAX_TITLE_WIDTH_PX
// 		)
// 		const xCoord = Math.max(xCoordIfCentered, xCoordIfLeftAligned) - left

// 		// Squeeze the title if the right panel is too wide on small screens
// 		if (rightPanel.offsetWidth > STYLE_PANEL_WIDTH && breakpoint <= 6) {
// 			element.style.setProperty('max-width', maxWidth - SQUEEZE_FACTOR + 'px')
// 		} else {
// 			element.style.setProperty('max-width', maxWidth + 'px')
// 		}
// 		element.style.setProperty('transform', `translate(${xCoord}px, 0px)`)
// 	}, [breakpoint])

// 	useLayoutEffect(() => {
// 		const element = ref.current
// 		if (!element) return

// 		const layoutTop = element.parentElement!.parentElement!
// 		const leftPanel = layoutTop.querySelector('.tlui-layout__top__left')! as HTMLElement
// 		const rightPanel = layoutTop.querySelector('.tlui-layout__top__right')! as HTMLElement

// 		// Update layout when the things change
// 		const observer = new ResizeObserver(updateLayout)
// 		observer.observe(leftPanel)
// 		observer.observe(rightPanel)
// 		observer.observe(layoutTop)
// 		observer.observe(element)

// 		// Also update on first layout
// 		updateLayout()

// 		return () => {
// 			observer.disconnect()
// 		}
// 	}, [updateLayout])

// 	// Update after every render, too
// 	useLayoutEffect(() => {
// 		updateLayout()
// 	})

// 	return (
// 		<div ref={ref} className="tlui-top-zone__container">
// 			{children}
// 		</div>
// 	)
// }

// const DocumentNameEditor = track(function DocumentNameEditor({
// 	isEditing,
// 	onEditEnd,
// 	onEditStart,
// 	isReadonly,
// }: {
// 	isEditing: boolean
// 	onEditStart(): void
// 	onEditEnd(): void
// 	isReadonly: boolean
// }) {
// 	const app = useApp()

// 	const { fileId } = useParams() as { fileId: TldrawAppFileId }

// 	const msg = useTranslation()
// 	const defaultDocumentName = msg('document.default-name')

// 	const fileName = useValue(
// 		'file name',
// 		() => {
// 			if (!fileId) return ''

// 			const file = app.store.get(TldrawAppFileRecordType.createId(fileId))
// 			if (!file) throw Error('no file')
// 			return TldrawApp.getFileName(file)
// 		},
// 		[app, fileId]
// 	)

// 	const [workingName, setWorkingName] = useState<string>(fileName)

// 	const inputRef = useRef<HTMLInputElement>(null)
// 	const editor = useEditor()

// 	useEffect(() => {
// 		if (isReadonly) {
// 			onEditEnd()
// 			// setState((prev) => ({ ...prev, isEditing: false }))
// 		}
// 		if (isEditing && inputRef.current) {
// 			inputRef.current.select()
// 		}
// 	}, [isReadonly, onEditEnd, isEditing])

// 	// When editing ends, update the file name
// 	useEffect(() => {
// 		if (!fileId) return

// 		if (!isEditing) {
// 			const trimmedName = workingName.trim()

// 			const file = app.store.get(TldrawAppFileRecordType.createId(fileId))
// 			if (!file) throw Error('no file to update')

// 			if (trimmedName !== file.name) {
// 				app.store.update(file.id, (file) => ({ ...file, name: trimmedName }))
// 				return
// 			}
// 		}
// 	}, [app, fileId, isEditing, workingName])

// 	useEffect(() => {
// 		if (fileName) {
// 			document.title = `${fileName} · tldraw`
// 		} else {
// 			document.title = 'tldraw'
// 		}
// 	}, [fileName])

// 	const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
// 		const value = e.currentTarget.value
// 		setWorkingName(value)
// 	}, [])

// 	const handleKeydownCapture = useCallback(
// 		(e: KeyboardEvent) => {
// 			if (e.key === 'Enter') {
// 				preventDefault(e)
// 				// blur triggers save
// 				inputRef.current?.blur()
// 			} else if (e.key === 'Escape') {
// 				preventDefault(e)
// 				stopEventPropagation(e)
// 				// revert to original name instantly so that when we blur we don't
// 				// trigger a save with the new one
// 				setWorkingName('')
// 				inputRef.current?.blur()
// 				editor.focus()
// 			}
// 		},
// 		[setWorkingName, editor]
// 	)

// 	const name = isEditing ? workingName : fileName

// 	return (
// 		<div className="tlui-document-name__input__wrapper">
// 			{isEditing && (
// 				<input
// 					ref={inputRef}
// 					className="tlui-document-name__input"
// 					value={name}
// 					onChange={handleChange}
// 					onBlur={onEditEnd}
// 					onKeyDownCapture={handleKeydownCapture}
// 					placeholder={defaultDocumentName}
// 					autoFocus
// 				/>
// 			)}
// 			{isEditing ? (
// 				<div
// 					className="tlui-document-name__text tlui-document-name__text__hidden"
// 					// @ts-expect-error
// 					inert=""
// 					aria-hidden
// 				>
// 					{addRealSpaceForWhitespace(name)}
// 				</div>
// 			) : (
// 				<div
// 					className="tlui-document-name__text"
// 					onDoubleClick={() => {
// 						if (isReadonly) return
// 						editor.setEditingShape(null)
// 						onEditStart()
// 					}}
// 				>
// 					{addRealSpaceForWhitespace(name)}
// 				</div>
// 			)}
// 		</div>
// 	)
// })

// function addRealSpaceForWhitespace(string: string) {
// 	if (string === '') string = ' '
// 	return string.replace(/ /g, '\u00a0')
// }
