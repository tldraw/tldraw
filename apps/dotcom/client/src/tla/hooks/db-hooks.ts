import { db } from '../utils/db'

export function useAuthUser() {
	const auth = db.useAuth()
	return auth.user!
}

export function useDbUser() {
	const auth = db.useAuth()
	const result = db.useQuery(
		auth.user
			? {
					users: {
						$: {
							where: {
								id: auth.user.id,
							},
						},
					},
				}
			: null
	)

	return result.data?.users[0]
}

export function useDbUserFiles() {
	const auth = db.useAuth()
	const result = db.useQuery(
		auth.user
			? {
					files: {
						$: {
							where: {
								owner: auth.user.id,
							},
							order: {
								serverCreatedAt: 'desc',
							},
						},
					},
				}
			: null
	)

	return result
}

export function useDbUserRecentFiles() {
	const auth = db.useAuth()
	const result = db.useQuery(
		auth.user
			? {
					fileVisits: {
						$: {
							where: {
								ownerId: auth.user.id,
							},
						},
					},
				}
			: null
	)

	return result
}

export function useDbFile(fileSlug: string) {
	const fileNameResp = db.useQuery({
		files: {
			$: {
				where: {
					id: fileSlug,
				},
			},
		},
	})
	return fileNameResp.data?.files[0]
}
