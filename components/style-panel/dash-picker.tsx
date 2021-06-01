import { Group, RadioItem } from './shared'
import { DashStyle } from 'types'
import state from 'state'
import { ChangeEvent } from 'react'

function handleChange(e: ChangeEvent<HTMLInputElement>) {
  state.send('CHANGED_STYLE', {
    dash: e.currentTarget.value,
  })
}

interface Props {
  dash: DashStyle
}

export default function DashPicker({ dash }: Props) {
  return (
    <Group name="Dash" onValueChange={handleChange}>
      <RadioItem value={DashStyle.Solid} isActive={dash === DashStyle.Solid}>
        <DashSolidIcon />
      </RadioItem>
      <RadioItem value={DashStyle.Dashed} isActive={dash === DashStyle.Dashed}>
        <DashDashedIcon />
      </RadioItem>
      <RadioItem value={DashStyle.Dotted} isActive={dash === DashStyle.Dotted}>
        <DashDottedIcon />
      </RadioItem>
    </Group>
  )
}

function DashSolidIcon() {
  return (
    <svg width="16" height="16">
      <path d="M 3,8 L 13,8" strokeWidth={3} strokeLinecap="round" />
    </svg>
  )
}

function DashDashedIcon() {
  return (
    <svg width="16" height="16">
      <path
        d="M 2,8 L 14,8"
        strokeWidth={3}
        strokeLinecap="round"
        strokeDasharray="4 4"
      />
    </svg>
  )
}

function DashDottedIcon() {
  return (
    <svg width="16" height="16">
      <path
        d="M 3,8 L 14,8"
        strokeWidth={3}
        strokeLinecap="round"
        strokeDasharray="1 4"
      />
    </svg>
  )
}
