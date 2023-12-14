import {
	createShapeId,
	DebugFlag,
	debugFlags,
	Editor,
	featureFlags,
	hardResetEditor,
	TLShapePartial,
	track,
	uniqueId,
	useEditor,
	useValue,
} from '@tldraw/editor'
import * as React from 'react'
import { useDialogs } from '../hooks/useDialogsProvider'
import { useToasts } from '../hooks/useToastsProvider'
import { untranslated, useTranslation } from '../hooks/useTranslation/useTranslation'
import { Button } from './primitives/Button'
import * as Dialog from './primitives/Dialog'
import * as DropdownMenu from './primitives/DropdownMenu'

let t = 0

function createNShapes(editor: Editor, n: number) {
	const shapesToCreate: TLShapePartial[] = Array(n)
	const cols = Math.floor(Math.sqrt(n))

	for (let i = 0; i < n; i++) {
		t++
		shapesToCreate[i] = {
			id: createShapeId('box' + t),
			type: 'geo',
			x: (i % cols) * 132,
			y: Math.floor(i / cols) * 132,
		}
	}

	editor.batch(() => {
		editor.createShapes(shapesToCreate).setSelectedShapes(shapesToCreate.map((s) => s.id))
	})
}

/** @internal */
export const DebugPanel = React.memo(function DebugPanel({
	renderDebugMenuItems,
}: {
	renderDebugMenuItems: (() => React.ReactNode) | null
}) {
	const msg = useTranslation()
	return (
		<div className="tlui-debug-panel">
			<CurrentState />
			<ShapeCount />
			<DropdownMenu.Root id="debug">
				<DropdownMenu.Trigger>
					<Button type="icon" icon="dots-horizontal" title={msg('debug-panel.more')} />
				</DropdownMenu.Trigger>
				<DropdownMenu.Content side="top" align="end" alignOffset={0}>
					<DebugMenuContent renderDebugMenuItems={renderDebugMenuItems} />
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</div>
	)
})

const CurrentState = track(function CurrentState() {
	const editor = useEditor()
	return <div className="tlui-debug-panel__current-state">{editor.getPath()}</div>
})

const ShapeCount = function ShapeCount() {
	const editor = useEditor()
	const count = useValue('rendering shapes count', () => editor.getRenderingShapes().length, [
		editor,
	])

	return <div>{count} Shapes</div>
}

const DebugMenuContent = track(function DebugMenuContent({
	renderDebugMenuItems,
}: {
	renderDebugMenuItems: (() => React.ReactNode) | null
}) {
	const editor = useEditor()
	const { addToast } = useToasts()
	const { addDialog } = useDialogs()
	const [error, setError] = React.useState<boolean>(false)

	return (
		<>
			<DropdownMenu.Group>
				<DropdownMenu.Item
					type="menu"
					onClick={() => {
						addToast({
							id: uniqueId(),
							title: 'Something happened',
							description: 'Hey, attend to this thing over here. It might be important!',
							keepOpen: true,
							// icon?: string
							// title?: string
							// description?: string
							// actions?: TLUiToastAction[]
						})
						addToast({
							id: uniqueId(),
							title: 'Something happened',
							description: 'Hey, attend to this thing over here. It might be important!',
							keepOpen: true,
							actions: [
								{
									label: 'Primary',
									type: 'primary',
									onClick: () => {
										void null
									},
								},
								{
									label: 'Normal',
									type: 'normal',
									onClick: () => {
										void null
									},
								},
								{
									label: 'Danger',
									type: 'danger',
									onClick: () => {
										void null
									},
								},
							],
							// icon?: string
							// title?: string
							// description?: string
							// actions?: TLUiToastAction[]
						})
						addToast({
							id: uniqueId(),
							title: 'Something happened',
							description: 'Hey, attend to this thing over here. It might be important!',
							keepOpen: true,
							icon: 'twitter',
							actions: [
								{
									label: 'Primary',
									type: 'primary',
									onClick: () => {
										void null
									},
								},
								{
									label: 'Normal',
									type: 'normal',
									onClick: () => {
										void null
									},
								},
								{
									label: 'Danger',
									type: 'danger',
									onClick: () => {
										void null
									},
								},
							],
						})
					}}
					label={untranslated('Show toast')}
				/>

				<DropdownMenu.Item
					type="menu"
					onClick={() => {
						addDialog({
							component: ({ onClose }) => (
								<ExampleDialog
									displayDontShowAgain
									onCancel={() => {
										onClose()
									}}
									onContinue={() => {
										onClose()
									}}
								/>
							),
							onClose: () => {
								void null
							},
						})
					}}
					label={untranslated('Show dialog')}
				/>
				<DropdownMenu.Item
					type="menu"
					onClick={() => createNShapes(editor, 100)}
					label={untranslated('Create 100 shapes')}
				/>
				<DropdownMenu.Item
					type="menu"
					onClick={() => {
						function countDescendants({ children }: HTMLElement) {
							let count = 0
							if (!children.length) return 0
							for (const el of [...(children as any)]) {
								count++
								count += countDescendants(el)
							}
							return count
						}

						const selectedShapes = editor.getSelectedShapes()

						const shapes =
							selectedShapes.length === 0 ? editor.getRenderingShapes() : selectedShapes

						const elms = shapes.map(
							(shape) => (document.getElementById(shape.id) as HTMLElement)!.parentElement!
						)

						let descendants = elms.length

						for (const elm of elms) {
							descendants += countDescendants(elm)
						}

						window.alert(`Shapes ${shapes.length}, DOM nodes:${descendants}`)
					}}
					label={untranslated('Count shapes / nodes')}
				/>
				{(() => {
					if (error) throw Error('oh no!')
				})()}
				<DropdownMenu.Item
					type="menu"
					onClick={() => {
						setError(true)
					}}
					label={untranslated('Throw error')}
				/>
				<DropdownMenu.Item
					type="menu"
					onClick={() => {
						hardResetEditor()
					}}
					label={untranslated('Hard reset')}
				/>
			</DropdownMenu.Group>
			<DropdownMenu.Group>
				<DebugFlagToggle flag={debugFlags.debugSvg} />
				<DebugFlagToggle flag={debugFlags.forceSrgb} />
				<DebugFlagToggle flag={debugFlags.debugGeometry} />
				<DebugFlagToggle flag={debugFlags.hideShapes} />
			</DropdownMenu.Group>
			<DropdownMenu.Group>
				{Object.values(featureFlags).map((flag) => {
					return <DebugFlagToggle key={flag.name} flag={flag} />
				})}
			</DropdownMenu.Group>
			{renderDebugMenuItems?.()}
		</>
	)
})

