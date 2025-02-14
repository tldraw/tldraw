/* eslint-disable react/jsx-no-literals */
import { deleteDB } from 'idb'
import { Link, useNavigate } from 'react-router-dom'
import { compact } from 'tldraw'
import { routes } from '../../routeDefs'
import { defineLoader } from '../../utils/defineLoader'

const STORE_PREFIX = 'TLDRAW_DOCUMENT_v2'

async function getAllPersistenceKeys() {
	return compact(await indexedDB.databases().then((d) => d.map(({ name }) => name)))
		.filter((name) => name.startsWith(STORE_PREFIX))
		.map((name) => name.slice(STORE_PREFIX.length))
		.sort()
}

const { loader, useData } = defineLoader(getAllPersistenceKeys)
export { loader }

export function Component() {
	const data = useData()
	const navigate = useNavigate()
	const onDelete = async (persistenceKey: string) => {
		if (confirm('Are you 100% sure you want to delete this file? This action cannot be undone.')) {
			await deleteDB(STORE_PREFIX + persistenceKey)
			// reload data
			navigate('.', { replace: true })
		}
	}

	return (
		<div style={{ padding: 20 }}>
			<h1>Secret local tldraw files 🕵️‍♂️</h1>
			<p>Don&rsquo;t rely on this page existing, we might get rid of it.</p>
			<p>You have {data.length} local file(s) stored on your machine:</p>
			<ul>
				{data.map((persistenceKey) => (
					<li key={persistenceKey}>
						<Link
							style={{ color: 'var(--tla-color-primary)' }}
							to={routes.tlaLocalFile(persistenceKey)}
						>
							{routes.tlaLocalFile(persistenceKey)}
						</Link>
						-{' '}
						<button onClick={() => onDelete(persistenceKey)} style={{ padding: 0 }}>
							delete
						</button>
					</li>
				))}
			</ul>
			<p>
				You can make a new local file by changing the url to be e.g. `
				<span style={{ userSelect: 'all' }}>
					{location.origin}
					{routes.tlaLocalFile('my-secret-file')}
				</span>
				`. Replace &apos;my-secret-file&apos; with whatever you want.
			</p>
		</div>
	)
}
