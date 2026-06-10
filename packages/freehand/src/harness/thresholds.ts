/**
 * How far (relative to the stroke size) the candidate's outline may deviate from the baseline's
 * before we consider the strokes visibly different. At the default stroke sizes this allows
 * sub-pixel-to-a-couple-px differences, which are imperceptible in practice — caps, corners and
 * the overall silhouette must stay put.
 */
export const MAX_DEVIATION_RATIO = 0.25
