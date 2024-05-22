import { exhaustiveSwitchError, hasOwnProperty } from '@tldraw/utils'

interface AlarmOpts {
	overwrite: 'always' | 'if-sooner'
}

export class AlarmScheduler<Key extends string> {
	storage: () => {
		getAlarm(): Promise<number | null>
		setAlarm(scheduledTime: number | Date): void
		get(key: string): Promise<number | undefined>
		list(options: { prefix: string }): Promise<Map<string, number>>
		delete(keys: string[]): Promise<number>
		put(entries: Record<string, number>): Promise<void>
	}
	alarms: { [K in Key]: () => Promise<void> }

	constructor(opts: Pick<AlarmScheduler<Key>, 'storage' | 'alarms'>) {
		this.storage = opts.storage
		this.alarms = opts.alarms
	}

	_alarmsScheduledDuringCurrentOnAlarmCall: Set<Key> | null = null
	async onAlarm() {
		if (this._alarmsScheduledDuringCurrentOnAlarmCall !== null) {
			// i _think_ DOs alarms are one-at-a-time, but throwing here will cause a retry
			throw new Error('onAlarm called before previous call finished')
		}
		this._alarmsScheduledDuringCurrentOnAlarmCall = new Set()
		try {
			const alarms = await this.storage().list({ prefix: 'alarm-' })
			const successfullyExecutedAlarms = new Set<Key>()
			let shouldRetry = false
			let nextAlarmTime = null

			for (const [key, requestedTime] of alarms) {
				const cleanedKey = key.replace(/^alarm-/, '') as Key
				if (!hasOwnProperty(this.alarms, cleanedKey)) continue
				if (requestedTime > Date.now()) {
					if (nextAlarmTime === null || requestedTime < nextAlarmTime) {
						nextAlarmTime = requestedTime
					}
					continue
				}
				const alarm = this.alarms[cleanedKey]
				try {
					await alarm()
					successfullyExecutedAlarms.add(cleanedKey)
				} catch (err) {
					// eslint-disable-next-line no-console
					console.log(`Error firing alarm ${cleanedKey}:`, err)
					shouldRetry = true
				}
			}

			const keysToDelete = []
			for (const key of successfullyExecutedAlarms) {
				if (this._alarmsScheduledDuringCurrentOnAlarmCall.has(key)) continue
				keysToDelete.push(`alarm-${key}`)
			}
			if (keysToDelete.length > 0) {
				await this.storage().delete(keysToDelete)
			}

			if (shouldRetry) {
				throw new Error('Some alarms failed to fire, scheduling retry')
			} else if (nextAlarmTime !== null) {
				await this.setCoreAlarmIfNeeded(nextAlarmTime)
			}
		} finally {
			this._alarmsScheduledDuringCurrentOnAlarmCall = null
		}
	}

	private async setCoreAlarmIfNeeded(targetAlarmTime: number) {
		const currentAlarmTime = await this.storage().getAlarm()
		if (currentAlarmTime === null || targetAlarmTime < currentAlarmTime) {
			await this.storage().setAlarm(targetAlarmTime)
		}
	}

	async scheduleAlarmAt(key: Key, time: number | Date, opts: AlarmOpts) {
		const targetTime = typeof time === 'number' ? time : time.getTime()
		if (this._alarmsScheduledDuringCurrentOnAlarmCall !== null) {
			this._alarmsScheduledDuringCurrentOnAlarmCall.add(key)
		}
		switch (opts.overwrite) {
			case 'always':
				await this.storage().put({ [`alarm-${key}`]: targetTime })
				break
			case 'if-sooner': {
				const currentScheduled = await this.storage().get(`alarm-${key}`)
				if (!currentScheduled || currentScheduled > targetTime) {
					await this.storage().put({ [`alarm-${key}`]: targetTime })
				}
				break
			}
			default:
				exhaustiveSwitchError(opts.overwrite)
		}
		await this.setCoreAlarmIfNeeded(targetTime)
	}

	async scheduleAlarmAfter(key: Key, delayMs: number, opts: AlarmOpts) {
		await this.scheduleAlarmAt(key, Date.now() + delayMs, opts)
	}

	async getAlarm(key: Key): Promise<number | null> {
		return (await this.storage().get(`alarm-${key}`)) ?? null
	}

	async deleteAlarm(key: Key): Promise<void> {
		await this.storage().delete([`alarm-${key}`])
	}
}
