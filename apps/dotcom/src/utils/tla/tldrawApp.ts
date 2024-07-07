import { Store } from 'tldraw'
import { TldrawAppFileRecordType } from './schema/TldrawAppFile'
import { TldrawAppGroupRecordType } from './schema/TldrawAppGroup'
import { TldrawAppGroupMembershipRecordType } from './schema/TldrawAppGroupMembership'
import { TldrawAppStarRecordType } from './schema/TldrawAppStar'
import { TldrawAppUserRecordType } from './schema/TldrawAppUser'
import { TldrawAppWorkspaceRecordType } from './schema/TldrawAppWorkspace'
import { TldrawAppRecord, tldrawAppSchema } from './tldrawAppSchema'

export class TldrawApp {
	constructor() {
		const day = 1000 * 60 * 60 * 24

		const user = TldrawAppUserRecordType.create({
			id: TldrawAppUserRecordType.createId('0'),
			name: 'Steve Ruiz',
			email: 'steve@tldraw.com',
		})

		const workspace = TldrawAppWorkspaceRecordType.create({
			id: TldrawAppWorkspaceRecordType.createId('0'),
			name: 'tldraw',
			avatar: 'tldraw',
		})

		const group1 = TldrawAppGroupRecordType.create({
			id: TldrawAppGroupRecordType.createId('0'),
			workspaceId: workspace.id,
			name: 'Group 1',
		})

		const group2 = TldrawAppGroupRecordType.create({
			id: TldrawAppGroupRecordType.createId('1'),
			workspaceId: workspace.id,
			name: 'Group 2',
		})

		const star = TldrawAppStarRecordType.create({
			id: TldrawAppStarRecordType.createId('0'),
			workspaceId: workspace.id,
			userId: user.id,
			fileId: TldrawAppFileRecordType.createId('0'),
			createdAt: Date.now(),
		})

		const groupMembership = TldrawAppGroupMembershipRecordType.create({
			id: TldrawAppGroupMembershipRecordType.createId('0'),
			workspaceId: workspace.id,
			userId: user.id,
			groupId: group1.id,
			createdAt: Date.now(),
		})

		const files = [
			TldrawAppFileRecordType.create({
				id: TldrawAppFileRecordType.createId('0'),
				workspaceId: workspace.id,
				owner: user.id,
				createdAt: Date.now() - day * 0.5,
			}),
			TldrawAppFileRecordType.create({
				id: TldrawAppFileRecordType.createId('1'),
				workspaceId: workspace.id,
				owner: user.id,
				createdAt: Date.now() - day * 0.6,
			}),
			TldrawAppFileRecordType.create({
				id: TldrawAppFileRecordType.createId('2'),
				workspaceId: workspace.id,
				owner: user.id,
				createdAt: Date.now() - day * 0.7,
			}),
			TldrawAppFileRecordType.create({
				id: TldrawAppFileRecordType.createId('3'),
				workspaceId: workspace.id,
				owner: user.id,
				createdAt: Date.now() - day * 1.2,
			}),
			TldrawAppFileRecordType.create({
				id: TldrawAppFileRecordType.createId('4'),
				workspaceId: workspace.id,
				owner: user.id,
				createdAt: Date.now() - day * 1.3,
			}),
			TldrawAppFileRecordType.create({
				id: TldrawAppFileRecordType.createId('5'),
				workspaceId: workspace.id,
				owner: user.id,
				createdAt: Date.now() - day * 1.4,
			}),
			TldrawAppFileRecordType.create({
				id: TldrawAppFileRecordType.createId('6'),
				workspaceId: workspace.id,
				owner: user.id,
				createdAt: Date.now() - day * 1.6,
			}),
			TldrawAppFileRecordType.create({
				id: TldrawAppFileRecordType.createId('7'),
				workspaceId: workspace.id,
				owner: user.id,
				createdAt: Date.now() - day * 2.5,
			}),
			TldrawAppFileRecordType.create({
				id: TldrawAppFileRecordType.createId('8'),
				workspaceId: workspace.id,
				owner: user.id,
				createdAt: Date.now() - day * 3.5,
			}),
			// group files
			TldrawAppFileRecordType.create({
				id: TldrawAppFileRecordType.createId('7'),
				workspaceId: workspace.id,
				owner: group1.id,
				createdAt: Date.now() - day * 1,
			}),
			TldrawAppFileRecordType.create({
				id: TldrawAppFileRecordType.createId('8'),
				workspaceId: workspace.id,
				owner: group1.id,
				createdAt: Date.now() - day * 2,
			}),
			TldrawAppFileRecordType.create({
				id: TldrawAppFileRecordType.createId('9'),
				workspaceId: workspace.id,
				owner: group1.id,
				createdAt: Date.now() - day * 3,
			}),
			TldrawAppFileRecordType.create({
				id: TldrawAppFileRecordType.createId('10'),
				workspaceId: workspace.id,
				owner: group2.id,
				createdAt: Date.now() - day * 3,
			}),
		]

		this.store = new Store<TldrawAppRecord>({
			id: 'tla',
			schema: tldrawAppSchema,
			initialData: Object.fromEntries(
				[user, workspace, group1, group2, star, groupMembership, ...files].map((r) => [r.id, r])
			),
			props: {},
		})
	}

	store: Store<TldrawAppRecord>
}
