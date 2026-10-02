import { useCallback, useEffect, useState } from 'react'
import {
	ContainerProvider,
	DefaultDialogs,
	TldrawUiContextProvider,
	TldrawUiButton,
	TldrawUiButtonLabel,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
	TldrawUiDialogCloseButton,
	TldrawUiDialogBody,
	TldrawUiDialogFooter,
	TldrawUiIcon,
	useDialogs,
	TLUiDialogProps,
} from 'tldraw'
export const providers = [
	{ id: 'openai', name: 'OpenAI', help: 'https://platform.openai.com/api-keys' },
	{ id: 'anthropic', name: 'Anthropic', help: 'https://console.anthropic.com/settings/keys' },
	{ id: 'google', name: 'Google', help: 'https://aistudio.google.com/apikey' },
] as const
export type Provider = (typeof providers)[number]['id']
type ApiKeys = Partial<Record<Provider, string>>
const storageKey = 'tldraw-agent-api-keys'
const openEvent = 'tldraw-open-api-keys'
let keys: ApiKeys | undefined

function getKeys(): ApiKeys {
	if (keys) return keys
	keys = {}
	try {
		const saved = JSON.parse(localStorage.getItem(storageKey) ?? '{}')
		for (const { id } of providers) {
			if (typeof saved?.[id] === 'string') keys[id] = saved[id].trim()
		}
	} catch {
		// Storage may be unavailable in an embedded demo; keys still work for this session.
	}
	return keys
}

export function openApiKeySettings() {
	window.dispatchEvent(new Event(openEvent))
}

export function requireApiKey(provider: Provider): string {
	const key = getKeys()[provider]
	if (key) return key
	openApiKeySettings()
	throw new Error(
		`Add your ${providers.find((p) => p.id === provider)!.name} API key in API key settings, then try again.`
	)
}

export function ApiKeySettings() {
	const [container, setContainer] = useState<HTMLDivElement | null>(null)
	return (
		<div
			ref={setContainer}
			className="tl-container tl-theme__light"
			style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 500 }}
		>
			{container && (
				<ContainerProvider container={container}>
					<TldrawUiContextProvider>
						<SettingsDialogController />
						<DefaultDialogs />
					</TldrawUiContextProvider>
				</ContainerProvider>
			)}
		</div>
	)
}

function SettingsDialogController() {
	const { addDialog } = useDialogs()
	const open = useCallback(() => {
		addDialog({
			id: 'api-key-settings',
			component: SettingsDialog,
		})
	}, [addDialog])
	useEffect(() => {
		window.addEventListener(openEvent, open)
		if (!Object.values(getKeys()).some(Boolean)) open()
		return () => window.removeEventListener(openEvent, open)
	}, [open])
	return null
}

function SettingsDialog({ onClose }: TLUiDialogProps) {
	const [draft, setDraft] = useState<ApiKeys>(() => ({ ...getKeys() }))
	const [storageError, setStorageError] = useState(false)
	function save() {
		keys = Object.fromEntries(providers.map(({ id }) => [id, draft[id]?.trim() ?? '']))
		try {
			localStorage.setItem(storageKey, JSON.stringify(keys))
			onClose()
		} catch {
			setStorageError(true)
		}
	}
	return (
		<>
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle>Settings</TldrawUiDialogTitle>
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody
				style={{ maxWidth: 350, display: 'flex', flexDirection: 'column', gap: 8 }}
			>
				<p>
					Keys are saved in this browser and sent through this app’s server to the provider. Usage
					is billed to your account. Clear a field and save to remove a key.
				</p>
				<hr style={{ margin: '12px 0' }} />
				{providers.map(({ id, name, help }) => (
					<div key={id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
						<div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
							<label htmlFor={`${id}-api-key`} style={{ flexGrow: 2 }}>
								{name} API key
							</label>
							<a
								href={help}
								target="_blank"
								rel="noreferrer"
								aria-label={`Get a ${name} API key`}
								style={{ cursor: 'pointer', pointerEvents: 'all' }}
							>
								<TldrawUiIcon label="Help" small icon="question-mark-circle" />
							</a>
						</div>
						<div draggable={false} className="tlui-input__wrapper">
							<input
								id={`${id}-api-key`}
								className="tlui-input"
								type="password"
								value={draft[id] ?? ''}
								autoComplete="off"
								spellCheck={false}
								placeholder="Enter your API key"
								onFocus={(event) => event.currentTarget.select()}
								onChange={(event) => setDraft({ ...draft, [id]: event.currentTarget.value })}
								style={{
									background: 'var(--tl-color-muted-2)',
									flexGrow: 2,
									borderRadius: 'var(--tl-radius-2)',
									padding: '0 var(--tl-space-4)',
									position: 'relative',
									textOverflow: 'clip',
								}}
							/>
						</div>
					</div>
				))}
				{storageError && (
					<p role="status">
						Browser storage is unavailable. Your keys will work for this session only.
					</p>
				)}
			</TldrawUiDialogBody>
			<TldrawUiDialogFooter className="tlui-dialog__footer__actions">
				<TldrawUiButton type="primary" onClick={save}>
					<TldrawUiButtonLabel>Save</TldrawUiButtonLabel>
				</TldrawUiButton>
			</TldrawUiDialogFooter>
		</>
	)
}
