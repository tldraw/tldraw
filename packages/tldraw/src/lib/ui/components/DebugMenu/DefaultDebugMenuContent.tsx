import {
	DebugFlag,
	Editor,
	PageRecordType,
	TLShapePartial,
	createShapeId,
	debugFlags,
	featureFlags,
	hardResetEditor,
	track,
	uniqueId,
	useEditor,
} from '@tldraw/editor'
import React from 'react'
import { useDialogs } from '../../context/dialogs'
import { useToasts } from '../../context/toasts'
import { untranslated } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiButton } from '../primitives/Button/TldrawUiButton'
import { TldrawUiButtonCheck } from '../primitives/Button/TldrawUiButtonCheck'
import { TldrawUiButtonLabel } from '../primitives/Button/TldrawUiButtonLabel'
import {
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogFooter,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
} from '../primitives/TldrawUiDialog'
import { TldrawUiMenuCheckboxItem } from '../primitives/menus/TldrawUiMenuCheckboxItem'
import { TldrawUiMenuGroup } from '../primitives/menus/TldrawUiMenuGroup'
import { TldrawUiMenuItem } from '../primitives/menus/TldrawUiMenuItem'
import { TldrawUiMenuSubmenu } from '../primitives/menus/TldrawUiMenuSubmenu'

