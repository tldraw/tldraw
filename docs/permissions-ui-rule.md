# App-owned permission checks

This branch implements the opt-in `isChangePermitted="write-rule"` query and explicit page context for `isPermitted`. It is stacked on #11459. The scoped-grants language from #11554 is not part of this change.

Decision: keep editor-aware UI callbacks and opt into direct rule queries only for rules that can judge a record independently. Agreed in the implementation request on 2026-11-18. This supersedes the earlier suggestion to replace the callbacks with Kevin's `can` interface for this branch.

`editor.isPermitted(permission, { pageId })` forwards the target as the third callback argument. Omitted targets use the current page. Page update/delete controls and Move to page supply explicit targets. This is context for app rules, not built-in scoped-grant enforcement.

## Notion discussion

The following is the author's edited [Notion explanation](https://app.notion.com/p/41c3e4c324c081b7b1fcda37cbb80e66), captured for this PR. References to the proposed shortcut describe the discussion before implementation. The explicit target-page limitation below is addressed by the API above. Examples are illustrative, not complete applications.

## Idea

The app decides what permissions mean. For example, creating a shape needs both permission to create shapes and permission to edit the destination page.

The app defines `mayChangeShapes` once. The UI calls it before offering an action. The write rule calls it for the actual changes. It runs wherever it is called, on the client or server.

## Where grants come from

The app authenticates the connection, checks file access, and loads the user's grants from its database. These calls happen on connection or when permissions change, not for each shape or drag update.

**server/room.ts**

```ts
// Dummy app database call.
async function loadGrants(fileId, userId) {
	return db.getPermissions(fileId, userId)
}

// For a file with pages A and B, this returns the lists below.

// Teacher: may create, edit and delete shapes on both pages.
const teacherGrants = [
	'shape:create',
	'shape:update',
	'shape:delete',
	'page:edit:page:A',
	'page:edit:page:B',
]

// Student: may create, edit and delete shapes on page A only.
const studentGrants = ['shape:create', 'shape:update', 'shape:delete', 'page:edit:page:A']

// A room already created for this file.
const room = new TLSocketRoom({ authorize: shapeEditingRule })

async function connect(request, socket, sessionId, fileId) {
	const user = await auth.requireUser(request)
	const access = await db.fileAccess(fileId, user.id)

	if (!access.canView) throw new Error('File unavailable')

	const permissions = access.canEdit ? await loadGrants(fileId, user.id) : []

	room.handleSocketConnect({
		sessionId,
		socket,
		userId: user.id,
		permissions,
	})
}
```

For Sam, the result might be:

**server/room.ts (example database result)**

```ts
;['shape:create', 'shape:update', 'shape:delete', 'page:edit:page:A']
```

The app stores file membership, roles and page assignments in its own database. Those database details don't need to go to the client. The server passes the resulting grants to sync, which delivers them to that session.

The server must choose the file and user from trusted routing and authentication. It never accepts a grant list supplied by the browser.

## The app's shape permission check

**shared/permissions.ts**

```ts
// Shared app code
type Grants = readonly string[] | null
type ShapeAction = 'create' | 'update' | 'delete'

export function mayChangeShapes(granted: Grants, action: ShapeAction, pageId: string) {
	return granted?.includes(`shape:${action}`) === true && granted.includes(`page:edit:${pageId}`)
}
```

`mayChangeShapes` is an **ordinary app function**, not a new SDK callback. The app wires it into #11459's existing UI callbacks and write rule.

The UI passes `editor.getPermissions()` directly. The write rule passes `session.permissions`. The function handles null as no permission.

## Write enforcement

This deliberately narrow example allows shape writes on assigned pages. Other record writes are refused. It is enough to illustrate ordinary geometric shapes, but is not a complete policy for arrows with bindings, media assets, comments or page administration.

**shared/permissions.ts (continued)**

```ts
// Shared app code. TLWriteRule and getOwningPage come from #11459.
export const shapeEditingRule: TLWriteRule = ({ session, changes, before, after }) => {
	for (const change of changes) {
		for (const [record, read] of [
			[change.prev, before],
			[change.next, after],
		] as const) {
			if (!record) continue
			if (record.typeName !== 'shape') {
				return { reason: 'This example only allows shape changes' }
			}

			const { page } = getOwningPage(read, record)
			if (!page || !mayChangeShapes(session.permissions, change.type, page.id)) {
				return { reason: 'You cannot make this change on this page' }
			}
		}
	}

	return null
}
```

Creates check the resulting page. Deletes check the previous page. Updates check both. Permission on page A cannot be used to pull a shape off protected page B.

The room judges all changes in the push. A refusal rejects the whole push, including unrelated edits it contains. Client checks improve feedback but do not replace this server check.

