import { noop } from '@tldraw/utils'
import { AlarmScheduler } from './AlarmScheduler'

jest.useFakeTimers()

function makeMockAlarmScheduler<Key extends string>(alarms: {
	[K in Key]: jest.Mock<Promise<void>, []>
}) {
	const data = new Map<string, number>()
	let scheduledAlarm: number | null = null

	const storage = {
		getAlarm: async () => scheduledAlarm,
		setAlarm: jest.fn((time: number | Date) => {
			scheduledAlarm = typeof time === 'number' ? time : time.getTime()
		}),
		get: async (key: string) => data.get(key),
		list: async () => new Map(data),
		delete: async (keys: string[]) => {
			let count = 0
			for (const key of keys) {
				if (data.delete(key)) count++
			}
			return count
		},
		put: async (entries: Record<string, number>) => {
			for (const [key, value] of Object.entries(entries)) {
				data.set(key, value)
			}
		},
		asObject: () => Object.fromEntries(data),
	}

	const scheduler = new AlarmScheduler({
		alarms,
		storage: () => storage,
	})

	const advanceTime = async (time: number) => {
		jest.advanceTimersByTime(time)
		if (scheduledAlarm !== null && scheduledAlarm <= Date.now()) {
			scheduledAlarm = null
			await scheduler.onAlarm()
			// process the alarms that were scheduled during the onAlarm call:
			if (scheduledAlarm) await advanceTime(0)
		}
	}

	return {
		scheduler,
		storage,
		alarms,
		advanceTime,
	}
}

