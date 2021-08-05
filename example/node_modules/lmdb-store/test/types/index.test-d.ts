import { expectType } from 'tsd'
import { open, RootDatabase } from '../..'

const path = 'type-test-store'

expectType<RootDatabase>(open(path, { compression: true }))
expectType<RootDatabase>(open({ path, compression: true }))

const defaultStore = open({ path, compression: true })
expectType<boolean>(await defaultStore.put('foo', { bar: 'baz' }))
expectType<any>(defaultStore.get('foo'))

const typedStore = open<string>({ path, compression: true })
expectType<string | undefined>(typedStore.get('foo'))