function Toggle({
	label,
	value,
	onChange,
}: {
	label: string
	value: boolean
	onChange: (newValue: boolean) => void
}) {
	return (
		<DropdownMenu.CheckboxItem
			title={untranslated(label)}
			checked={value}
			onSelect={() => onChange(!value)}
		>
			<span className="tlui-button__label" draggable={false}>
				{label}
			</span>
		</DropdownMenu.CheckboxItem>
	)
}

const DebugFlagToggle = track(function DebugFlagToggle({
	flag,
	onChange,
}: {
	flag: DebugFlag<boolean>
	onChange?: (newValue: boolean) => void
}) {
	return (
		<Toggle
			label={flag.name
				.replace(/([a-z0-9])([A-Z])/g, (m) => `${m[0]} ${m[1].toLowerCase()}`)
				.replace(/^[a-z]/, (m) => m.toUpperCase())}
			value={flag.get()}
			onChange={(newValue) => {
				flag.set(newValue)
				onChange?.(newValue)
			}}
		/>
	)
})

function ExampleDialog({
	title = 'title',
	body = 'hello hello hello',
	cancel = 'Cancel',
	confirm = 'Continue',
	displayDontShowAgain = false,
	onCancel,
	onContinue,
}: {
	title?: string
	body?: string
	cancel?: string
	confirm?: string
	displayDontShowAgain?: boolean
	onCancel: () => void
	onContinue: () => void
}) {
	const [dontShowAgain, setDontShowAgain] = React.useState(false)

	return (
		<>
			<Dialog.Header>
				<Dialog.Title>{title}</Dialog.Title>
				<Dialog.CloseButton />
			</Dialog.Header>
			<Dialog.Body style={{ maxWidth: 350 }}>{body}</Dialog.Body>
			<Dialog.Footer className="tlui-dialog__footer__actions">
				{displayDontShowAgain && (
					<Button
						type="normal"
						onClick={() => setDontShowAgain(!dontShowAgain)}
						iconLeft={dontShowAgain ? 'check' : 'checkbox-empty'}
						style={{ marginRight: 'auto' }}
					>
						{`Don't show again`}
					</Button>
				)}
				<Button type="normal" onClick={onCancel}>
					{cancel}
				</Button>
				<Button type="primary" onClick={async () => onContinue()}>
					{confirm}
				</Button>
			</Dialog.Footer>
		</>
	)
}
