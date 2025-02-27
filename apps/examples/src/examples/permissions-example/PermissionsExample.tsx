import { JsonObject, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

interface MyMeta extends JsonObject {
	createdAt: number
}

export default function PermissionsExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey="permissions"
				onMount={(e) => {
					// [1]
					e.getInitialMetaForShape = (_shape) => {
						{
							return {
								createdAt: Date.now(),
							}
						}
					}

					// [1.5]
					// e.sideEffects.registerBeforeCreateHandler('shape', (shape, source) => {
					// 	if (source === 'remote') return shape
					// 	return { ...shape, meta: { createdAt: Date.now() } }
					// })

					// [2]
					e.sideEffects.registerBeforeDeleteHandler('shape', (shape, source) => {
						if (source === 'remote') return
						const meta = shape.meta as MyMeta
						if (Date.now() - meta.createdAt < 1000 * 5) return false
						return
					})

					// [3]
					e.sideEffects.registerBeforeChangeHandler('shape', (prev, next, source) => {
						if (source === 'remote') return next
						const meta = next.meta as MyMeta
						if (Date.now() - meta.createdAt > 1000 * 5) return prev
						return next
					})
				}}
			/>
		</div>
	)
}

/*
If you run this example, you'll see that you can't delete a shape that was created less than 5 seconds ago,
and you can't modify a shape that was created more than 5 seconds ago. This is a simple example of how you
can use permissions to control what users can do in the editor.

In your app, you probably have an ID that could be associated with a user. You could use this ID to prevent
users from modifying or deleting shapes that they didn't create. You could also use this ID to prevent users
from modifying, deleting, or perhaps even unlocking certain template shapes. This system could also be dynamic,
such as checking your user's permission level (something like "change-all", "change-own", "change-none") to 
determine what they can or can't do.

Remember that tldraw also has a readonly mode, which can be set on the editor component. (If you wanted to be
extra safe, you could also prevent changes in the client to the readonly mode using the side effect system).

[1]
When a user creates a shape, the editor calls the `getInitialMetaForShape` method. If we want to set the meta
automatically for a shape, we can override the editor's `getInitialMetaForShape` method.

[1.5]
Alternatively, you can use the `beforeCreate` side effect to set the meta for a shape. But be careful! 
This side effect runs whenever a shape record is created for any reason, including when a shape is 
re-created by undoing a deleted shape. If you only want to set the meta when a shape is first created, you
should use `getInitialMetaForShape`.

[2]
The `beforeDelete` side effect runs when a user tries to delete a shape. If we want to prevent a shape
from being deleted, we can return false from this method. If we return false, the shape will not be deleted.
If your app is multiplayer, you should check the `source` argument to see if the delete was caused by the user
or caused by a remote change.

[3]
A `beforeChange` side effect runs when a user tries to modify a shape. If we want to prevent a shape
from being modified, we can return the previous shape record from this method. Whatever we return from
this method will be the new version of the shape. Like with other side effects, if your app is multiplayer,
you should check the `source` argument to see if the delete was caused by the user or caused by a remote change.
*/
