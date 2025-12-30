import {
	OptimisticAppStore,
	TlaFileState,
	TlaGroupUser,
	TlaRow,
	TlaSchema,
	TlaUser,
} from '@tldraw/dotcom-shared'
import { assert, compact, computed, react, sleep } from 'tldraw'

export class ClientQuery<Row extends TlaRow, isOne extends boolean = false> {
	constructor(
		private readonly signal: AbortSignal,
		private readonly store: OptimisticAppStore,
		private readonly isOne: isOne,
		private readonly table: keyof TlaSchema['tables'],
		private readonly wheres: ReadonlyArray<[string, any]> = []
	) {}

	where<K extends keyof Row>(key: K, op: '=', value: Row[K]) {
		assert(op === '=', 'Only = operator is supported at the moment')
		return new ClientQuery<Row, isOne>(this.signal, this.store, this.isOne, this.table, [
			...this.wheres,
			[key as string, value],
		])
	}

	related(_cb: any) {
		// we implement this ad-hoc in `run`
		return this
	}

	private _runSync(tolerateUnsetData = false) {
		const data = this.store.getFullData()
		if (!data) {
			assert(tolerateUnsetData, 'Data is not set yet')
			return this.isOne ? null : []
		}
		let rows = data[this.table].filter((row: any) =>
			this.wheres.every(([key, value]) => row[key] === value)
		) as any[]

		if (this.table === 'user') {
			rows = rows.map((row: TlaUser) => {
				const userFairies = data.user_fairies.find((uf) => uf.userId === row.id)
				return {
					...row,
					fairies: userFairies?.fairies || null,
					fairyAccessExpiresAt: userFairies?.fairyAccessExpiresAt ?? null,
					fairyLimit: userFairies?.fairyLimit ?? null,
				}
			})
		}

		if (this.table === 'file_state') {
			rows = compact(
				rows.map((row: TlaFileState) => {
					const file = data.file.find((f) => f.id === row.fileId)
					if (!file) return null
					return {
						...row,
						file,
						fairyState:
							data.file_fairies.find((ff) => ff.fileId === row.fileId)?.fairyState || null,
					}
				})
			)
		}

		if (this.table === 'group_user') {
			rows = rows.map((row: TlaGroupUser) => {
				const group = data.group.find((g) => g.id === row.groupId)
				const groupFiles = compact(
					data.group_file
						.filter((gf) => gf.groupId === row.groupId)
						.map((gf) => {
							const file = data.file.find((f) => f.id === gf.fileId)
							// when joining a guest file we may have a group_file but not a file yet
							if (!file) return null
							return { ...gf, file }
						})
				)
				const groupMembers = data.group_user.filter((gu) => gu.groupId === row.groupId)
				return {
					...row,
					group,
					groupFiles,
					groupMembers,
				}
			})
		}

		if (this.isOne) {
			return rows[0] as any
		}

		return rows as any
	}

	async run(): Promise<isOne extends true ? Row : Row[]> {
		assert(!this.signal.aborted, 'Query usage outside of mutator scope')
		return this._runSync()
	}

	preload(): { complete: Promise<void> } {
		assert(!this.signal.aborted, 'Query usage outside of mutator scope')

		if (this.store.getFullData()) {
			return { complete: Promise.resolve() }
		}

		const load = new Promise<void>((resolve) => {
			const interval = setInterval(() => {
				if (this.signal.aborted) {
					clearInterval(interval)
					return
				}
				if (this.store.getFullData()) {
					clearInterval(interval)
					resolve()
				}
			}, 10)
		})

		const timeout = sleep(10_000).then(() => {
			throw new Error('Timed out waiting for data')
		})

		return {
			complete: Promise.race([load, timeout]),
		}
	}

	one() {
		return new ClientQuery<Row, true>(this.signal, this.store, true, this.table, this.wheres)
	}

	materialize() {
		const data$ = computed(`${this.table} materialize`, () => this._runSync(true))
		let unlisten = () => {}
		return {
			get data() {
				return data$.__unsafe__getWithoutCapture()
			},
			addListener: (listener: (data: isOne extends true ? Row : Row[]) => void) => {
				unlisten = react(`${this.table} listener`, () => {
					const data = data$.get()
					if (!data) return
					return listener(data)
				})
			},
			destroy() {
				unlisten()
				unlisten = () => {}
			},
		}
	}
}
