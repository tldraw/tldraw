import { useCallback, useRef, useState } from 'react'
import {
	Editor,
	FileHelpers,
	TLShape,
	compact,
	debounce,
	exportAs,
	useReactor,
	useValue,
} from 'tldraw'
import { globalEditor } from '../../../utils/globalEditor'
import { useApp } from '../../hooks/useAppState'
import { useAuth } from '../../hooks/useAuth'
import { getCurrentEditor } from '../../utils/getCurrentEditor'
import { TldrawAppUser } from '../../utils/schema/TldrawAppUser'
import { TlaIcon } from '../TlaIcon'
import { TlaSelect } from '../TlaSelect/TlaSelect'
import { TlaSwitch } from '../TlaSwitch/TlaSwitch'
import { TlaTabsPage } from '../TlaTabs/TlaTabs'
import {
	TlaShareMenuControl,
	TlaShareMenuControlGroup,
	TlaShareMenuControlLabel,
	TlaShareMenuHelpItem,
	TlaShareMenuSection,
} from './file-share-menu-primitives'
import styles from './file-share-menu.module.css'

export function TlaShareMenuExportPage() {
	return (
		<TlaTabsPage id="export" className={styles.content}>
			<TlaShareMenuSection>
				<TlaShareMenuControlGroup>
					<ExportBackgroundToggle />
					<ExportPaddingToggle />
					<TlaSelectExportFormat />
				</TlaShareMenuControlGroup>
				<TlaPreviewImage />
				<TlaExportImageButton />
				<TlaShareMenuHelpItem>
					<p>
						A <b>snapshot</b> is a read-only copy of your project in its current state. Use
						snapshots to create backups or to share your work in progress.
					</p>
				</TlaShareMenuHelpItem>
			</TlaShareMenuSection>
		</TlaTabsPage>
	)
}

function ExportBackgroundToggle() {
	const app = useApp()
	const auth = useAuth()
	if (!auth) throw Error('should have auth')

	const { userId } = auth

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
		app.setUserExportPadding(userId, !user.exportPadding)
	}, [app, userId])

	return (
		<TlaShareMenuControl>
			<TlaShareMenuControlLabel>Padding</TlaShareMenuControlLabel>
			<TlaSwitch checked={exportPadding} onChange={handleToggleShared} />
		</TlaShareMenuControl>
	)
}

function ExportPaddingToggle() {
	const app = useApp()
	const auth = useAuth()
	if (!auth) throw Error('should have auth')

	const { userId } = auth

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
		app.setUserExportBackground(userId, !user.exportBackground)
	}, [app, userId])

	return (
		<TlaShareMenuControl>
			<TlaShareMenuControlLabel>Background</TlaShareMenuControlLabel>
			<TlaSwitch checked={exportBackground} onChange={handleToggleShared} />
		</TlaShareMenuControl>
	)
}

function TlaSelectExportFormat() {
	const app = useApp()
	const auth = useAuth()
	if (!auth) throw Error('should have auth')
	const { userId } = auth

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
		},
		[app, userId]
	)

	return (
		<TlaShareMenuControl>
			<TlaShareMenuControlLabel>Export as...</TlaShareMenuControlLabel>
			<TlaSelect
				value={exportFormat}
				label={exportFormat === 'svg' ? 'SVG' : 'PNG'}
				onChange={handleSelectChange}
			>
				<option value="svg">SVG</option>
				<option value="png">PNG</option>
			</TlaSelect>
		</TlaShareMenuControl>
	)
}

function TlaExportImageButton() {
	const app = useApp()

	const [exported, setExported] = useState(false)

	const handleExportLinkClick = useCallback(() => {
		if (exported) {
			return
		}

		const editor = getCurrentEditor()

		if (!editor) return
		const sessionState = app.getSessionState()

		const { auth } = sessionState
		if (!auth) throw Error('expected auth')

		const user = app.getUser(auth.userId)
		if (!user) throw Error('expected user')

		let ids = editor.getSelectedShapeIds()
		if (ids.length === 0) {
			ids = editor.getSortedChildIdsForParent(editor.getCurrentPageId())
		}

		exportAs(editor, ids, user.exportFormat, 'file', {
			padding: user.exportPadding ? editor.options.defaultSvgPadding : 0,
			background: user.exportBackground,
		})

		setExported(true)
		setTimeout(() => setExported(false), 2500)

		return () => {
			setExported(false)
		}
	}, [exported, app])

	return (
		<>
			<button
				className="tla-button tla-button__primary tla-text_ui__medium tla-share-menu__copy-button"
				onClick={handleExportLinkClick}
			>
				<span>Export image</span>
				<TlaIcon icon="export" />
			</button>
		</>
	)
}

function TlaPreviewImage() {
	const app = useApp()
	const ref = useRef<HTMLImageElement>(null)

	const [exportPreviewSize, setExportPreviewSize] = useState<null | string>(null)

	useReactor(
		'update preview',
		() => {
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
				const elm = ref.current
				if (!elm) return
				// We want to use an image element here so that a user can right click and copy / save / drag the qr code
				elm.setAttribute('src', src)
				setExportPreviewSize(`${width.toFixed()}x${height.toFixed()}`)
			})
		},
		[]
	)

	return (
		<div className={styles.exportPreview}>
			<img ref={ref} className={styles.exportPreviewInner} />
			{exportPreviewSize && <span className={styles.exportPreviewSize}>{exportPreviewSize}</span>}
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
		}
	)

	if (!result) return

	const blob = new Blob([result.svg], { type: 'image/svg+xml' })
	const src = await FileHelpers.blobToDataUrl(blob)

	cb({ src, width: result.width, height: result.height })
}

const getEditorImageSlowly = debounce(getEditorImage, 60)
