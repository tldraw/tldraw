export * from './sessions'
import { SessionType } from '~types'

import {
  ArrowSession,
  BrushSession,
  DrawSession,
  HandleSession,
  RotateSession,
  TransformSession,
  TransformSingleSession,
  TranslateSession,
  GridSession,
} from './sessions'

export interface SessionsMap {
  [SessionType.Arrow]: typeof ArrowSession
  [SessionType.Brush]: typeof BrushSession
  [SessionType.Draw]: typeof DrawSession
  [SessionType.Handle]: typeof HandleSession
  [SessionType.Rotate]: typeof RotateSession
  [SessionType.Transform]: typeof TransformSession
  [SessionType.TransformSingle]: typeof TransformSingleSession
  [SessionType.Translate]: typeof TranslateSession
  [SessionType.Grid]: typeof GridSession
}

export type SessionOfType<K extends SessionType> = SessionsMap[K]

export type ArgsOfType<K extends SessionType> = ConstructorParameters<SessionOfType<K>>

export const sessions: { [K in SessionType]: SessionsMap[K] } = {
  [SessionType.Arrow]: ArrowSession,
  [SessionType.Brush]: BrushSession,
  [SessionType.Draw]: DrawSession,
  [SessionType.Handle]: HandleSession,
  [SessionType.Rotate]: RotateSession,
  [SessionType.Transform]: TransformSession,
  [SessionType.TransformSingle]: TransformSingleSession,
  [SessionType.Translate]: TranslateSession,
  [SessionType.Grid]: GridSession,
}

export const getSession = <K extends SessionType>(type: K): SessionOfType<K> => {
  return sessions[type]
}
