import { createSelectorHook, createState } from "@state-designer/react"

const state = createState({})

export default state

export const useSelector = createSelectorHook(state)
