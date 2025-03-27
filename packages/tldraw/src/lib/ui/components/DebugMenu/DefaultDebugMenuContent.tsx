import {
	DebugFlag,
	Editor,
	TLShapePartial,
	createShapeId,
	debugFlags,
	elbowArrowDebug,
	featureFlags,
	hardResetEditor,
	track,
	uniqueId,
	useEditor,
	useValue,
} from '@tldraw/editor'
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
				<TldrawUiMenuItem id="hard-reset" onSelect={hardResetEditor} label={'Hard reset'} />
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
	const {
		visualDebugging,
		startSide,
		endSide,
		targetStyle,
		impreciseEdgePicking,
		preciseEdgePicking,
		shortest,
		hintRotation,
		hintBinding,
		axisBinding,
	} = useValue(elbowArrowDebug)
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
				<DropdownSelect
					id="target"
					label="Target"
					items={['push', 'center', 'remove']}
					value={targetStyle}
					onChange={(value) => {
						elbowArrowDebug.update((p) => ({ ...p, targetStyle: value }))
					}}
				/>

				<DropdownSelect
					id="imprecise-edge-picking"
					label={`Imprecise edge picking`}
					items={['auto', 'velocity']}
					value={impreciseEdgePicking}
					onChange={(value) => {
						elbowArrowDebug.update((p) => ({ ...p, impreciseEdgePicking: value }))
					}}
				/>

				<TldrawUiMenuSubmenu id="precise-edge-picking" label={`Precise edge picking`}>
					<TldrawUiMenuCheckboxItem
						id="snap-edges"
						label="Snap edges"
						checked={preciseEdgePicking.snapEdges}
						onSelect={() => {
							elbowArrowDebug.update((p) => ({
								...p,
								preciseEdgePicking: {
									...p.preciseEdgePicking,
									snapEdges: !p.preciseEdgePicking.snapEdges,
								},
							}))
						}}
					/>
					<TldrawUiMenuCheckboxItem
						id="snap-points"
						label="Snap points"
						checked={preciseEdgePicking.snapPoints}
						onSelect={() => {
							elbowArrowDebug.update((p) => ({
								...p,
								preciseEdgePicking: {
									...p.preciseEdgePicking,
									snapPoints: !p.preciseEdgePicking.snapPoints,
								},
							}))
						}}
					/>
					<TldrawUiMenuCheckboxItem
						id="snap-none"
						label="Snap none"
						checked={preciseEdgePicking.snapNone}
						onSelect={() => {
							elbowArrowDebug.update((p) => ({
								...p,
								preciseEdgePicking: {
									...p.preciseEdgePicking,
									snapNone: !p.preciseEdgePicking.snapNone,
								},
							}))
						}}
					/>
					<TldrawUiMenuCheckboxItem
						id="snap-axis"
						label="Snap axis"
						checked={preciseEdgePicking.snapAxis}
						onSelect={() => {
							elbowArrowDebug.update((p) => ({
								...p,
								preciseEdgePicking: {
									...p.preciseEdgePicking,
									snapAxis: !p.preciseEdgePicking.snapAxis,
								},
							}))
						}}
					/>
				</TldrawUiMenuSubmenu>

				<DropdownSelect
					id="shortest"
					label={`Shortest arrow`}
					items={['distance', 'count']}
					value={shortest}
					onChange={(value) => {
						elbowArrowDebug.update((p) => ({ ...p, shortest: value }))
					}}
				/>

				<DropdownSelect
					id="hint-rotation"
					label={`Hint rotation`}
					items={['target', 'arrow', 'page']}
					value={hintRotation}
					onChange={(value) => {
						elbowArrowDebug.update((p) => ({ ...p, hintRotation: value }))
					}}
				/>

				<DropdownSelect
					id="hint-binding"
					label={`Hint binding`}
					items={['edge', 'center']}
					value={hintBinding}
					onChange={(value) => {
						elbowArrowDebug.update((p) => ({ ...p, hintBinding: value }))
					}}
				/>

				<DropdownSelect
					id="axis-binding"
					label={`Axis binding`}
					items={['closest-point', 'axis']}
					value={axisBinding}
					onChange={(value) => {
						elbowArrowDebug.update((p) => ({ ...p, axisBinding: value }))
					}}
				/>
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="samples">
				<TldrawUiMenuItem
					id="create-elbow-arrows"
					onSelect={() => createDebugElbowArrowScene(editor)}
					label={'Create samples'}
				/>
				<DropdownSelect
					id="start-side"
					label={`Start`}
					items={[{ value: null, label: 'Auto' }, 'left', 'right', 'top', 'bottom']}
					value={startSide}
					onChange={(value) => {
						elbowArrowDebug.update((p) => ({ ...p, startSide: value }))
					}}
				/>
				<DropdownSelect
					id="b-side"
					label={`End`}
					items={[{ value: null, label: 'Auto' }, 'left', 'right', 'top', 'bottom']}
					value={endSide}
					onChange={(value) => {
						elbowArrowDebug.update((p) => ({ ...p, endSide: value }))
					}}
				/>
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="reset">
				<TldrawUiMenuItem
					id="reset-elbow-arrows"
					onSelect={() => {
						elbowArrowDebug.reset()
					}}
					label={'Reset'}
				/>
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
	const gap = editor.options.adjacentShapeMargin
	const shapesToCreate: TLShapePartial[] = Array(n)
	const cols = Math.floor(Math.sqrt(n))

	for (let i = 0; i < n; i++) {
		t++
		shapesToCreate[i] = {
			id: createShapeId('box' + t),
			type: 'geo',
			x: (i % cols) * (100 + gap),
			y: Math.floor(i / cols) * (100 + gap),
		}
	}

	editor.run(() => {
		editor.createShapes(shapesToCreate).setSelectedShapes(shapesToCreate.map((s) => s.id))
	})
}

function DropdownSelect<T extends string | number | null>({
	id,
	label,
	items,
	value,
	onChange,
}: {
	id: string
	label: string
	items: (T | { label: string; value: T })[]
	value: T
	onChange(value: T): void
}) {
	return (
		<TldrawUiMenuSubmenu id={id} label={label}>
			{items.map((rawItem) => {
				const item =
					rawItem && typeof rawItem === 'object'
						? rawItem
						: {
								value: rawItem,
								label: String(rawItem)
									.replace(/([a-z0-9])([A-Z])/g, (m) => `${m[0]} ${m[1].toLowerCase()}`)
									.replace(/-/g, ' ')
									.replace(/^[a-z]/, (m) => m.toUpperCase()),
							}

				return (
					<TldrawUiMenuCheckboxItem
						key={item.value}
						id={String(item.value)}
						label={item.label}
						checked={item.value === value}
						onSelect={() => {
							onChange(item.value)
						}}
					/>
				)
			})}
		</TldrawUiMenuSubmenu>
	)
}
