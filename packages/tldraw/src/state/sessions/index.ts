import { ExceptFirst, SessionType } from '~types'
import { ArrowSession } from './ArrowSession'
import { BrushSession } from './BrushSession'
import { DrawSession } from './DrawSession'
import { HandleSession } from './HandleSession'
import { RotateSession } from './RotateSession'
import { TransformSession } from './TransformSession'
import { TransformSingleSession } from './TransformSingleSession'
import { TranslateSession } from './TranslateSession'
import { EraseSession } from './EraseSession'
import { GridSession } from './GridSession'

export type TldrawSession =
  | ArrowSession
  | BrushSession
  | DrawSession
  | HandleSession
  | RotateSession
  | TransformSession
  | TransformSingleSession
  | TranslateSession
  | EraseSession
  | GridSession

export interface SessionsMap {
  [SessionType.Arrow]: typeof ArrowSession
  [SessionType.Brush]: typeof BrushSession
  [SessionType.Draw]: typeof DrawSession
  [SessionType.Erase]: typeof EraseSession
  [SessionType.Handle]: typeof HandleSession
  [SessionType.Rotate]: typeof RotateSession
  [SessionType.Transform]: typeof TransformSession
  [SessionType.TransformSingle]: typeof TransformSingleSession
  [SessionType.Translate]: typeof TranslateSession
  [SessionType.Grid]: typeof GridSession
}

export type SessionOfType<K extends SessionType> = SessionsMap[K]

export type SessionArgsOfType<K extends SessionType> = ExceptFirst<
  ConstructorParameters<SessionOfType<K>>
>

export const sessions: { [K in SessionType]: SessionsMap[K] } = {
  [SessionType.Arrow]: ArrowSession,
  [SessionType.Brush]: BrushSession,
  [SessionType.Draw]: DrawSession,
  [SessionType.Erase]: EraseSession,
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
