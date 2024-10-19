import { TldrawAppUser } from '@tldraw/dotcom-shared'
import classNames from 'classnames'
import { useCallback, useRef, useState } from 'react'
import {
	Editor,
	FileHelpers,
	TLImageExportOptions,
	TLShape,
	compact,
	debounce,
	exportAs,
	useReactor,
	useValue,
} from 'tldraw'
import { globalEditor } from '../../../utils/globalEditor'
import { useApp } from '../../hooks/useAppState'
import { useRaw } from '../../hooks/useRaw'
import { useTldrawUser } from '../../hooks/useUser'
import { useTldrawAppUiEvents } from '../../utils/app-ui-events'
import { getCurrentEditor } from '../../utils/getCurrentEditor'
import { TlaButton } from '../TlaButton/TlaButton'
import { TlaSelect } from '../TlaSelect/TlaSelect'
import { TlaSwitch } from '../TlaSwitch/TlaSwitch'
import { TlaTabsPage } from '../TlaTabs/TlaTabs'
import {
	TlaMenuControl,
	TlaMenuControlGroup,
	TlaMenuControlLabel,
	TlaMenuSection,
} from '../tla-menu/tla-menu'
import styles from './file-share-menu.module.css'

export function TlaShareMenuExportPage() {
	return (
		<TlaTabsPage id="export">
			<TlaMenuSection>
				<TlaMenuControlGroup>
					<ExportBackgroundToggle />
					<ExportPaddingToggle />
					<ExportThemeSelect />
					<ExportFormatSelect />
				</TlaMenuControlGroup>
				<ExportPreviewImage />
				<ExportImageButton />
			</TlaMenuSection>
		</TlaTabsPage>
	)
}

function ExportBackgroundToggle() {
	const app = useApp()
	const raw = useRaw()
	const user = useTldrawUser()
	const trackEvent = useTldrawAppUiEvents()
	if (!user) throw Error('should have auth')

	const { id: userId } = user

	const exportPadding = useValue(
		'export format',
		() => {
			const user = app.getUser(userId)
			if (!user) throw Error('no user')
			return user.exportPadding
		},
		[app, userId]
	)

	const handleToggleShared = useCallback(() => {
		const user = app.getUser(userId)
		if (!user) throw Error('no user')
		const padding = !user.exportPadding
		app.setUserExportPadding(userId, padding)
		trackEvent('toggle-export-padding', { padding, source: 'file-share-menu' })
	}, [app, userId, trackEvent])

	return (
		<TlaMenuControl>
			<TlaMenuControlLabel>{raw('Padding')}</TlaMenuControlLabel>
			<TlaSwitch checked={exportPadding} onChange={handleToggleShared} />
		</TlaMenuControl>
	)
}

function ExportPaddingToggle() {
	const app = useApp()
	const raw = useRaw()
	const user = useTldrawUser()
	const trackEvent = useTldrawAppUiEvents()
	if (!user) throw Error('should have auth')

	const { id: userId } = user

	const exportBackground = useValue(
		'export format',
		() => {
			const user = app.getUser(userId)
			if (!user) throw Error('no user')
			return user.exportBackground
		},
		[app, userId]
	)

	const handleToggleShared = useCallback(() => {
		const user = app.getUser(userId)
		if (!user) throw Error('no user')
		const background = !user.exportBackground
		app.setUserExportBackground(userId, background)
		trackEvent('toggle-export-background', { background, source: 'file-share-menu' })
	}, [app, userId, trackEvent])

	return (
		<TlaMenuControl>
			<TlaMenuControlLabel>{raw('Background')}</TlaMenuControlLabel>
			<TlaSwitch checked={exportBackground} onChange={handleToggleShared} />
		</TlaMenuControl>
	)
}

function ExportFormatSelect() {
	const app = useApp()
	const raw = useRaw()
	const user = useTldrawUser()
	const trackEvent = useTldrawAppUiEvents()
	if (!user) throw Error('should have auth')
	const { id: userId } = user

	const exportFormat = useValue(
		'export format',
		() => {
			const user = app.getUser(userId)
			if (!user) throw Error('no user')
			return user.exportFormat
		},
		[app, userId]
	)

	const handleSelectChange = useCallback(
		(value: TldrawAppUser['exportFormat']) => {
			app.setUserExportFormat(userId, value)
			trackEvent('set-export-format', { format: value, source: 'file-share-menu' })
		},
		[app, userId, trackEvent]
	)

	return (
		<TlaMenuControl>
			<TlaMenuControlLabel>{raw('Export as')}</TlaMenuControlLabel>
			<TlaSelect
				value={exportFormat}
				label={exportFormat === 'svg' ? 'SVG' : 'PNG'}
				onChange={handleSelectChange}
			>
				<option value="svg">{raw('SVG')}</option>
				<option value="png">{raw('PNG')}</option>
			</TlaSelect>
		</TlaMenuControl>
	)
}

