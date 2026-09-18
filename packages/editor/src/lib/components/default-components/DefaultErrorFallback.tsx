import { useValue } from '@tldraw/state-react'
import { noop } from '@tldraw/utils'
import classNames from 'classnames'
import { ComponentType, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
	defineMessages,
	translateMessage,
	type TLI18nMessage,
	type TLI18nValues,
} from '../../config/TLI18n'
import { Editor } from '../../editor/Editor'
import { getOwnerDocument } from '../../exports/domUtils'
import { useEditorComponents } from '../../hooks/EditorComponentsContext'
import { EditorProvider } from '../../hooks/useEditor'
import { getGlobalWindow } from '../../utils/dom'
import { hardResetEditor, refreshPage } from '../../utils/runtime'
import { ErrorBoundary } from '../ErrorBoundary'

const BASE_ERROR_URL = 'https://github.com/tldraw/tldraw/issues/new'

const messages = defineMessages({
	confirmResetTitle: { id: 'error.confirm-reset.title', defaultMessage: 'Are you sure?' },
	confirmResetDescription: {
		id: 'error.confirm-reset.description',
		defaultMessage: 'Resetting your data will delete your drawing and cannot be undone.',
	},
	cancel: { id: 'error.cancel', defaultMessage: 'Cancel' },
	resetData: { id: 'error.reset-data', defaultMessage: 'Reset data' },
	title: { id: 'error.title', defaultMessage: 'Something went wrong' },
	refreshHint: { id: 'error.refresh-hint', defaultMessage: 'Please refresh your browser.' },
	resetHint: {
		id: 'error.reset-hint',
		defaultMessage:
			'If the issue continues after refreshing, you may need to reset the tldraw data stored on your device.',
	},
	noteLabel: { id: 'error.note-label', defaultMessage: 'Note:' },
	resetNote: {
		id: 'error.reset-note',
		defaultMessage: 'Resetting will erase your current project and any unsaved work.',
	},
	messageLabel: { id: 'error.message-label', defaultMessage: 'Message:' },
	stackTraceLabel: { id: 'error.stack-trace-label', defaultMessage: 'Stack trace:' },
	copy: { id: 'error.copy', defaultMessage: 'Copy' },
	copied: { id: 'error.copied', defaultMessage: 'Copied!' },
	showDetails: { id: 'error.show-details', defaultMessage: 'Show details' },
	hideDetails: { id: 'error.hide-details', defaultMessage: 'Hide details' },
	refreshPage: { id: 'error.refresh-page', defaultMessage: 'Refresh page' },
})

// This renders because something already threw, so reading the editor is done defensively the way
// the rest of this component reads it: English beats a second crash on the error screen.
function useErrorMsg(editor: Editor | undefined) {
	return useCallback(
		(message: TLI18nMessage, values?: TLI18nValues) => {
			try {
				return translateMessage(editor?.i18n(), message, values)
			} catch {
				return message.defaultMessage
			}
		},
		[editor]
	)
}

/** @public */
export type TLErrorFallbackComponent = ComponentType<{ error: unknown; editor?: Editor }>

