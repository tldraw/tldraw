import { ExampleDialog, TLComponents, Tldraw, useDialogs, useToasts } from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file

const CustomSharePanel = () => {
	const { addToast } = useToasts()
	const { addDialog } = useDialogs()

	return (
		<button
			style={{ fontSize: 18, backgroundColor: 'thistle', pointerEvents: 'all' }}
			onClick={() => {
				addToast({ title: 'Hello world!', severity: 'success' })
				addDialog({
					component: ({ onClose }) => (
						<ExampleDialog
							title="Hello World!"
							body="This is a dialog body."
							cancel="myCancelButton"
							confirm="myConfirmButton"
							onCancel={() => onClose()}
							onContinue={() => onClose()}
						/>
					),
					onClose: () => {
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