function ExportThemeSelect() {
	const app = useApp()
	const raw = useRaw()
	const user = useTldrawUser()
	const trackEvent = useTldrawAppUiEvents()
	if (!user) throw Error('should have auth')
	const { id: userId } = user

	const exportTheme = useValue(
		'export format',
		() => {
			const user = app.getUser(userId)
			if (!user) throw Error('no user')
			return user.exportTheme
		},
		[app, userId]
	)

	const handleSelectChange = useCallback(
		(value: TldrawAppUser['exportTheme']) => {
			app.setUserExportTheme(userId, value)
			trackEvent('set-export-theme', { theme: value, source: 'file-share-menu' })
		},
		[app, userId, trackEvent]
	)

	return (
		<TlaMenuControl>
			<TlaMenuControlLabel>{raw('Theme')}</TlaMenuControlLabel>
			<TlaSelect
				value={exportTheme}
				label={exportTheme[0].toLocaleUpperCase() + exportTheme.slice(1)}
				onChange={handleSelectChange}
			>
				<option value="auto">{raw('Auto')}</option>
				<option value="light">{raw('Light')}</option>
				<option value="dark">{raw('Dark')}</option>
			</TlaSelect>
		</TlaMenuControl>
	)
}

function ExportImageButton() {
	const app = useApp()
	const raw = useRaw()
	const trackEvent = useTldrawAppUiEvents()

	const [exported, setExported] = useState(false)

	const handleExportLinkClick = useCallback(() => {
		if (exported) return

		const editor = getCurrentEditor()

		if (!editor) return
		const sessionState = app.getSessionState()

		const { auth } = sessionState
		if (!auth) throw Error('expected auth')

		const user = app.getUser(auth.userId)
		if (!user) throw Error('expected user')

		let fullPage = false

		let ids = editor.getSelectedShapeIds()
		if (ids.length === 0) {
			fullPage = true
			ids = editor.getSortedChildIdsForParent(editor.getCurrentPageId())
		}

		const opts: TLImageExportOptions = {
			padding: user.exportPadding ? editor.options.defaultSvgPadding : 0,
			background: user.exportBackground,
			darkMode: user.exportTheme === 'auto' ? undefined : user.exportTheme === 'dark',
		}

		exportAs(editor, ids, user.exportFormat, 'file', opts)

		trackEvent('export-image', {
			source: 'file-share-menu',
			fullPage,
			padding: user.exportPadding,
			background: !!opts.background,
			theme: user.exportTheme,
			format: user.exportFormat,
		})

		setExported(true)
		setTimeout(() => setExported(false), 2500)

		return () => {
			setExported(false)
		}
	}, [exported, trackEvent, app])

	return (
		<>
			<TlaButton
				className="tla-share-menu__copy-button"
				onClick={handleExportLinkClick}
				iconRight="export"
			>
				{raw('Export image')}
			</TlaButton>
		</>
	)
}

function ExportPreviewImage() {
	const app = useApp()
	const raw = useRaw()
	const ref = useRef<HTMLImageElement>(null)

	const [exportPreviewSize, setExportPreviewSize] = useState<null | string[]>(null)

	useReactor(
		'update preview',
		() => {
			let cancelled = false

			const editor = globalEditor.get()
			if (!editor) return

			const sessionState = app.getSessionState()

			const { auth } = sessionState
			if (!auth) throw Error('expected auth')

			const user = app.getUser(auth.userId)
			if (!user) throw Error('expected user')

			// We need shapes here so that the reactor updates when selected shapes change
			let shapes = editor.getSelectedShapes()
			if (shapes.length === 0) {
				shapes = compact(
					editor
						.getSortedChildIdsForParent(editor.getCurrentPageId())
						.map((s) => editor.getShape(s))
				)
			}

			if (shapes.length === 0) {
				const elm = ref.current
				if (!elm) return
				elm.setAttribute('src', '')
				setExportPreviewSize(null)
				return
			}

			// while lots of shapes are selected, debounce a little so that the thread doesn't freeze when editing the page
			const fn = shapes.length > 20 ? getEditorImageSlowly : getEditorImage

			fn(editor, shapes, user, ({ src, width, height }) => {
				if (cancelled) return
				const elm = ref.current
				if (!elm) return
				// We want to use an image element here so that a user can right click and copy / save / drag the qr code
				elm.setAttribute('src', src)
				setExportPreviewSize([width.toFixed(), height.toFixed()])
			})

			return () => {
				cancelled = true
			}
		},
		[]
	)

	return (
		<div className={styles.exportPreview}>
			<img ref={ref} className={styles.exportPreviewInner} />
			{exportPreviewSize && (
				<div className={classNames(styles.exportPreviewSize, 'tla-text_ui__small')}>
					{raw(`${exportPreviewSize[0]}×${exportPreviewSize[1]}`)}
				</div>
			)}
		</div>
	)
}

async function getEditorImage(
	editor: Editor,
	shapes: TLShape[],
	user: TldrawAppUser,
	cb: (info: { src: string; width: number; height: number }) => void
) {
	const result = await editor.getSvgString(
		shapes.map((s) => s.id),
		{
			padding: user.exportPadding ? editor.options.defaultSvgPadding : 0,
			background: user.exportBackground,
			darkMode: user.exportTheme === 'auto' ? undefined : user.exportTheme === 'dark',
		}
	)

	if (!result) return

	const blob = new Blob([result.svg], { type: 'image/svg+xml' })
	const src = await FileHelpers.blobToDataUrl(blob)

	cb({ src, width: result.width, height: result.height })
}

const getEditorImageSlowly = debounce(getEditorImage, 60)
