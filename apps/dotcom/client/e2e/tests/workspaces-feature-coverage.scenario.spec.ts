import { test } from '../fixtures/scenario-test'

// Placeholder coverage for the scenarios described in apps/dotcom/workspaces-feature.md.
//
// These are intentionally skipped rather than empty passing tests. Each body names the
// behavior that should be asserted when the scenario is implemented.
test.describe.configure({ mode: 'parallel', timeout: 60_000 })

test.describe('workspace feature coverage placeholders', () => {
	test.describe('workspace identity and settings', () => {
		test.fixme('renames the home workspace without exposing team controls', async () => {
			throw new Error(
				'TODO: Rename the home workspace, assert the active file stays open, and assert invite, leave, delete, and member-management controls stay unavailable.'
			)
		})

		test.fixme('syncs a non-home workspace rename to another member', async () => {
			throw new Error(
				'TODO: Have an owner rename a workspace while another member is active, then assert the member sees the new workspace label without navigation.'
			)
		})

		test.fixme('prevents the last owner from leaving, being demoted, or being removed', async () => {
			throw new Error(
				'TODO: Exercise leave, role-change, and remove-member paths for the final owner and assert the workspace keeps at least one owner.'
			)
		})

		test.fixme('demotes an owner to member and removes owner-only controls after sync', async () => {
			throw new Error(
				'TODO: Promote a member, demote them back to member, and assert rename, member-management, and delete-workspace controls disappear while file access remains.'
			)
		})
	})

	test.describe('workspace invites', () => {
		test.fixme('lets a regular member regenerate the invite link', async () => {
			throw new Error(
				'TODO: Open settings as a non-owner member, regenerate the invite, and assert the member stays in the workspace with invite management available.'
			)
		})

		test.fixme('rejects an old invite link after invite regeneration', async () => {
			throw new Error(
				'TODO: Capture an invite URL, regenerate the workspace invite, open the old URL as another user, and assert the expired-invite path appears.'
			)
		})

		test.fixme('prompts signed-out invitees to sign in before accepting a workspace invite', async () => {
			throw new Error(
				'TODO: Open an invite URL signed out, complete sign-in and legal acceptance if needed, then accept and assert member-role access.'
			)
		})
	})

	test.describe('workspace file list sync', () => {
		test.fixme('shows a file another member creates in the active workspace', async () => {
			throw new Error(
				'TODO: Keep one member active in a workspace, create a file from another member, and assert the viewer sees it without being navigated away.'
			)
		})

		test.fixme('syncs another member file rename to the sidebar and document metadata', async () => {
			throw new Error(
				'TODO: Rename a shared workspace file from one member and assert another member sees the sidebar label and editor file title update.'
			)
		})

		test.fixme('moves a file away before another member opens it', async () => {
			throw new Error(
				'TODO: Move a workspace file before another member opens it, covering both destination-member and non-destination-member outcomes.'
			)
		})
	})

	test.describe('moving open workspace files', () => {
		test.fixme('keeps an open file connected when moved to another workspace the viewer belongs to', async () => {
			throw new Error(
				"TODO: Move the viewer's open file to a second shared workspace and assert the canvas stays editable, active workspace updates, and the file appears in the destination list."
			)
		})

		test.fixme('falls back to home when an open file moves to a workspace the viewer does not belong to', async () => {
			throw new Error(
				"TODO: Move the viewer's open shared-edit file to a workspace they cannot see, then assert home is active while the canvas remains editable as a guest."
			)
		})

		test.fixme('reconnects as read-only when an open file moves away with view-only sharing', async () => {
			throw new Error(
				"TODO: Move the viewer's open file to an unseen workspace with shared-link view access and assert editing controls are removed."
			)
		})

		test.fixme('closes with forbidden when an open file moves away and is private', async () => {
			throw new Error(
				'TODO: Make the open file private, move it to an unseen workspace, and assert the viewer is disconnected with the private-file error.'
			)
		})

		test.fixme('links a moved shared file into home after a later direct-link visit', async () => {
			throw new Error(
				'TODO: After a shared file moves to an unseen workspace, revisit its direct link and assert it appears as a home-workspace linked guest file.'
			)
		})
	})

	test.describe('removing files and workspaces', () => {
		test.fixme("closes another member's open file with not found when the file is deleted", async () => {
			throw new Error(
				'TODO: Delete a workspace-owned file while another member has it open, then assert the open session moves to the not-found state.'
			)
		})

		test.fixme('removes a linked file from a workspace without deleting the owned file', async () => {
			throw new Error(
				'TODO: Create a linked file entry, remove it from the linked workspace, and assert the owning workspace and direct shared access still work.'
			)
		})

		test.fixme("deletes a workspace and closes members' open owned files with not found", async () => {
			throw new Error(
				'TODO: Delete a workspace while another member has an owned file open, then assert the workspace disappears and the open canvas gets not found.'
			)
		})

		test.fixme('deletes a workspace without deleting files only linked into it', async () => {
			throw new Error(
				'TODO: Delete a workspace containing a linked file and assert the original file remains available from its owning workspace or shared link.'
			)
		})
	})

	test.describe('membership removal and leaving', () => {
		test.fixme('revokes private open-file access when the current user is removed from a workspace', async () => {
			throw new Error(
				'TODO: Remove a member while they have a private workspace file open and assert the workspace disappears and the file shows forbidden.'
			)
		})

		test.fixme('keeps shared-edit open-file access after the current user is removed from a workspace', async () => {
			throw new Error(
				'TODO: Remove a member while they have a shared-edit workspace file open and assert the workspace disappears while guest editing remains available.'
			)
		})

		test.fixme('downgrades to read-only after the current user is removed from a workspace with view sharing', async () => {
			throw new Error(
				'TODO: Remove a member while they have a shared-view workspace file open and assert the workspace disappears while the canvas becomes read-only.'
			)
		})

		test.fixme('syncs a leave-workspace membership loss to another open tab', async () => {
			throw new Error(
				'TODO: Leave a workspace in one tab and assert another tab for the same user loses private file access or continues as a guest for shared files.'
			)
		})
	})

	test.describe('sharing changes on workspace files', () => {
		test.fixme('keeps workspace members connected when a file is unshared for guests', async () => {
			throw new Error(
				'TODO: Open a workspace file as both a member and a guest, unshare it, then assert the guest loses access while the member remains editable.'
			)
		})

		test.fixme('keeps workspace members editable when a shared file changes from edit to view', async () => {
			throw new Error(
				'TODO: Open a workspace file as a member and a non-member guest, switch link access from edit to view, and assert only the guest becomes read-only.'
			)
		})
	})

	test.describe('workspace imports', () => {
		test.fixme("imports a dropped canvas .tldr file into the current file's owning workspace", async () => {
			throw new Error(
				'TODO: Drop a .tldr file on the canvas while active in a non-home workspace and assert the imported file is created in that workspace.'
			)
		})

		test.fixme('imports a sidebar-dropped .tldr file into home while viewing another workspace', async () => {
			throw new Error(
				'TODO: Drop a .tldr file on the sidebar while viewing a non-home workspace and assert the imported file appears in home, not the active workspace.'
			)
		})

		test.fixme('imports a main-menu .tldr file into home while viewing another workspace', async () => {
			throw new Error(
				'TODO: Import a .tldr file from the main menu while viewing a non-home workspace and assert the imported file appears in home.'
			)
		})
	})
})