/** @public @react */
export const DefaultErrorFallback: TLErrorFallbackComponent = function DefaultErrorFallback({
	error,
	editor,
}) {
	const msg = useErrorMsg(editor)
	const containerRef = useRef<HTMLDivElement>(null)
	const [shouldShowError, setShouldShowError] = useState(process.env.NODE_ENV === 'development')
	const [didCopy, setDidCopy] = useState(false)
	const [shouldShowResetConfirmation, setShouldShowResetConfirmation] = useState(false)

	let Canvas: React.ComponentType | null = null
	try {
		// eslint-disable-next-line react-hooks/rules-of-hooks
		const components = useEditorComponents()
		Canvas = components.Canvas ?? null
	} catch {
		// allow this to fail silently
	}

	const errorMessage = error instanceof Error ? error.message : String(error)
	const errorStack = error instanceof Error ? error.stack : null

	const isDarkModeFromApp = useValue(
		'isDarkMode',
		() => {
			try {
				if (editor) {
					return editor.user.getIsDarkMode()
				}
			} catch {
				// we're in a funky error state so this might not work for spooky
				// reasons. if not, we'll have another attempt later:
			}
			return null
		},
		[editor]
	)
	const [isDarkMode, setIsDarkMode] = useState<null | boolean>(null)
	useLayoutEffect(() => {
		// if we found a theme class from the app, we can just use that
		if (isDarkModeFromApp !== null) {
			setIsDarkMode(isDarkModeFromApp)
		}

		// do any of our parents have a theme class? if yes then we can just
		// rely on that and don't need to set our own class
		let parent = containerRef.current?.parentElement
		let foundParentThemeClass = false
		while (parent) {
			if (
				parent.classList.contains('tl-theme__dark') ||
				parent.classList.contains('tl-theme__light')
			) {
				foundParentThemeClass = true
				break
			}
			parent = parent.parentElement
		}
		if (foundParentThemeClass) {
			setIsDarkMode(null)
			return
		}

		// if we can't find a theme class from the app or from a parent, we have
		// to fall back on using a media query:
		if (typeof window !== 'undefined' && getGlobalWindow().matchMedia) {
			setIsDarkMode(getGlobalWindow().matchMedia('(prefers-color-scheme: dark)').matches)
		}
	}, [isDarkModeFromApp])

	useEffect(() => {
		if (didCopy) {
			const timeout = editor?.timers.setTimeout(() => {
				setDidCopy(false)
			}, 2000)
			return () => clearTimeout(timeout)
		}
	}, [didCopy, editor])

	const copyError = () => {
		const doc = getOwnerDocument(containerRef.current)
		const textarea = doc.createElement('textarea')
		textarea.value = errorStack ?? errorMessage
		doc.body.appendChild(textarea)
		textarea.select()
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		doc.execCommand('copy')
		textarea.remove()
		setDidCopy(true)
	}

	const refresh = () => {
		refreshPage()
	}

	const resetLocalState = async () => {
		hardResetEditor()
	}

	const url = new URL(BASE_ERROR_URL)
	url.searchParams.set('title', errorMessage)
	url.searchParams.set('labels', `bug`)
	url.searchParams.set(
		'body',
		`Hey, I ran into an error while using tldraw:

\`\`\`js
${errorStack ?? errorMessage}
\`\`\`

My browser: ${navigator.userAgent}`
	)

	return (
		<div
			ref={containerRef}
			className={classNames(
				'tl-container tl-error-boundary',
				// error-boundary is sometimes used outside of the theme
				// container, so we need to provide it with a theme for our
				// styles to work correctly
				isDarkMode === null ? '' : isDarkMode ? 'tl-theme__dark' : 'tl-theme__light'
			)}
		>
			<div className="tl-error-boundary__overlay" />
			{editor && (
				// opportunistically attempt to render the canvas to reassure
				// the user that their document is still there. there's a good
				// chance this won't work (ie the error that we're currently
				// notifying the user about originates in the canvas) so it's
				// not a big deal if it doesn't work - in that case we just have
				// a plain grey background.
				<ErrorBoundary onError={noop} fallback={() => null}>
					<EditorProvider editor={editor}>
						<div className="tl-overlay tl-error-boundary__canvas">{Canvas ? <Canvas /> : null}</div>
					</EditorProvider>
				</ErrorBoundary>
			)}
			<div
				className={classNames('tl-modal', 'tl-error-boundary__content', {
					'tl-error-boundary__content__expanded': shouldShowError && !shouldShowResetConfirmation,
				})}
			>
				{shouldShowResetConfirmation ? (
					<>
						<h2>{msg(messages.confirmResetTitle)}</h2>
						<p>{msg(messages.confirmResetDescription)}</p>
						<div className="tl-error-boundary__content__actions">
							<button className="tlui-button" onClick={() => setShouldShowResetConfirmation(false)}>
								{msg(messages.cancel)}
							</button>
							<button className="tlui-button tl-error-boundary__reset" onClick={resetLocalState}>
								{msg(messages.resetData)}
							</button>
						</div>
					</>
				) : (
					<>
						<h2>{msg(messages.title)}</h2>
						<p>{msg(messages.refreshHint)}</p>
						<p>{msg(messages.resetHint)}</p>
						<p>
							<strong>{msg(messages.noteLabel)}</strong> {msg(messages.resetNote)}
						</p>
						{process.env.NODE_ENV !== 'production' && (
							<p>
								If you&apos;re developing with the SDK and need help, join us on{' '}
								<a href="https://discord.tldraw.com/?utm_source=sdk&utm_medium=organic&utm_campaign=error-screen">
									Discord
								</a>
								.
							</p>
						)}
						{shouldShowError && (
							<>
								{msg(messages.messageLabel)}
								<h4>
									<code>{errorMessage}</code>
								</h4>
								{msg(messages.stackTraceLabel)}
								<div className="tl-error-boundary__content__error">
									<pre>
										<code>{errorStack ?? errorMessage}</code>
									</pre>
									<button className="tlui-button" onClick={copyError}>
										{didCopy ? msg(messages.copied) : msg(messages.copy)}
									</button>
								</div>
							</>
						)}
						<div className="tl-error-boundary__content__actions">
							<button className="tlui-button" onClick={() => setShouldShowError(!shouldShowError)}>
								{shouldShowError ? msg(messages.hideDetails) : msg(messages.showDetails)}
							</button>
							<div className="tl-error-boundary__content__actions__group">
								<button
									className="tlui-button tl-error-boundary__reset"
									onClick={() => setShouldShowResetConfirmation(true)}
								>
									{msg(messages.resetData)}
								</button>
								<button className="tlui-button tl-error-boundary__refresh" onClick={refresh}>
									{msg(messages.refreshPage)}
								</button>
							</div>
						</div>
					</>
				)}
			</div>
		</div>
	)
}
