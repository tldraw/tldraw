import { id, tx } from '@instantdb/core'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRaw } from '../hooks/useRaw'
import { TlaAnonLayout } from '../layouts/TlaAnonLayout/TlaAnonLayout'
import { db } from '../utils/db'

export function Component() {
	// Navigate to the most recent file (if there is one) or else a new file
	return <LocalTldraw />
}

function LocalTldraw() {
	const auth = db.useAuth()
	const raw = useRaw()
	const [ready, setReady] = useState(false)
	const navigate = useNavigate()

	useEffect(() => {
		if (!auth.user) {
			return
		}

		// first time user

		const { id: userId } = auth.user

		db.queryOnce({
			users: {
				$: {
					where: {
						id: userId,
					},
				},
			},
		}).then((userResp) => {
			const user = userResp.data?.users[0]
			if (user) {
				db.queryOnce({
					files: {
						$: {
							where: {
								owner: userId,
							},
							order: {
								serverCreatedAt: 'desc',
							},
						},
					},
				}).then((mostRecentFileResp) => {
					const first = mostRecentFileResp.data?.files[0]
					if (!first) {
						throw Error('No files found')
					}
					navigate(`/q/f/${first.id}`)
				})
			} else {
				// create the user
				const fileId = id()

				db.transact([
					tx.users[userId].update({
						createdAt: Date.now(),
						updatedAt: Date.now(),
						color: 'black',
						exportFormat: 'png',
						exportTheme: 'auto',
						exportBackground: false,
						exportPadding: true,
						presence: {
							fileIds: [],
						},
						flags: {
							placeholder_feature_flag: false,
						},
					}),
					tx.files[fileId].update({
						createdAt: Date.now(),
						updatedAt: Date.now(),
						name: 'New file',
						owner: userId,
						thumbnail: '',
						shared: true,
						sharedLinkType: 'edit',
						isEmpty: false,
					}),
					tx.users[userId].link({ files: fileId }),
				]).then(() => {
					setReady(true)
					navigate(`/q/${fileId}`)
				})
			}
		})

		// console.log(result)
	}, [auth.user, auth.isLoading, navigate])

	return (
		<TlaAnonLayout>
			{ready ? raw('offline editor here') : raw('loading auth')}
			{/* <TlaEditor
				isCreateMode
				key={fileSlug}
				fileSlug={fileSlug}
				onDocumentChange={() => {
					// Save the file slug to local storage if they actually make changes
					setInLocalStorage(TEMPORARY_FILE_KEY, fileSlug)
				}}
			/> */}
		</TlaAnonLayout>
	)
}
