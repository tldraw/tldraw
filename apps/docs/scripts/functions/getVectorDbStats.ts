import { getVectorDb } from '@/utils/ContentVectorDatabase'
import { nicelog } from '@/utils/nicelog'

export async function getVectorDbStats() {
	const db = await getVectorDb()
	nicelog(await db.index.getIndexStats())
}
