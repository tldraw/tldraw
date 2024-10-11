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
import { getLocalSessionState } from '../../utils/local-session-state'
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
	const app = useApp()
	const tldrawUser = useTldrawUser()
	if (!tldrawUser) throw Error('should have auth')

	const { id: userId } = tldrawUser
	const user = useValue('user', () => app.getUser(userId)!, [app, userId])

	const onChange = useCallback(
		<T extends keyof TldrawAppUser>(key: T, value: TldrawAppUser[T]) => {
			app.store.update(user.id, (u) => ({ ...u, [key]: value }))
		},
		[user, app]
	)

	return (
		<TlaTabsPage id="export">
			<TlaMenuSection>
				<TlaMenuControlGroup>
					<ExportBackgroundToggle onChange={onChange} value={user.exportBackground} />
					<ExportPaddingToggle onChange={onChange} value={user.exportPadding} />
					<ExportThemeSelect onChange={onChange} value={user.exportTheme} />
					<ExportFormatSelect onChange={onChange} value={user.exportFormat} />
				</TlaMenuControlGroup>
				<ExportPreviewImage />
				<ExportImageButton />
			</TlaMenuSection>
		</TlaTabsPage>
	)
}

function ExportPaddingToggle({
	value,
	onChange,
}: {
	value: TldrawAppUser['exportPadding']
	onChange(key: 'exportPadding', value: TldrawAppUser['exportPadding']): void
}) {
	const raw = useRaw()
	const trackEvent = useTldrawAppUiEvents()

	const handleChange = useCallback(() => {
		const padding = !value
		onChange('exportPadding', padding)
		trackEvent('toggle-export-padding', { padding, source: 'file-share-menu' })
	}, [trackEvent, value, onChange])

	return (
		<TlaMenuControl>
			<TlaMenuControlLabel>{raw('Padding')}</TlaMenuControlLabel>
			<TlaSwitch checked={value} onChange={handleChange} />
		</TlaMenuControl>
	)
}

function ExportBackgroundToggle({
	value,
	onChange,
}: {
	value: TldrawAppUser['exportBackground']
	onChange(key: 'exportBackground', value: TldrawAppUser['exportBackground']): void
}) {
	const raw = useRaw()
	const trackEvent = useTldrawAppUiEvents()

	const handleChange = useCallback(() => {
		const background = !value
		onChange('exportBackground', background)
		trackEvent('toggle-export-background', { background, source: 'file-share-menu' })
	}, [value, onChange, trackEvent])

	return (
		<TlaMenuControl>
			<TlaMenuControlLabel>{raw('Background')}</TlaMenuControlLabel>
			<TlaSwitch checked={value} onChange={handleChange} />
		</TlaMenuControl>
	)
}

function ExportFormatSelect({
	value,
	onChange,
}: {
	value: TldrawAppUser['exportFormat']
	onChange(key: 'exportFormat', value: TldrawAppUser['exportFormat']): void
}) {
	const raw = useRaw()
	const trackEvent = useTldrawAppUiEvents()

	const handleChange = useCallback(
		(value: TldrawAppUser['exportFormat']) => {
			onChange('exportFormat', value)
			trackEvent('set-export-format', { format: value, source: 'file-share-menu' })
		},
		[onChange, trackEvent]
	)

	return (
		<TlaMenuControl>
			<TlaMenuControlLabel>{raw('Export as')}</TlaMenuControlLabel>
			<TlaSelect value={value} label={value === 'svg' ? 'SVG' : 'PNG'} onChange={handleChange}>
				<option value="svg">{raw('SVG')}</option>
				<option value="png">{raw('PNG')}</option>
			</TlaSelect>
		</TlaMenuControl>
	)
}

function ExportThemeSelect({
	value,
	onChange,
}: {
	value: TldrawAppUser['exportTheme']
	onChange(key: 'exportTheme', value: TldrawAppUser['exportTheme']): void
}) {
	const raw = useRaw()
	const trackEvent = useTldrawAppUiEvents()
	const handleChange = useCallback(
		(value: TldrawAppUser['exportTheme']) => {
			onChange('exportTheme', value)
			trackEvent('set-export-theme', { theme: value, source: 'file-share-menu' })
		},
		[onChange, trackEvent]
	)

	return (
		<TlaMenuControl>
			<TlaMenuControlLabel>{raw('Theme')}</TlaMenuControlLabel>
			<TlaSelect
				value={value}
				label={value[0].toLocaleUpperCase() + value.slice(1)}
				onChange={handleChange}
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

	const handleClick = useCallback(() => {
		if (exported) return

		const editor = getCurrentEditor()

		if (!editor) return
		const sessionState = getLocalSessionState()

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
			<TlaButton className="tla-share-menu__copy-button" onClick={handleClick} iconRight="export">
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

			const sessionState = getLocalSessionState()

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
