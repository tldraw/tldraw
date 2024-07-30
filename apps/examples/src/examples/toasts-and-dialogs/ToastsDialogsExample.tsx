import { TLComponents, Tldraw, useDialogs, useToasts } from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file
interface MyDialogProps {
	onClose: () => void
}

function MyDialog({ onClose }: MyDialogProps) {
	return (
		<div>
			<h1>My Dialog Title</h1>
			<p>My dialog body</p>
			<button onClick={onClose}>close</button>
		</div>
	)
}

const CustomSharePanel = () => {
	const { addToast } = useToasts()
	const { addDialog } = useDialogs()

	return (
		<button
			style={{ fontSize: 18, backgroundColor: 'thistle', pointerEvents: 'all' }}
			onClick={() => {
				addToast({ title: 'Hello world!', severity: 'success' })
				addDialog({
					component: ({ onClose }) => <MyDialog onClose={() => onClose()} />,
					onClose: () => {
						// You can do something after the dialog is closed
						void null
					},
				})
			}}
		>
			Show toast/dialog
		</button>
	)
}
const components: TLComponents = {
	SharePanel: CustomSharePanel,
}
export default function ToastsDialogsExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw components={components} persistenceKey="example" />
		</div>
	)
}

/* 

To control toasts and dialogs your app, you can use the `useToasts` and `useDialogs` hooks. 
These hooks give you access to functions which allow you to add, remove and clear toasts 
and dialogs.

Dialogs are especially customisable, allowing you to pass in a custom component to render
as the dialog content. Alternatively, you can use the `ExampleDialog` component which is
provided by the library.

*/
