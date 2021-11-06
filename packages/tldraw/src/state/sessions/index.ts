import { SessionType } from '~types'
import { ArrowSession } from './ArrowSession'
import { BrushSession } from './BrushSession'
import { DrawSession } from './DrawSession'
import { HandleSession } from './HandleSession'
import { RotateSession } from './RotateSession'
import { TransformSession } from './TransformSession'
import { TransformSingleSession } from './TransformSingleSession'
import { TranslateSession } from './TranslateSession'
import { GridSession } from './GridSession'

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