/** @public */
export function DefaultDebugMenuContent() {
	const editor = useEditor()
	const { addToast } = useToasts()
	const { addDialog } = useDialogs()
	const [error, setError] = React.useState<boolean>(false)

	return (
		<>
			<TldrawUiMenuGroup id="items">
				<TldrawUiMenuItem
					id="add-toast"
					onSelect={() => {
						addToast({
							id: uniqueId(),
							title: 'Something good happened',
							description: 'Hey, attend to this thing over here. It might be important!',
							keepOpen: true,
							severity: 'success',
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
							severity: 'info',
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
							title: 'Something maybe bad happened',
							description: 'Hey, attend to this thing over here. It might be important!',
							keepOpen: true,
							severity: 'warning',
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
						addToast({
							id: uniqueId(),
							title: 'Something bad happened',
							severity: 'error',
							keepOpen: true,
						})
					}}
					label={untranslated('Show toast')}
				/>
				<TldrawUiMenuItem
					id="show-dialog"
					label={'Show dialog'}
					onSelect={() => {
						addDialog({
							component: ({ onClose }) => (
								<ExampleDialog
									displayDontShowAgain
									onCancel={() => onClose()}
									onContinue={() => onClose()}
								/>
							),
							onClose: () => {
								void null
							},
						})
					}}
				/>
				<TldrawUiMenuItem
					id="create-shapes"
					label={'Create 100 shapes'}
					onSelect={() => createNShapes(editor, 100)}
				/>
				<TldrawUiMenuItem
					id="count-nodes"
					label={'Count shapes / nodes'}
					onSelect={() => {
						const selectedShapes = editor.getSelectedShapes()
						const shapes =
							selectedShapes.length === 0 ? editor.getRenderingShapes() : selectedShapes
						window.alert(
							`Shapes ${shapes.length}, DOM nodes:${document.querySelector('.tl-shapes')!.querySelectorAll('*')?.length}`
						)
					}}
				/>
				{(() => {
					if (error) throw Error('oh no!')
					return null
				})()}
				<TldrawUiMenuItem id="throw-error" onSelect={() => setError(true)} label={'Throw error'} />
				<TldrawUiMenuItem id="hard-reset" onSelect={hardResetEditor} label={'Hard reset'} />
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="performance">
				<TldrawUiMenuItem
					id="unculling"
					label={'Unculling benchmark'}
					onSelect={() => uncullingTest(editor)}
				/>
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="flags">
				<DebugFlags />
				<FeatureFlags />
			</TldrawUiMenuGroup>
		</>
	)
}
/** @public */
export function DebugFlags() {
	const items = Object.values(debugFlags)
	if (!items.length) return null
	return (
		<TldrawUiMenuSubmenu id="debug flags" label="Debug Flags">
			<TldrawUiMenuGroup id="debug flags">
				{items.map((flag) => (
					<DebugFlagToggle key={flag.name} flag={flag} />
				))}
			</TldrawUiMenuGroup>
		</TldrawUiMenuSubmenu>
	)
}
/** @public */
export function FeatureFlags() {
	const items = Object.values(featureFlags)
	if (!items.length) return null
	return (
		<TldrawUiMenuSubmenu id="feature flags" label="Feature Flags">
			<TldrawUiMenuGroup id="feature flags">
				{items.map((flag) => (
					<DebugFlagToggle key={flag.name} flag={flag} />
				))}
			</TldrawUiMenuGroup>
		</TldrawUiMenuSubmenu>
	)
}
/** @public */
export function ExampleDialog({
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
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle>{title}</TldrawUiDialogTitle>
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody style={{ maxWidth: 350 }}>{body}</TldrawUiDialogBody>
			<TldrawUiDialogFooter className="tlui-dialog__footer__actions">
				{displayDontShowAgain && (
					<TldrawUiButton
						type="normal"
						onClick={() => setDontShowAgain(!dontShowAgain)}
						style={{ marginRight: 'auto' }}
					>
						<TldrawUiButtonCheck checked={dontShowAgain} />
						<TldrawUiButtonLabel>Don't show again</TldrawUiButtonLabel>
					</TldrawUiButton>
				)}
				<TldrawUiButton type="normal" onClick={onCancel}>
					<TldrawUiButtonLabel>{cancel}</TldrawUiButtonLabel>
				</TldrawUiButton>
				<TldrawUiButton type="primary" onClick={async () => onContinue()}>
					<TldrawUiButtonLabel>{confirm}</TldrawUiButtonLabel>
				</TldrawUiButton>
			</TldrawUiDialogFooter>
		</>
	)
}

const DebugFlagToggle = track(function DebugFlagToggle({
	flag,
	onChange,
}: {
	flag: DebugFlag<boolean>
	onChange?: (newValue: boolean) => void
}) {
	const value = flag.get()
	return (
		<TldrawUiMenuCheckboxItem
			id={flag.name}
			title={flag.name}
			label={flag.name
				.replace(/([a-z0-9])([A-Z])/g, (m) => `${m[0]} ${m[1].toLowerCase()}`)
				.replace(/^[a-z]/, (m) => m.toUpperCase())}
			checked={value}
			onSelect={() => {
				flag.set(!value)
				onChange?.(!value)
			}}
		/>
	)
})

let t = 0

function createNShapes(editor: Editor, n: number, offset = 0) {
	const shapesToCreate: TLShapePartial[] = Array(n)
	const cols = Math.floor(Math.sqrt(n))

	for (let i = 0; i < n; i++) {
		t++
		shapesToCreate[i] = {
			id: createShapeId('box' + t),
			type: 'geo',
			x: (i % cols) * 50 + offset,
			y: Math.floor(i / cols) * 132,
			props: {
				w: 200,
				h: 200,
			},
		}
	}

	editor.batch(() => {
		editor.createShapes(shapesToCreate).setSelectedShapes(shapesToCreate.map((s) => s.id))
	})
}

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

async function uncullingTest(editor: Editor) {
	function createNShapesForUncullingTest(editor: Editor, n: number, offset = 0) {
		const shapesToCreate: TLShapePartial[] = Array(n)
		const cols = Math.floor(Math.sqrt(n))

		for (let i = 0; i < n; i++) {
			t++
			shapesToCreate[i] = {
				id: createShapeId('box' + t),
				type: 'geo',
				x: (i % cols) * 50 + offset,
				y: Math.floor(i / cols) * 132,
				props: {
					w: 200,
					h: 200,
				},
			}
		}

		editor.batch(() => {
			editor.createShapes(shapesToCreate).setSelectedShapes(shapesToCreate.map((s) => s.id))
		})
	}

	const newPageId = setupPage(editor)
	createNShapesForUncullingTest(editor, 1000)
	createNShapesForUncullingTest(editor, 1000, 10)
	editor.selectNone()
	editor.setCamera({ x: 18000, y: 200, z: 0.1 })

	const timeStart = performance.now()
	for (let i = 0; i < 100; i++) {
		const pingPong = i % 2 === 0
		editor.setCamera({ x: pingPong ? 1100 : 18000, y: 200 })
		await sleep(100)
	}
	const timeEnd = performance.now()

	editor.deletePage(newPageId)
	alert(`timeTaken ${timeEnd - timeStart}`)
}

const setupPage = (editor: Editor) => {
	const pages = editor.getPages()
	const perfPageExists = pages.filter((p) => p.name === 'performance').length > 0

	if (perfPageExists) {
		editor.deletePage(pages.find((p) => p.name === 'performance')!.id)
	}
	const newPageId = PageRecordType.createId()
	editor.createPage({ name: 'performance', id: newPageId })
	editor.setCurrentPage(newPageId)
	return newPageId
}
