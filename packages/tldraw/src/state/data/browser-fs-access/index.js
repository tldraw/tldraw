/* eslint-disable */
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck

var w = Object.defineProperty
var q = (e) => w(e, '__esModule', { value: !0 })
var u = (e, t) => () => e && (t = e((e = 0))),
  t
var p = (e, t) => {
  q(e)
  for (var i in t) w(e, i, { get: t[i], enumerable: !0 })
}
var r = (e, t, i) =>
  new Promise((d, a) => {
    var l = (s) => {
        try {
          n(i.next(s))
        } catch (o) {
          a(o)
        }
      },
      c = (s) => {
        try {
          n(i.throw(s))
        } catch (o) {
          a(o)
        }
      },
      n = (s) => (s.done ? d(s.value) : Promise.resolve(s.value).then(l, c))
    n((i = i.apply(e, t)).next())
  })
var y = {}
p(y, { default: () => z })
var z,
  v = u(() => {
    z = (...t) =>
      r(void 0, [...t], function* (e = {}) {
        return new Promise((i, d) => {
          let a = document.createElement('input')
          a.type = 'file'
          let l = [...(e.mimeTypes ? e.mimeTypes : []), e.extensions ? e.extensions : []].join()
          ;(a.multiple = e.multiple || !1), (a.accept = l || '')
          let c,
            n = () => c(d)
          e.setupLegacyCleanupAndRejection
            ? (c = e.setupLegacyCleanupAndRejection(n))
            : ((c = (s) => {
                window.removeEventListener('pointermove', n),
                  window.removeEventListener('pointerdown', n),
                  window.removeEventListener('keydown', n),
                  s && s(new DOMException('The user aborted a request.', 'AbortError'))
              }),
              window.addEventListener('pointermove', n),
              window.addEventListener('pointerdown', n),
              window.addEventListener('keydown', n)),
            a.addEventListener('change', () => {
              c(), i(a.multiple ? Array.from(a.files) : a.files[0])
            }),
            a.click()
        })
      })
  })
var E = {}
p(E, { default: () => B })
var h,
  B,
  j = u(() => {
    ;(h = (e) =>
      r(void 0, null, function* () {
        let t = yield e.getFile()
        return (t.handle = e), t
      })),
      (B = (...t) =>
        r(void 0, [...t], function* (e = {}) {
          let i = yield window.chooseFileSystemEntries({
            accepts: [
              {
                description: e.description || '',
                mimeTypes: e.mimeTypes || ['*/*'],
                extensions: e.extensions || [''],
              },
            ],
            multiple: e.multiple || !1,
          })
          return e.multiple ? Promise.all(i.map(h)) : h(i)
        }))
  })
var g = {}
p(g, { default: () => I })
var G,
  I,
  x = u(() => {
    ;(G = (e) =>
      r(void 0, null, function* () {
        let t = yield e.getFile()
        return (t.handle = e), t
      })),
      (I = (...t) =>
        r(void 0, [...t], function* (e = {}) {
          let i = {}
          e.mimeTypes
            ? e.mimeTypes.map((l) => {
                i[l] = e.extensions || []
              })
            : (i['*/*'] = e.extensions || [])
          let d = yield window.showOpenFilePicker({
              types: [{ description: e.description || '', accept: i }],
              multiple: e.multiple || !1,
            }),
            a = yield Promise.all(d.map(G))
          return e.multiple ? a : a[0]
        }))
  })
var F = {}
p(F, { default: () => K })
var K,
  k = u(() => {
    K = (...t) =>
      r(void 0, [...t], function* (e = {}) {
        return (
          (e.recursive = e.recursive || !1),
          new Promise((i, d) => {
            let a = document.createElement('input')
            ;(a.type = 'file'), (a.webkitdirectory = !0)
            let l,
              c = () => l(d)
            e.setupLegacyCleanupAndRejection
              ? (l = e.setupLegacyCleanupAndRejection(c))
              : ((l = (n) => {
                  window.removeEventListener('pointermove', c),
                    window.removeEventListener('pointerdown', c),
                    window.removeEventListener('keydown', c),
                    n && n(new DOMException('The user aborted a request.', 'AbortError'))
                }),
                window.addEventListener('pointermove', c),
                window.addEventListener('pointerdown', c),
                window.addEventListener('keydown', c)),
              a.addEventListener('change', () => {
                l()
                let n = Array.from(a.files)
                e.recursive || (n = n.filter((s) => s.webkitRelativePath.split('/').length === 2)),
                  i(n)
              }),
              a.click()
          })
        )
      })
  })
