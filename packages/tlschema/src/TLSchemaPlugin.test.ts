import { T } from '@tldraw/validate'
import { describe, expect, it } from 'vitest'
import { CustomRecordInfo } from './records/TLCustomRecord'
import { assertUniquePluginIds, mergeSchemaPluginRecords } from './TLSchemaPlugin'

const fooConfig: CustomRecordInfo = { scope: 'document', validator: T.any }
const barConfig: CustomRecordInfo = { scope: 'document', validator: T.any }

describe('mergeSchemaPluginRecords', () => {
	it('returns existing records when no plugins are given', () => {
		expect(mergeSchemaPluginRecords(undefined, { foo: fooConfig })).toEqual({ foo: fooConfig })
		expect(mergeSchemaPluginRecords([], undefined)).toBeUndefined()
	})

	it('merges plugin records with existing records', () => {
		const result = mergeSchemaPluginRecords([{ id: 'a', records: { bar: barConfig } }], {
			foo: fooConfig,
		})
		expect(result).toEqual({ foo: fooConfig, bar: barConfig })
	})

	it('throws on duplicate plugin ids', () => {
		expect(() =>
			mergeSchemaPluginRecords([
				{ id: 'a', records: { foo: fooConfig } },
				{ id: 'a', records: { bar: barConfig } },
			])
		).toThrow(/duplicate plugin id/i)
	})

	it('throws on record type collisions across plugins or with existing records', () => {
		expect(() =>
			mergeSchemaPluginRecords([
				{ id: 'a', records: { foo: fooConfig } },
				{ id: 'b', records: { foo: barConfig } },
			])
		).toThrow(/record type/i)
		expect(() =>
			mergeSchemaPluginRecords([{ id: 'a', records: { foo: fooConfig } }], { foo: barConfig })
		).toThrow(/record type/i)
	})
})

describe('assertUniquePluginIds', () => {
	it('throws on duplicates, passes on unique', () => {
		expect(() => assertUniquePluginIds([{ id: 'a' }, { id: 'b' }])).not.toThrow()
		expect(() => assertUniquePluginIds([{ id: 'a' }, { id: 'a' }])).toThrow(/duplicate plugin id/i)
	})
})
