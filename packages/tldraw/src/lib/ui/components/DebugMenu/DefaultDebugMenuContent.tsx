import {
	DebugFlag,
	Editor,
	TLShapePartial,
	createShapeId,
	debugFlags,
	featureFlags,
	hardResetEditor,
	track,
	uniqueId,
	useEditor,
	useValue,
} from '@tldraw/editor'
import { elbowArrowDebug } from '@tldraw/editor/src/lib/utils/debug-flags'
import React from 'react'
import { createDebugElbowArrowScene } from '../../../shapes/arrow/elbow/createDebugElbowArrowScene'
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

/** @public @react */
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
				<DebugElbowArrowMenu />
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="flags">
				<DebugFlags />
				<FeatureFlags />
			</TldrawUiMenuGroup>

			{/* {...children} */}
		</>
	)
}
/** @public @react */
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
/** @public @react */
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

export function DebugElbowArrowMenu() {
	const { visualDebugging, aSide, bSide, targetStyle, supportPrecise, edgePicking } =
		useValue(elbowArrowDebug)
	const editor = useEditor()

	return (
		<TldrawUiMenuSubmenu id="debug elbow arrows" label="Elbow arrows">
			<TldrawUiMenuGroup id="visual">
				<TldrawUiMenuCheckboxItem
					id="visual"
					label="Visual debugging"
					checked={visualDebugging}
					onSelect={() => {
						elbowArrowDebug.update((p) => ({ ...p, visualDebugging: !visualDebugging }))
					}}
				/>
				<TldrawUiMenuCheckboxItem
					id="precise"
					label="Support precise"
					checked={supportPrecise}
					onSelect={() => {
						elbowArrowDebug.update((p) => ({ ...p, supportPrecise: !supportPrecise }))
					}}
				/>
				<TldrawUiMenuSubmenu id="edgePicking" label={`Edge picking (${edgePicking})`}>
					<TldrawUiMenuCheckboxItem
						id="entry-position"
						label="Entry position"
						checked={edgePicking === 'entry-position'}
						onSelect={() => {
							elbowArrowDebug.update((p) => ({ ...p, edgePicking: 'entry-position' }))
						}}
					/>
					<TldrawUiMenuCheckboxItem
						id="entry-velocity"
						label="Entry velocity"
						checked={edgePicking === 'entry-velocity'}
						onSelect={() => {
							elbowArrowDebug.update((p) => ({ ...p, edgePicking: 'entry-velocity' }))
						}}
					/>
					<TldrawUiMenuCheckboxItem
						id="position"
						label="Position"
						checked={edgePicking === 'position'}
						onSelect={() => {
							elbowArrowDebug.update((p) => ({ ...p, edgePicking: 'position' }))
						}}
					/>
				</TldrawUiMenuSubmenu>
				<TldrawUiMenuSubmenu id="target" label={`Target (${targetStyle})`}>
					<TldrawUiMenuCheckboxItem
						id="push"
						label="Push"
						checked={targetStyle === 'push'}
						onSelect={() => {
							elbowArrowDebug.update((p) => ({ ...p, targetStyle: 'push' }))
						}}
					/>
					<TldrawUiMenuCheckboxItem
						id="center"
						label="Center"
						checked={targetStyle === 'center'}
						onSelect={() => {
							elbowArrowDebug.update((p) => ({ ...p, targetStyle: 'center' }))
						}}
					/>
					<TldrawUiMenuCheckboxItem
						id="remove"
						label="Remove"
						checked={targetStyle === 'remove'}
						onSelect={() => {
							elbowArrowDebug.update((p) => ({ ...p, targetStyle: 'remove' }))
						}}
					/>
				</TldrawUiMenuSubmenu>
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="samples">
				<TldrawUiMenuItem
					id="create-elbow-arrows"
					onSelect={() => createDebugElbowArrowScene(editor)}
					label={'Create samples'}
				/>
				<TldrawUiMenuSubmenu id="a-side" label={`Start (${aSide ?? 'auto'})`}>
					<TldrawUiMenuCheckboxItem
						id="a-auto"
						label="Auto"
						checked={aSide === null}
						onSelect={() => {
							elbowArrowDebug.update((p) => ({ ...p, aSide: null }))
						}}
					/>
					<TldrawUiMenuCheckboxItem
						id="a-left"
						label="Left"
						checked={aSide === 'left'}
						onSelect={() => {
							elbowArrowDebug.update((p) => ({ ...p, aSide: 'left' }))
						}}
					/>
					<TldrawUiMenuCheckboxItem
						id="a-right"
						label="Right"
						checked={aSide === 'right'}
						onSelect={() => {
							elbowArrowDebug.update((p) => ({ ...p, aSide: 'right' }))
						}}
					/>
					<TldrawUiMenuCheckboxItem
						id="a-top"
						label="Top"
						checked={aSide === 'top'}
						onSelect={() => {
							elbowArrowDebug.update((p) => ({ ...p, aSide: 'top' }))
						}}
					/>
					<TldrawUiMenuCheckboxItem
						id="a-bottom"
						label="Bottom"
						checked={aSide === 'bottom'}
						onSelect={() => {
							elbowArrowDebug.update((p) => ({ ...p, aSide: 'bottom' }))
						}}
					/>
				</TldrawUiMenuSubmenu>
				<TldrawUiMenuSubmenu id="b-side" label={`End (${bSide ?? 'auto'})`}>
					<TldrawUiMenuCheckboxItem
						id="b-auto"
						label="Auto"
						checked={bSide === null}
						onSelect={() => {
							elbowArrowDebug.update((p) => ({ ...p, bSide: null }))
						}}
					/>
					<TldrawUiMenuCheckboxItem
						id="b-left"
						label="Left"
						checked={bSide === 'left'}
						onSelect={() => {
							elbowArrowDebug.update((p) => ({ ...p, bSide: 'left' }))
						}}
					/>
					<TldrawUiMenuCheckboxItem
						id="b-right"
						label="Right"
						checked={bSide === 'right'}
						onSelect={() => {
							elbowArrowDebug.update((p) => ({ ...p, bSide: 'right' }))
						}}
					/>
					<TldrawUiMenuCheckboxItem
						id="b-top"
						label="Top"
						checked={bSide === 'top'}
						onSelect={() => {
							elbowArrowDebug.update((p) => ({ ...p, bSide: 'top' }))
						}}
					/>
					<TldrawUiMenuCheckboxItem
						id="b-bottom"
						label="Bottom"
						checked={bSide === 'bottom'}
						onSelect={() => {
							elbowArrowDebug.update((p) => ({ ...p, bSide: 'bottom' }))
						}}
					/>
				</TldrawUiMenuSubmenu>
			</TldrawUiMenuGroup>
		</TldrawUiMenuSubmenu>
	)
}

/** @public */
export interface ExampleDialogProps {
	title?: string
	body?: string
	cancel?: string
	confirm?: string
	displayDontShowAgain?: boolean
	onCancel(): void
	onContinue(): void
}

/** @public @react */
export function ExampleDialog({
	title = 'title',
	body = 'hello hello hello',
	cancel = 'Cancel',
	confirm = 'Continue',
	displayDontShowAgain = false,
	onCancel,
	onContinue,
}: ExampleDialogProps) {
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
						<TldrawUiButtonLabel>Don’t show again</TldrawUiButtonLabel>
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
	onChange?(newValue: boolean): void
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

	editor.run(() => {
		editor.createShapes(shapesToCreate).setSelectedShapes(shapesToCreate.map((s) => s.id))
	})
}