var b = {}
p(b, { default: () => Q })
var P,
  Q,
  O = u(() => {
    ;(P = (d, a, ...l) =>
      r(void 0, [d, a, ...l], function* (e, t, i = e.name) {
        let c = [],
          n = []
        for (let s of e.getEntries()) {
          let o = `${i}/${s.name}`
          s.isFile
            ? n.push(
                yield s.getFile().then(
                  (f) => (
                    (f.directoryHandle = e),
                    Object.defineProperty(f, 'webkitRelativePath', {
                      configurable: !0,
                      enumerable: !0,
                      get: () => o,
                    })
                  )
                )
              )
            : s.isDirectory && t && c.push(yield P(s, t, o))
        }
        return [...(yield Promise.all(c)).flat(), ...(yield Promise.all(n))]
      })),
      (Q = (...t) =>
        r(void 0, [...t], function* (e = {}) {
          e.recursive = e.recursive || !1
          let i = yield window.chooseFileSystemEntries({ type: 'open-directory' })
          return P(i, e.recursive)
        }))
  })
var T = {}
p(T, { default: () => V })
var R,
  V,
  S = u(() => {
    ;(R = (d, a, ...l) =>
      r(void 0, [d, a, ...l], function* (e, t, i = e.name) {
        let c = [],
          n = []
        for (let s of e.values()) {
          let o = `${i}/${s.name}`
          s.kind === 'file'
            ? n.push(
                yield s.getFile().then(
                  (f) => (
                    (f.directoryHandle = e),
                    Object.defineProperty(f, 'webkitRelativePath', {
                      configurable: !0,
                      enumerable: !0,
                      get: () => o,
                    })
                  )
                )
              )
            : s.kind === 'directory' && t && c.push(yield R(s, t, o))
        }
        return [...(yield Promise.all(c)).flat(), ...(yield Promise.all(n))]
      })),
      (V = (...t) =>
        r(void 0, [...t], function* (e = {}) {
          e.recursive = e.recursive || !1
          let i = yield window.showDirectoryPicker()
          return R(i, e.recursive)
        }))
  })
var N = {}
p(N, { default: () => Y })
var Y,
  U = u(() => {
    Y = (i, ...d) =>
      r(void 0, [i, ...d], function* (e, t = {}) {
        let a = document.createElement('a')
        ;(a.download = t.fileName || 'Untitled'),
          (a.href = URL.createObjectURL(e)),
          a.addEventListener('click', () => {
            setTimeout(() => URL.revokeObjectURL(a.href), 30 * 1e3)
          }),
          a.click()
      })
  })
var C = {}
p(C, { default: () => Z })
var Z,
  D = u(() => {
    Z = (d, ...a) =>
      r(void 0, [d, ...a], function* (e, t = {}, i = null) {
        ;(t.fileName = t.fileName || 'Untitled'),
          (i =
            i ||
            (yield window.chooseFileSystemEntries({
              type: 'save-file',
              accepts: [
                {
                  description: t.description || '',
                  mimeTypes: [e.type],
                  extensions: t.extensions || [''],
                },
              ],
            })))
        let l = yield i.createWritable()
        return yield l.write(e), yield l.close(), i
      })
  })
var M = {}
p(M, { default: () => _ })
var _,
  W = u(() => {
    _ = (a, ...l) =>
      r(void 0, [a, ...l], function* (e, t = {}, i = null, d = !1) {
        t.fileName = t.fileName || 'Untitled'
        let c = {}
        if (
          (t.mimeTypes
            ? (t.mimeTypes.push(e.type),
              t.mimeTypes.map((o) => {
                c[o] = t.extensions || []
              }))
            : (c[e.type] = t.extensions || []),
          i)
        )
          try {
            yield i.getFile()
          } catch (o) {
            if (((i = null), d)) throw o
          }
        let n =
            i ||
            (yield window.showSaveFilePicker({
              suggestedName: t.fileName,
              types: [{ description: t.description || '', accept: c }],
            })),
          s = yield n.createWritable()
        return yield s.write(e), yield s.close(), n
      })
  })
p(exports, { directoryOpen: () => A, fileOpen: () => L, fileSave: () => $, supported: () => m })
var H = (() => {
    if (typeof window === undefined) return
    if ('top' in window && window !== top)
      try {
        top.location + ''
      } catch (e) {
        return !1
      }
    else {
      if ('chooseFileSystemEntries' in window) return 'chooseFileSystemEntries'
      if ('showOpenFilePicker' in window) return 'showOpenFilePicker'
    }
    return !1
  })(),
  m = H
var J = m
  ? m === 'chooseFileSystemEntries'
    ? Promise.resolve().then(() => (j(), E))
    : Promise.resolve().then(() => (x(), g))
  : Promise.resolve().then(() => (v(), y))
function L(...e) {
  return r(this, null, function* () {
    return (yield J).default(...e)
  })
}
var X = m
  ? m === 'chooseFileSystemEntries'
    ? Promise.resolve().then(() => (O(), b))
    : Promise.resolve().then(() => (S(), T))
  : Promise.resolve().then(() => (k(), F))
function A(...e) {
  return r(this, null, function* () {
    return (yield X).default(...e)
  })
}
var ee = m
  ? m === 'chooseFileSystemEntries'
    ? Promise.resolve().then(() => (D(), C))
    : Promise.resolve().then(() => (W(), M))
  : Promise.resolve().then(() => (U(), N))
function $(...e) {
  return r(this, null, function* () {
    return (yield ee).default(...e)
  })
}
// @license © 2020 Google LLC. Licensed under the Apache License, Version 2.0.
