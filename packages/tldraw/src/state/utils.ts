import type { Easing } from '~types'

export const EASINGS: Record<Easing, (t: number) => number> = {
  linear: (t) => t,
  easeInQuad: (t) => t * t,
  easeOutQuad: (t) => t * (2 - t),
  easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeInCubic: (t) => t * t * t,
  easeOutCubic: (t) => --t * t * t + 1,
  easeInOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),
  easeInQuart: (t) => t * t * t * t,
  easeOutQuart: (t) => 1 - --t * t * t * t,
  easeInOutQuart: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - 8 * --t * t * t * t),
  easeInQuint: (t) => t * t * t * t * t,
  easeOutQuint: (t) => 1 + --t * t * t * t * t,
  easeInOutQuint: (t) => (t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * --t * t * t * t * t),
  easeInSine: (t) => 1 - Math.cos((t * Math.PI) / 2),
  easeOutSine: (t) => Math.sin((t * Math.PI) / 2),
  easeInOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  easeInExpo: (t) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
  easeOutExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  easeInOutExpo: (t) =>
    t <= 0
      ? 0
      : t >= 1
      ? 1
      : t < 0.5
      ? Math.pow(2, 20 * t - 10) / 2
      : (2 - Math.pow(2, -20 * t + 10)) / 2,
}

export const EASING_STRINGS: Record<Easing, string> = {
  linear: `(t) => t`,
  easeInQuad: `(t) => t * t`,
  easeOutQuad: `(t) => t * (2 - t)`,
  easeInOutQuad: `(t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t)`,
  easeInCubic: `(t) => t * t * t`,
  easeOutCubic: `(t) => --t * t * t + 1`,
  easeInOutCubic: `(t) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1`,
  easeInQuart: `(t) => t * t * t * t`,
  easeOutQuart: `(t) => 1 - --t * t * t * t`,
  easeInOutQuart: `(t) => t < 0.5 ? 8 * t * t * t * t : 1 - 8 * --t * t * t * t`,
  easeInQuint: `(t) => t * t * t * t * t`,
  easeOutQuint: `(t) => 1 + --t * t * t * t * t`,
  easeInOutQuint: `(t) => t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * --t * t * t * t * t`,
  easeInSine: `(t) => 1 - Math.cos((t * Math.PI) / 2)`,
  easeOutSine: `(t) => Math.sin((t * Math.PI) / 2)`,
  easeInOutSine: `(t) => -(Math.cos(Math.PI * t) - 1) / 2`,
  easeInExpo: `(t) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10))`,
  easeOutExpo: `(t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t))`,
  easeInOutExpo: `(t) => t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2`,
}
