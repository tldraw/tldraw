import {
	ACCESS_POLICY_ID,
	accessGrantId,
	TLAccessGrant,
	TLAccessPolicy,
} from '@tldraw/dotcom-shared'
import { useEditor, useValue } from 'tldraw'
import { useMaybeApp } from '../hooks/useAppState'

// SPIKE: the student policy is its own record in the room's object store, written by teachers.
export function getPolicy(store: { get(id: any): unknown }) {
	return store.get(ACCESS_POLICY_ID) as TLAccessPolicy | undefined
}

// SPIKE: true for a student the teacher has not opened everything up for.
export function useIsRestrictedStudent() {
	const editor = useEditor()
	const app = useMaybeApp()
	const grantId = accessGrantId(app?.userId)
	return useValue(
		'isRestrictedStudent',
		() =>
			(editor.store.get(grantId as any) as unknown as TLAccessGrant | undefined)?.role ===
				'student' && getPolicy(editor.store)?.studentsCanEditAll !== true,
		[editor, grantId]
	)
}