## UI wiring in #11459

**client/Board.tsx**

```ts
	const store = useSync({
  uri,
  assets,
  authorize: { rule: shapeEditingRule },
})

// The UI asks with names like 'tl:shape:create', but mayChangeShapes takes
// 'create', 'update' or 'delete', matching change.type in the write rule.
// This mapping translates between them. Using the same names would remove it
// and also simplify isPermitted
const shapeActions = {
  'tl:shape:create': 'create',
  'tl:shape:update': 'update',
  'tl:shape:delete': 'delete',
} as const

<Tldraw
  store={store}
  isPermitted={(permission, editor) => {
    const action = shapeActions[permission]
    if (!action) return false

    return mayChangeShapes(
      editor.getPermissions(),
      action,
      editor.getCurrentPageId()
    )
  }}
  // This wiring might not be needed. See the proposed write-rule shortcut below.
  isChangePermitted={(change, editor) => {
    const session = editor.store.props.authorize?.getSession?.()
    if (!session) return false

    const get = (id: string) => editor.store.get(id as TLRecord['id'])

    return shapeEditingRule({
      session,
      changes: [change],
      before: get,
      after: get,
    }) === null
  }}
/>
```

The callback receives the editor, so the **app chooses what context to pass** to its check. Here it reads the current page and grants. Another app might need the selection, a shape's parent or other app state. **We don't need to predict every piece of editor state a customer might need** and add it to the SDK's callback arguments.

Editor access doesn't identify every action's target. A menu acting on a different page still needs to pass that destination explicitly. The current page alone cannot tell us which menu item the user is asking about.

Using the SDK's permission names directly in `mayChangeShapes` would also remove `shapeActions` and simplify `isPermitted` to forwarding the permission, grants and current page. The helper would reject names it doesn't handle.

`isPermitted` answers questions without a specific shape, such as whether a drawing tool should be available. `isChangePermitted` answers questions about an existing shape, such as whether it should be editable.

Drawing needs create and update permission. Pointer down creates a shape, and dragging updates it.

## Separate example: reuse the write rule automatically

Instead of constructing the session and readers in the app callback, opt into reusing the configured write rule:

**client/Board.tsx (alternative using proposed API)**

```ts
const store = useSync({
  uri,
  assets,
  authorize: { rule: shapeEditingRule },
})

<Tldraw
  store={store}
  isChangePermitted="write-rule"
  isPermitted={(permission, editor) => {
    const action = shapeActions[permission]
    if (!action) return false

    return mayChangeShapes(
      editor.getPermissions(),
      action,
      editor.getCurrentPageId()
    )
  }}
/>
```

The app writes no record-query adapter. The editor obtains the current session, passes the proposed change as `changes: [change]`, and uses its current store for both readers. A null result allows the UI interaction. A refusal or thrown error disables it. Before a session exists, the query returns false. Readonly and locked-shape checks still run first.

This works for shapeEditingRule because each shape can be checked separately. Tool availability still uses isPermitted because no shape exists yet.

Keep the **callback form for rules that need a complete operation**. For example, a rule rejecting orphaned children would refuse a query that deletes only a frame, even though the actual editor operation deletes its children too. A no-op update also cannot tell whether a particular resize or color change will be allowed.

## Without tldraw sync

Use the same shapeEditingRule. The app supplies the session instead of useSync. This covers a local editor and customers bringing their own sync.

**client/localSession.ts**

```ts
import { atom } from 'tldraw'

export const permissions = atom<readonly string[]>('permissions', [
	'shape:create',
	'shape:update',
	'shape:delete',
	'page:edit:page:A',
])
```

**client/LocalBoard.tsx**

```ts
import { useState } from 'react'
import { createTLStore, Tldraw } from 'tldraw'
import { mayChangeShapes, shapeEditingRule } from '../shared/permissions'
import { permissions } from './localSession'

export function LocalBoard() {
  const [store] = useState(() => createTLStore({
    authorize: {
      rule: shapeEditingRule,
      getSession: () => ({
        sessionId: 'local',
        userId: 'sam',
        meta: undefined,
        access: { document: 'write', objects: 'write' },
        permissions: permissions.get(),
      }),
    },
  }))

  return (
    <Tldraw
      store={store}
      isPermitted={(permission, editor) => {
        const action = shapeActions[permission]
        return !!action && mayChangeShapes(
          editor.getPermissions(),
          action,
          editor.getCurrentPageId()
        )
      }}
      isChangePermitted={(change, editor) => {
        const session = editor.store.props.authorize?.getSession?.()
        if (!session) return false

        const get = (id) => editor.store.get(id)
        return shapeEditingRule({
          session,
          changes: [change],
          before: get,
          after: get,
        }) === null
      }}
    />
  )
}
```

