import classNames from 'classnames'
import { useCallback, useRef, useState } from 'react'
import {
	Box,
	Editor,
	FileHelpers,
	TLExportType,
	TLShape,
	compact,
	debounce,
	exportAs,
	useReactor,
	useValue,
} from 'tldraw'
import { globalEditor } from '../../../../utils/globalEditor'
import { TldrawApp } from '../../../app/TldrawApp'
import { useMaybeApp } from '../../../hooks/useAppState'
import { useTldrawAppUiEvents } from '../../../utils/app-ui-events'
import { getCurrentEditor } from '../../../utils/getCurrentEditor'
import { F, defineMessages, useMsg } from '../../../utils/i18n'
import {
	TldrawAppSessionState,
	getLocalSessionState,
	updateLocalSessionState,
} from '../../../utils/local-session-state'
import { TlaButton } from '../../TlaButton/TlaButton'
import {
	TlaMenuControl,
	TlaMenuControlGroup,
	TlaMenuControlLabel,
	TlaMenuSection,
	TlaMenuSelect,
	TlaMenuSwitch,
} from '../../tla-menu/tla-menu'
import styles from '../file-share-menu.module.css'

export function TlaExportTab() {
	const app = useMaybeApp()

	const preferences = useValue('preferences', () => getExportPreferences(app), [app])

	const onChange = useCallback(
		<T extends keyof TldrawAppSessionState['exportSettings']>(
			key: T,
			value: TldrawAppSessionState['exportSettings'][T]
		) => {
			if (app) {
				app.updateUserExportPreferences({ [key]: value })
			} else {
				updateLocalSessionState((s) => ({ exportSettings: { ...s.exportSettings, [key]: value } }))
			}
		},
		[app]
	)

	const { exportPadding, exportBackground, exportTheme, exportFormat } = preferences

	return (
		<TlaMenuSection>
			<TlaMenuControlGroup>
				<ExportBackgroundToggle onChange={onChange} value={exportBackground} />
				<ExportPaddingToggle onChange={onChange} value={exportPadding} />
				<ExportThemeSelect onChange={onChange} value={exportTheme} />
				<ExportFormatSelect onChange={onChange} value={exportFormat} />
			</TlaMenuControlGroup>
			<ExportPreviewImage />
			<ExportImageButton />
		</TlaMenuSection>
	)
}

function ExportPaddingToggle({
	value,
	onChange,
}: {
	value: TldrawAppSessionState['exportSettings']['exportPadding']
	onChange(
		key: 'exportPadding',
		value: TldrawAppSessionState['exportSettings']['exportPadding']
	): void
}) {
	const trackEvent = useTldrawAppUiEvents()

	const handleChange = useCallback(() => {
		const padding = !value
		onChange('exportPadding', padding)
		trackEvent('toggle-export-padding', { padding, source: 'file-share-menu' })
	}, [trackEvent, value, onChange])

	return (
		<TlaMenuControl>
			<TlaMenuControlLabel htmlFor="tla-export-padding-switch">
				<F defaultMessage="Padding" />
			</TlaMenuControlLabel>
			<TlaMenuSwitch id="tla-export-padding-switch" checked={value} onChange={handleChange} />
		</TlaMenuControl>
	)
}

function ExportBackgroundToggle({
	value,
	onChange,
}: {
	value: TldrawAppSessionState['exportSettings']['exportBackground']
	onChange(
		key: 'exportBackground',
		value: TldrawAppSessionState['exportSettings']['exportBackground']
	): void
}) {
	const trackEvent = useTldrawAppUiEvents()

	const handleChange = useCallback(() => {
		const background = !value
		onChange('exportBackground', background)
		trackEvent('toggle-export-background', { background, source: 'file-share-menu' })
	}, [value, onChange, trackEvent])

	return (
		<TlaMenuControl>
			<TlaMenuControlLabel htmlFor="tla-export-background-switch">
				<F defaultMessage="Background" />
			</TlaMenuControlLabel>
			<TlaMenuSwitch id="tla-export-background-switch" checked={value} onChange={handleChange} />
		</TlaMenuControl>
	)
}

function ExportFormatSelect({
	value,
	onChange,
}: {
	value: TldrawAppSessionState['exportSettings']['exportFormat']
	onChange(
		key: 'exportFormat',
		value: TldrawAppSessionState['exportSettings']['exportFormat']
	): void
}) {
	const trackEvent = useTldrawAppUiEvents()

	const handleChange = useCallback(
		(value: TldrawAppSessionState['exportSettings']['exportFormat']) => {
			onChange('exportFormat', value)
			trackEvent('set-export-format', { format: value, source: 'file-share-menu' })
		},
		[onChange, trackEvent]
	)

	return (
		<TlaMenuControl>
			<TlaMenuControlLabel htmlFor="tla-export-format-select">
				<F defaultMessage="Export as" />
			</TlaMenuControlLabel>
			<TlaMenuSelect
				id="tla-export-format-select"
				value={value}
				label={value === 'svg' ? 'SVG' : 'PNG'}
				onChange={handleChange}
				options={[
					{ value: 'svg', label: <F defaultMessage="SVG" /> },
					{ value: 'png', label: <F defaultMessage="PNG" /> },
				]}
			/>
		</TlaMenuControl>
	)
}

const messages = defineMessages({
	auto: { defaultMessage: 'Auto' },
	light: { defaultMessage: 'Light' },
	dark: { defaultMessage: 'Dark' },
})

