import { nicelog } from '@/utils/nicelog'
;(async function () {
	nicelog('✔ Skipping vector db content!')

	// nicelog('• Refreshing vector db content...')

	// const db = await getVectorDb({
	// 	rebuildIndex: false,
	// 	updateContent: true,
	// })

	// const results = await db.query('editor')

	// nicelog(results)

	// nicelog('✔ Complete!')
	process.exit()
})()
