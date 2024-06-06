import { RecordType } from './RecordType'
import { Store } from './Store'

type ExtractRecordType<T extends Store<any>> = T extends Store<infer R> ? R : never

type ExtractR<T extends RecordType<any, any>> = T extends RecordType<infer S, any> ? S : never
