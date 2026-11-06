import { TLSocketRoom } from '@tldraw/sync'
import { ComponentType } from 'react'
import { Editor, TLRecord } from 'tldraw'
import { Meta, Policy, Session } from './access'
import { ConnectDecision } from './local-room'

export interface DemoUser {
	id: string
	name: string
	color: string
}

export interface SceneContext<S> {
	state: S
	/** Change app state. Users in `reconnect` reconnect, so the server resolves their access again. */
	setState(patch: Partial<S>, opts?: { reconnect?: string[] }): void
	room: TLSocketRoom<TLRecord, Meta>
	editors: Record<string, Editor | undefined>
}

export type Status = 'solved' | 'partly' | 'not'

export interface Scene<S = any> {
	id: string
	/** The use case, as named on the use case page. */
	title: string
	status: Status
	summary: string
	tryThis: string[]
	expect: string
	gap?: string
	primitives: string[]
	users: DemoUser[]
	initialState: S
	/** Make the room's first document. Runs in a headless editor. */
	seed(editor: Editor): void
	/** The app's auth at connect time: what `handleSocketConnect` gets for this user. */
	connect(user: DemoUser, state: S): ConnectDecision<Meta>
	/** The policy. Rules read app state through `getState`, so they see the current value. */
	policy(getState: () => S): Policy
	/** Room options can't change on a live room: a new key makes a new room. */
	roomKey?(state: S): string
	/** Default for the "client checks" toggle in this scene. */
	clientChecks?: boolean
	comments?: boolean
	/** The tools this user may pick. Unset: all. */
	tools?(user: DemoUser, session: Session): string[] | undefined
	/** Client code for this user's editor, e.g. a reactive read-only mode. */
	setup?(editor: Editor, user: DemoUser, getSession: () => Session): (() => void) | void
	Controls?: ComponentType<{ ctx: SceneContext<S> }>
}

export function defineScene<S>(scene: Scene<S>): Scene<S> {
	return scene
}

export function allow(
	meta: Meta,
	opts: { readonly?: boolean; objectAccess?: 'read' | 'write' } = {}
) {
	return {
		allow: true as const,
		isReadonly: opts.readonly ?? false,
		objectAccess: opts.objectAccess ?? (opts.readonly ? 'read' : 'write'),
		meta,
	}
}

export const deny = { allow: false as const }