This uses the same shapeActions mapping from the earlier UI example. Sam and the local session ID are example values. An app with login supplies its own identity.

The store must contain page A, loaded from the app's document or initial setup. Grants do not create pages. This narrow rule also refuses page creation, so document setup happens before enabling user edits.

**client/localSession.ts (grant update)**

```ts
// The app receives updated grants through its own integration.
permissions.set([
	'shape:create',
	'shape:update',
	'shape:delete',
	'page:edit:page:A',
	'page:edit:page:B',
])
```

getSession reads the atom, so local rule checks see the updated grants and reactive UI checks update too. No tldraw sync connection is needed.

The rule runs through the mounted editor's local write checking. Configuring a store alone is not a promise that arbitrary writes outside that editor are authorized.

If the app brings its own sync, it must authenticate users, deliver grant updates, and enforce the rule on its server against the actual before and after states. Client-supplied session values are not trusted server identity. Remote synchronization must also use the appropriate remote-merge path. This example does not implement that transport.

The proposed isChangePermitted="write-rule" shortcut would remove the record callback here too, if added to the SDK.

## Reactivity

In this sync example, `editor.getPermissions()` and the store's `authorize.getSession()` read reactive state. When the server updates the session grants, UI controls that run their checks inside a reactive computation recheck automatically. Reading the current page also makes the check follow page changes.

For a custom button, use useValue. Calling the function once and storing its boolean result would not keep the button up to date.

**client/AddRectangleButton.tsx**

```ts
import { useEditor, useValue } from 'tldraw'

export function AddRectangleButton() {
  const editor = useEditor()
  const enabled = useValue(
    'can create shapes',
    () => editor.isPermitted('tl:shape:create'),
    [editor]
  )

  return (
    <button
      disabled={!enabled}
      onClick={() => editor.createShape({ type: 'geo' })}
    >
      Add rectangle
    </button>
  )
}
```

Render this button inside the Tldraw editor context. It creates a rectangle in one action. A drawing tool that creates and then resizes a shape also needs update permission.

If Sam loses access to the current page, `updateSessionPermissions` delivers the new grants and the button becomes disabled. If Sam switches pages, the button rechecks for the new page. The write rule still checks the actual creation.

The proposed isChangePermitted="write-rule" shortcut must preserve these reactive session and store reads too.

## Updating permissions

When the app changes Sam's assignments or role, it reloads the grants and updates each affected active session:

**server/room.ts (permission-change handler)**

```ts
// Called by the app's permission-change handler.
// fileId, userId and sessionId come from the server's connection registry.
const access = await db.fileAccess(fileId, userId)

if (!access.canView) {
	// App closes the file session through its file-access handling.
	return
}

const permissions = access.canEdit ? await loadGrants(fileId, userId) : []

room.updateSessionPermissions(sessionId, permissions)
```

The app is responsible for notifying every affected room and session when database permissions change. The branch's grant-update API updates the server session and delivers the new list to the client without reconnecting. Reactive UI checks read the updated list.

Setting grants to an empty list blocks writes under this rule. It does not remove read access or erase content already delivered.

## What belongs where

| Responsibility                                             | Owner               |
| ---------------------------------------------------------- | ------------------- |
| Authenticate the user and check file membership            | App                 |
| Load role and page assignments from the database           | App                 |
| Decide that shape creation also needs page edit permission | Shared app function |
| Deliver session grants and grant updates                   | Sync APIs in #11459 |
| Ask availability questions from built-in controls          | Editor and UI       |
| Configure custom UI answers                                | App callbacks       |
| Judge the actual changes locally and on the server         | Write rule          |

## Limits and remaining work

The current-page query works for drawing tools. A menu acting on another page needs an explicit target page in the UI query. That is a focused extension to #11459, not shown as an existing API here.

Calling shapeEditingRule directly works here because this rule judges each shape separately. This is an explicit choice for this example, not automatic SDK behavior. If the rule later checks a frame and its children together, passing only one change can give the wrong UI answer.

The UI supplies the current store as both readers. This is enough for ordinary selected-shape checks, but does not simulate changes to other records or predict side effects. The write rule gets the actual before and after states and remains responsible for the full result.

This example doesn't protect children from indirect movement through an editable parent. More specific shape ownership and container restrictions require additional rules.

The app could also combine permissions on the server before sending grants. That reduces client policy logic, but page-specific results still need a way to identify their page.

The permission decision is similar to Kevin's can. The difference is who calls it. In this example, mayChangeShapes is shared app code called by the UI adapter and write rule. With an SDK can callback, the SDK defines the UI questions and calls that callback directly. Neither approach automatically enforces a UI answer on the server.