function ExportThemeSelect({
	value,
	onChange,
}: {
	value: TldrawAppSessionState['exportSettings']['exportTheme']
	onChange(key: 'exportTheme', value: TldrawAppSessionState['exportSettings']['exportTheme']): void
}) {
	const label = useMsg(messages[value as 'auto' | 'light' | 'dark'])
	const trackEvent = useTldrawAppUiEvents()
	const handleChange = useCallback(
		(value: TldrawAppSessionState['exportSettings']['exportTheme']) => {
			onChange('exportTheme', value)
			trackEvent('set-export-theme', { theme: value, source: 'file-share-menu' })
		},
		[onChange, trackEvent]
	)

	return (
		<TlaMenuControl>
			<TlaMenuControlLabel htmlFor="tla-export-theme-select">
				<F defaultMessage="Theme" />
			</TlaMenuControlLabel>
			<TlaMenuSelect
				id="tla-export-theme-select"
				value={value}
				label={label}
				onChange={handleChange}
				options={[
					{ value: 'auto', label: <F defaultMessage="Auto" /> },
					{ value: 'light', label: <F defaultMessage="Light" /> },
					{ value: 'dark', label: <F defaultMessage="Dark" /> },
				]}
			/>
		</TlaMenuControl>
	)
}

function ExportImageButton() {
	const app = useMaybeApp()
	const trackEvent = useTldrawAppUiEvents()

	const [exported, setExported] = useState(false)

	const handleClick = useCallback(() => {
		if (exported) return

		const editor = getCurrentEditor()
		if (!editor) return

		const { exportPadding, exportBackground, exportTheme, exportFormat } = getExportPreferences(app)

		let fullPage = false

		let ids = editor.getSelectedShapeIds()
		if (ids.length === 0) {
			fullPage = true
			ids = editor.getSortedChildIdsForParent(editor.getCurrentPageId())
		}

		const opts = {
			padding: exportPadding ? editor.options.defaultSvgPadding : 0,
			background: exportBackground,
			darkMode: exportTheme === 'auto' ? undefined : exportTheme === 'dark',
			format: exportFormat as TLExportType,
		}

		exportAs(editor, ids, opts)

		trackEvent('export-image', {
			source: 'file-share-menu',
			fullPage,
			padding: exportPadding,
			background: !!opts.background,
			theme: exportTheme,
			format: exportFormat,
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
				<F defaultMessage="Export image" />
			</TlaButton>
		</>
	)
}

function ExportPreviewImage() {
	const app = useMaybeApp()
	const ref = useRef<HTMLImageElement>(null)

	const rImagePreviewSize = useRef<HTMLDivElement>(null)

	useReactor(
		'update preview',
		() => {
			let cancelled = false

			const editor = globalEditor.get()
			if (!editor) return

			const preferences = getExportPreferences(app)

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
				const sizeElm = rImagePreviewSize.current
				if (sizeElm) sizeElm.textContent = ''
				return
			}

			// while lots of shapes are selected, debounce a little so that the thread doesn't freeze when editing the page
			const fn = shapes.length > 20 ? getEditorImageSlowly : getEditorImage

			fn(editor, shapes, preferences, ({ src, width, height }) => {
				if (cancelled) return
				const elm = ref.current
				if (!elm) return
				// We want to use an image element here so that a user can right click and copy / save / drag the qr code
				elm.setAttribute('src', src)
				const sizeElm = rImagePreviewSize.current
				if (sizeElm) sizeElm.textContent = `${width.toFixed()}×${height.toFixed()}`
			})

			return () => {
				cancelled = true
			}
		},
		[]
	)

	return (
		<div className={styles.fileShareMenuExportPreview}>
			<img ref={ref} className={styles.fileShareMenuExportPreviewInner} />
			<div
				ref={rImagePreviewSize}
				className={classNames(styles.fileShareMenuExportPreviewSize, 'tla-text_ui__small')}
			/>
		</div>
	)
}

async function getEditorImage(
	editor: Editor,
	shapes: TLShape[],
	preferences: TldrawAppSessionState['exportSettings'],
	cb: (info: { src: string; width: number; height: number }) => void
) {
	const { exportPadding, exportBackground, exportTheme } = preferences

	const commonBounds = Box.Common(shapes.map((s) => editor.getShapePageBounds(s)!))

	// image max is 216x216, so let's say 500 to be nice and safe
	const scale = Math.min(500 / commonBounds.width, 500 / commonBounds.height)

	const result = await editor.toImage(shapes, {
		scale,
		format: 'png',
		padding: exportPadding ? editor.options.defaultSvgPadding : 0,
		background: exportBackground,
		darkMode: exportTheme === 'auto' ? undefined : exportTheme === 'dark',
	})

	if (!result) return

	const src = await FileHelpers.blobToDataUrl(result.blob)

	cb({ src, width: Math.ceil(result.width / scale), height: Math.ceil(result.height / scale) })
}

const getEditorImageSlowly = debounce(getEditorImage, 60)

function getExportPreferences(app: TldrawApp | null) {
	const sessionState = getLocalSessionState()

	let { exportPadding, exportBackground, exportTheme, exportFormat } = sessionState.exportSettings

	if (app && sessionState.auth) {
		const user = app.getUser()
		if (user) {
			exportPadding = user.exportPadding
			exportBackground = user.exportBackground
			exportTheme = user.exportTheme
			exportFormat = user.exportFormat
		}
	}

	return {
		exportPadding,
		exportBackground,
		exportTheme,
		exportFormat,
	}
}
