import { TLAsset } from './records/TLAsset'
import { TLCamera } from './records/TLCamera'
import { TLDocument } from './records/TLDocument'
import { TLInstance } from './records/TLInstance'
import { TLInstancePageState } from './records/TLInstancePageState'
import { TLPage } from './records/TLPage'
import { TLShape } from './records/TLShape'
import { TLUser } from './records/TLUser'
import { TLUserDocument } from './records/TLUserDocument'
import { TLUserPresence } from './records/TLUserPresence'

/** @public */
export type TLRecord =
	| TLAsset
	| TLCamera
	| TLDocument
	| TLInstance
	| TLInstancePageState
	| TLPage
	| TLShape
	| TLUser
	| TLUserDocument
	| TLUserPresence
