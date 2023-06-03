import { TLAsset } from './records/TLAsset'
import { TLCamera } from './records/TLCamera'
import { TLDocument } from './records/TLDocument'
import { TLInstance } from './records/TLInstance'
import { TLPage } from './records/TLPage'
import { TLInstancePageState } from './records/TLPageState'
import { TLPointer } from './records/TLPointer'
import { TLInstancePresence } from './records/TLPresence'
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