describe('AlarmScheduler', () => {
	beforeEach(() => {
		jest.setSystemTime(1_000_000)
	})
	afterEach(() => {
		jest.resetAllMocks()
	})

	test('scheduling alarms', async () => {
		const { scheduler, storage } = makeMockAlarmScheduler({
			one: jest.fn(),
			two: jest.fn(),
			three: jest.fn(),
		})

		// when no alarms are scheduled, we always call storage.setAlarm
		await scheduler.scheduleAlarmAfter('one', 1000, { overwrite: 'always' })
		expect(storage.setAlarm).toHaveBeenCalledTimes(1)
		expect(storage.setAlarm).toHaveBeenLastCalledWith(1_001_000)
		expect(storage.asObject()).toStrictEqual({ 'alarm-one': 1_001_000 })

		// if a later alarm is scheduled, we don't call storage.setAlarm
		await scheduler.scheduleAlarmAfter('two', 2000, { overwrite: 'always' })
		expect(storage.setAlarm).toHaveBeenCalledTimes(1)
		expect(storage.asObject()).toStrictEqual({ 'alarm-one': 1_001_000, 'alarm-two': 1_002_000 })

		// if a sooner alarm is scheduled, we call storage.setAlarm again
		await scheduler.scheduleAlarmAfter('three', 500, { overwrite: 'always' })
		expect(storage.setAlarm).toHaveBeenCalledTimes(2)
		expect(storage.setAlarm).toHaveBeenLastCalledWith(1_000_500)
		expect(storage.asObject()).toStrictEqual({
			'alarm-one': 1_001_000,
			'alarm-two': 1_002_000,
			'alarm-three': 1_000_500,
		})

		// if the soonest alarm is scheduled later, we don't call storage.setAlarm with a later time - we
		// just let it no-op and reschedule when the alarm is actually triggered:
		await scheduler.scheduleAlarmAfter('three', 1000, { overwrite: 'always' })
		expect(storage.setAlarm).toHaveBeenCalledTimes(2)
		expect(storage.asObject()).toStrictEqual({
			'alarm-one': 1_001_000,
			'alarm-two': 1_002_000,
			'alarm-three': 1_001_000,
		})
	})

	test('onAlarm - basic function', async () => {
		const { scheduler, alarms, storage, advanceTime } = makeMockAlarmScheduler({
			one: jest.fn(),
			two: jest.fn(),
			three: jest.fn(),
		})

		// schedule some alarms:
		await scheduler.scheduleAlarmAfter('one', 1000, { overwrite: 'always' })
		await scheduler.scheduleAlarmAfter('two', 1000, { overwrite: 'always' })
		await scheduler.scheduleAlarmAfter('three', 2000, { overwrite: 'always' })
		expect(storage.setAlarm).toHaveBeenCalledTimes(1)
		expect(storage.asObject()).toStrictEqual({
			'alarm-one': 1_001_000,
			'alarm-two': 1_001_000,
			'alarm-three': 1_002_000,
		})

		// firing the alarm calls the appropriate alarm functions...
		await advanceTime(1000)
		expect(alarms.one).toHaveBeenCalledTimes(1)
		expect(alarms.two).toHaveBeenCalledTimes(1)
		expect(alarms.three).not.toHaveBeenCalled()
		// ...deletes the called alarms...
		expect(storage.asObject()).toStrictEqual({ 'alarm-three': 1_002_000 })
		// ...and reschedules the next alarm:
		expect(storage.setAlarm).toHaveBeenCalledTimes(2)
		expect(storage.setAlarm).toHaveBeenLastCalledWith(1_002_000)

		// firing the alarm again calls the next alarm and doesn't reschedule:
		await advanceTime(1000)
		expect(alarms.one).toHaveBeenCalledTimes(1)
		expect(alarms.two).toHaveBeenCalledTimes(1)
		expect(alarms.three).toHaveBeenCalledTimes(1)
		expect(storage.asObject()).toStrictEqual({})
		expect(storage.setAlarm).toHaveBeenCalledTimes(2)
	})

	test('can schedule an alarm within an alarm', async () => {
		const { scheduler, storage, advanceTime, alarms } = makeMockAlarmScheduler({
			a: jest.fn(async () => {
				scheduler.scheduleAlarmAfter('b', 1000, { overwrite: 'always' })
			}),
			b: jest.fn(),
			c: jest.fn(),
		})

		// sequence should be a -> c -> b:
		await scheduler.scheduleAlarmAfter('a', 1000, { overwrite: 'always' })
		await scheduler.scheduleAlarmAfter('c', 1500, { overwrite: 'always' })
		expect(storage.setAlarm).toHaveBeenCalledTimes(1)

		// a...
		await advanceTime(1000)
		expect(alarms.a).toHaveBeenCalledTimes(1)
		expect(alarms.b).toHaveBeenCalledTimes(0)
		expect(alarms.c).toHaveBeenCalledTimes(0)
		// called for b, then a again to reschedule c:
		expect(storage.setAlarm).toHaveBeenCalledTimes(3)
		expect(storage.setAlarm).toHaveBeenLastCalledWith(1_001_500)

		// ...b...
		await advanceTime(500)
		expect(alarms.a).toHaveBeenCalledTimes(1)
		expect(alarms.b).toHaveBeenCalledTimes(0)
		expect(alarms.c).toHaveBeenCalledTimes(1)
		expect(storage.setAlarm).toHaveBeenCalledTimes(4)
		expect(storage.setAlarm).toHaveBeenLastCalledWith(1_002_000)

		// ...c
		await advanceTime(500)
		expect(alarms.a).toHaveBeenCalledTimes(1)
		expect(alarms.b).toHaveBeenCalledTimes(1)
		expect(alarms.c).toHaveBeenCalledTimes(1)
		expect(storage.setAlarm).toHaveBeenCalledTimes(4)

		// sequence should be a -> b -> c:
		await scheduler.scheduleAlarmAfter('a', 1000, { overwrite: 'always' })
		await scheduler.scheduleAlarmAfter('c', 3000, { overwrite: 'always' })
		expect(storage.setAlarm).toHaveBeenCalledTimes(5)
		expect(storage.setAlarm).toHaveBeenLastCalledWith(1_003_000)

		// a...
		await advanceTime(1000)
		expect(alarms.a).toHaveBeenCalledTimes(2)
		expect(alarms.b).toHaveBeenCalledTimes(1)
		expect(alarms.c).toHaveBeenCalledTimes(1)
		// called for b, not needed to reschedule c:
		expect(storage.setAlarm).toHaveBeenCalledTimes(6)
		expect(storage.setAlarm).toHaveBeenLastCalledWith(1_004_000)

		// ...b...
		await advanceTime(1000)
		expect(alarms.a).toHaveBeenCalledTimes(2)
		expect(alarms.b).toHaveBeenCalledTimes(2)
		expect(alarms.c).toHaveBeenCalledTimes(1)
		expect(storage.setAlarm).toHaveBeenCalledTimes(7)
		expect(storage.setAlarm).toHaveBeenLastCalledWith(1_005_000)

		// ...c
		await advanceTime(1000)
		expect(alarms.a).toHaveBeenCalledTimes(2)
		expect(alarms.b).toHaveBeenCalledTimes(2)
		expect(alarms.c).toHaveBeenCalledTimes(2)
		expect(storage.setAlarm).toHaveBeenCalledTimes(7)
	})

	test('can schedule the same alarm within an alarm', async () => {
		const { scheduler, storage, advanceTime, alarms } = makeMockAlarmScheduler({
			a: jest.fn(async () => {
				scheduler.scheduleAlarmAfter('a', 1000, { overwrite: 'always' })
			}),
		})

		await scheduler.scheduleAlarmAfter('a', 1000, { overwrite: 'always' })
		expect(storage.setAlarm).toHaveBeenCalledTimes(1)

		await advanceTime(1000)
		expect(alarms.a).toHaveBeenCalledTimes(1)
		expect(storage.setAlarm).toHaveBeenCalledTimes(2)
		expect(storage.setAlarm).toHaveBeenLastCalledWith(1_002_000)
		expect(storage.asObject()).toStrictEqual({ 'alarm-a': 1_002_000 })

		await advanceTime(1000)
		expect(alarms.a).toHaveBeenCalledTimes(2)
		expect(storage.setAlarm).toHaveBeenCalledTimes(3)
		expect(storage.setAlarm).toHaveBeenLastCalledWith(1_003_000)
		expect(storage.asObject()).toStrictEqual({ 'alarm-a': 1_003_000 })
	})

	test('handles retries', async () => {
		const { scheduler, advanceTime, storage, alarms } = await makeMockAlarmScheduler({
			error: jest.fn(async () => {
				throw new Error('something went wrong')
			}),
			ok: jest.fn(),
		})

		await scheduler.scheduleAlarmAfter('error', 1000, { overwrite: 'always' })
		await scheduler.scheduleAlarmAfter('ok', 1000, { overwrite: 'always' })
		expect(storage.asObject()).toStrictEqual({
			'alarm-error': 1_001_000,
			'alarm-ok': 1_001_000,
		})

		jest.spyOn(console, 'log').mockImplementation(noop)
		await expect(async () => advanceTime(1000)).rejects.toThrow(
			'Some alarms failed to fire, scheduling retry'
		)
		expect(alarms.error).toHaveBeenCalledTimes(1)
		expect(alarms.ok).toHaveBeenCalledTimes(1)
		expect(storage.asObject()).toStrictEqual({
			'alarm-error': 1_001_000,
		})
	})
})
