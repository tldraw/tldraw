import {
  CodeControl,
  ControlType,
  NumberCodeControl,
  VectorCodeControl,
} from 'types'
import { uniqueId } from 'utils'

export const controls: Record<string, any> = {}

export const codeControls = new Set<CodeControl>([])

/* ----------------- Start Copy Here ---------------- */

export class Control<T extends CodeControl> {
  control: T

  constructor(control: Omit<T, 'id'>) {
    this.control = { ...control, id: uniqueId() } as T
    codeControls.add(this.control)

    // Could there be a better way to prevent this?
    // When updating, constructor should just bind to
    // the existing control rather than creating a new one?
    if (!(window as any).isUpdatingCode) {
      controls[this.control.label] = this.control.value
    }
  }

  destroy(): void {
    codeControls.delete(this.control)
    delete controls[this.control.label]
  }

  get value(): T['value'] {
    return this.control.value
  }

  set value(value: T['value']) {
    this.control.value = value
  }
}

type ControlProps<T extends CodeControl> = Omit<Partial<T>, 'id' | 'type'>

export class NumberControl extends Control<NumberCodeControl> {
  constructor(options: ControlProps<NumberCodeControl>) {
    const { label = 'Number', value = 0, step = 1 } = options
    super({
      type: ControlType.Number,
      ...options,
      label,
      value,
      step,
    })
  }
}

export class VectorControl extends Control<VectorCodeControl> {
  constructor(options: ControlProps<VectorCodeControl>) {
    const { label = 'Vector', value = [0, 0], isNormalized = false } = options
    super({
      type: ControlType.Vector,
      ...options,
      label,
      value,
      isNormalized,
    })
  }
}
