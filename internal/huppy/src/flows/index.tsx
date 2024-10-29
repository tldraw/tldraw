import { collectClaSignatures } from './collectClaSignatures'
import { enforcePrLabels } from './enforcePrLabels'
import { standaloneExamplesBranch } from './standaloneExamplesBranch'

export const allFlows = [enforcePrLabels, standaloneExamplesBranch, collectClaSignatures]
