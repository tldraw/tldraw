import { TLAsset } from './records/TLAsset'
import { TLCamera } from './records/TLCamera'
import { TLDocument } from './records/TLDocument'
import { TLInstance } from './records/TLInstance'
import { TLInstancePageState } from './records/TLInstancePageState'
import { TLInstancePresence } from './records/TLInstancePresence'
import { TLPage } from './records/TLPage'
import { TLPointer } from './records/TLPointer'
import { TLShape } from './records/TLShape'
import { TLUserDocument } from './records/TLUserDocument'

/** @public */
export type TLRecord =
	| TLAsset
	| TLCamera
	| TLDocument
	| TLInstance
	| TLInstancePageState
	| TLPage
	| TLShape
	| TLUserDocument
	| TLInstancePresence
	| TLPointer
