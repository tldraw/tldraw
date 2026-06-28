// Faithful port of tldraw's `svgInk` freehand pipeline to Rust/WASM.
//
// Mirrors, in order and operation:
//   - core.ts          ingest + computeRadii
//   - svgInk.ts        partitionAtElbows + finishPartition + renderPartition
//   - getStrokeOutlinePoints.ts  buildTracks + simplifyTrack
//   - fmt.ts           integer centi-pixel SVG path writer
//
// The goal is byte-for-byte identical path strings vs the JS implementation, so JS float
// semantics are preserved exactly: `Math.round(x)` is `(x + 0.5).floor()` (round half up,
// toward +inf), `x ** 0.5` is `sqrt`, and `| 0` truncation is integer division on
// non-negative values. Trig goes through `libm` so the module needs no host imports.

#![allow(clippy::too_many_arguments)]

use core::f64::consts::PI;

const MIN_PRESSURE: f64 = 0.025;
const RATE_OF_PRESSURE_CHANGE: f64 = 0.275;
const FIXED_PI: f64 = PI + 0.0001;
const TRACK_TOLERANCE_RATIO: f64 = 0.05;
const SIMPLIFY_WINDOW: usize = 8;
const MAX_ROUNDED_CORNER_STEPS: usize = 13;
const HARD_CORNER_DPR: f64 = -0.62;

// Easing selector. Matches EASINGS.linear / EASINGS.easeOutSine and the draw shape's
// local PEN_EASING. These are the only easings the production svgInk path uses.
#[inline]
fn ease(id: u32, t: f64) -> f64 {
    match id {
        1 => libm::sin((t * PI) / 2.0),                       // easeOutSine
        2 => t * 0.65 + libm::sin((t * PI) / 2.0) * 0.35,     // PEN_EASING
        _ => t,                                               // linear
    }
}

// JS Math.round: round half up toward +infinity (NOT Rust's round-half-away-from-zero).
#[inline]
fn js_round(x: f64) -> f64 {
    (x + 0.5).floor()
}

#[inline]
fn to_centi(v: f64) -> i64 {
    js_round(v * 100.0) as i64
}

struct Options {
    size: f64,
    thinning: f64,
    smoothing: f64,
    streamline: f64,
    simulate_pressure: bool,
    easing: u32,
    last: bool,
}

#[derive(Default)]
struct State {
    // raw interleaved [x,y,z,...] written by JS into wasm memory
    input: Vec<f64>,

    // pipeline buffers (one slot per stroke point)
    point_x: Vec<f64>,
    point_y: Vec<f64>,
    input_x: Vec<f64>,
    input_y: Vec<f64>,
    input_z: Vec<f64>,
    pressures: Vec<f64>,
    distances: Vec<f64>,
    running_lengths: Vec<f64>,
    radii: Vec<f64>,
    point_count: usize,

    // staging buffers for ingest
    stage_x: Vec<f64>,
    stage_y: Vec<f64>,
    stage_z: Vec<f64>,

    // track-source buffers
    src_x: Vec<f64>,
    src_y: Vec<f64>,
    src_input_x: Vec<f64>,
    src_input_y: Vec<f64>,
    src_radius: Vec<f64>,
    src_running_length: Vec<f64>,
    src_is_cap: Vec<u8>,
    src_count: usize,

    // outline tracks
    track_left_x: Vec<f64>,
    track_left_y: Vec<f64>,
    track_right_x: Vec<f64>,
    track_right_y: Vec<f64>,
    track_left_count: usize,
    track_right_count: usize,

    // output path bytes
    output: Vec<u8>,
}

#[inline]
fn ensure_f64(v: &mut Vec<f64>, n: usize) {
    if v.len() < n {
        v.resize(n, 0.0);
    }
}
#[inline]
fn ensure_u8(v: &mut Vec<u8>, n: usize) {
    if v.len() < n {
        v.resize(n, 0);
    }
}

impl State {
    fn z_of(p_z: f64, has_z: bool, clamp_z: bool) -> f64 {
        let z = if has_z { p_z } else { 1.0 };
        if clamp_z && z < MIN_PRESSURE {
            MIN_PRESSURE
        } else {
            z
        }
    }

    // ---- Phase 1: ingest (core.ts) ------------------------------------------------------
    fn ingest(&mut self, n_points: usize, o: &Options) {
        self.point_count = 0;
        let raw_len = n_points;
        if raw_len == 0 {
            return;
        }

        let streamline = o.streamline;
        let size = o.size;
        let simulate_pressure = o.simulate_pressure;

        let t = 0.15 + (1.0 - streamline) * 0.85;

        let cap = raw_len + 8;
        ensure_f64(&mut self.stage_x, cap);
        ensure_f64(&mut self.stage_y, cap);
        ensure_f64(&mut self.stage_z, cap);
        ensure_f64(&mut self.point_x, cap);
        ensure_f64(&mut self.point_y, cap);
        ensure_f64(&mut self.input_x, cap);
        ensure_f64(&mut self.input_y, cap);
        ensure_f64(&mut self.input_z, cap);
        ensure_f64(&mut self.pressures, cap);
        ensure_f64(&mut self.distances, cap);
        ensure_f64(&mut self.running_lengths, cap);
        ensure_f64(&mut self.radii, cap);

        let min_dist2 = (size / 3.0) * (size / 3.0);
        let clamp_z = !simulate_pressure;

        // raw input accessor
        let rx = |i: usize| self.input[i * 3];
        let ry = |i: usize| self.input[i * 3 + 1];
        let rz = |i: usize| State::z_of(self.input[i * 3 + 2], true, clamp_z);

        let first_x = rx(0);
        let first_y = ry(0);
        let mut first_z = rz(0);
        let mut start_idx = 1;
        while start_idx < raw_len {
            let dx = rx(start_idx) - first_x;
            let dy = ry(start_idx) - first_y;
            if dx * dx + dy * dy > min_dist2 {
                break;
            }
            first_z = first_z.max(rz(start_idx));
            start_idx += 1;
        }

        self.stage_x[0] = first_x;
        self.stage_y[0] = first_y;
        self.stage_z[0] = first_z;
        let mut m = 1usize;
        for i in start_idx..raw_len {
            self.stage_x[m] = rx(i);
            self.stage_y[m] = ry(i);
            self.stage_z[m] = rz(i);
            m += 1;
        }

        let mut points_removed_from_near_end = 0usize;
        if m > 1 {
            let last_x = self.stage_x[m - 1];
            let last_y = self.stage_y[m - 1];
            let mut j: isize = m as isize - 2;
            while j >= 0 {
                let dx = self.stage_x[j as usize] - last_x;
                let dy = self.stage_y[j as usize] - last_y;
                if dx * dx + dy * dy > min_dist2 {
                    break;
                }
                j -= 1;
                points_removed_from_near_end += 1;
            }
            if j < m as isize - 2 {
                let k = (j + 1) as usize;
                self.stage_x[k] = last_x;
                self.stage_y[k] = last_y;
                self.stage_z[k] = self.stage_z[m - 1];
                m = k + 1;
            }
        }

        let is_complete = o.last
            || !o.simulate_pressure
            || (m > 1 && {
                let dx = self.stage_x[m - 1] - self.stage_x[m - 2];
                let dy = self.stage_y[m - 1] - self.stage_y[m - 2];
                dx * dx + dy * dy < size * size
            })
            || points_removed_from_near_end > 0;

        if m == 2 && o.simulate_pressure {
            let x0 = self.stage_x[0];
            let y0 = self.stage_y[0];
            let z0 = self.stage_z[0];
            let x1 = self.stage_x[1];
            let y1 = self.stage_y[1];
            let z1 = self.stage_z[1];
            for i in 1..5 {
                let u = i as f64 / 4.0;
                self.stage_x[i] = x0 + (x1 - x0) * u;
                self.stage_y[i] = y0 + (y1 - y0) * u;
                self.stage_z[i] = ((z0 + (z1 - z0)) * i as f64) / 4.0;
            }
            m = 5;
        }

        // first point needs no adjustment
        self.point_x[0] = self.stage_x[0];
        self.point_y[0] = self.stage_y[0];
        self.input_x[0] = self.stage_x[0];
        self.input_y[0] = self.stage_y[0];
        self.input_z[0] = self.stage_z[0];
        self.pressures[0] = if simulate_pressure { 0.5 } else { self.stage_z[0] };
        self.distances[0] = 0.0;
        self.running_lengths[0] = 0.0;
        self.radii[0] = 1.0;
        let mut count = 1usize;

        if is_complete && streamline > 0.0 {
            self.stage_x[m] = self.stage_x[m - 1];
            self.stage_y[m] = self.stage_y[m - 1];
            self.stage_z[m] = self.stage_z[m - 1];
            m += 1;
        }

        let mut total_length = 0.0;
        let mut prev_x = self.stage_x[0];
        let mut prev_y = self.stage_y[0];
        let u = 1.0 - t;
        let is_last = o.last;

        for i in 1..m {
            let x: f64;
            let y: f64;
            if t == 0.0 || (is_last && i == m - 1) {
                x = self.stage_x[i];
                y = self.stage_y[i];
            } else {
                x = self.stage_x[i] + (prev_x - self.stage_x[i]) * u;
                y = self.stage_y[i] + (prev_y - self.stage_y[i]) * u;
            }

            if (prev_x - x).abs() < 0.0001 && (prev_y - y).abs() < 0.0001 {
                continue;
            }

            let distance = ((y - prev_y) * (y - prev_y) + (x - prev_x) * (x - prev_x)).sqrt();
            total_length += distance;

            if i < 4 && total_length < size {
                continue;
            }

            self.point_x[count] = x;
            self.point_y[count] = y;
            self.input_x[count] = self.stage_x[i];
            self.input_y[count] = self.stage_y[i];
            self.input_z[count] = self.stage_z[i];
            self.pressures[count] = if simulate_pressure { 0.5 } else { self.stage_z[i] };
            self.distances[count] = distance;
            self.running_lengths[count] = total_length;
            self.radii[count] = 1.0;
            count += 1;
            prev_x = x;
            prev_y = y;
        }

        if total_length < 1.0 {
            let mut max: f64 = 0.5;
            for i in 0..count {
                max = max.max(self.pressures[i]);
            }
            for i in 0..count {
                self.pressures[i] = max;
            }
        }

        self.point_count = count;
    }

    // ---- Phase 2: computeRadii (core.ts) ------------------------------------------------
    // Taper is asserted off in svgInk, so the taper pass is omitted.
    fn compute_radii(&mut self, o: &Options) {
        let size = o.size;
        let thinning = o.thinning;
        let simulate_pressure = o.simulate_pressure;
        let easing = o.easing;

        let n = self.point_count;
        if n == 0 {
            return;
        }

        let total_length = self.running_lengths[n - 1];

        if !simulate_pressure && total_length < size {
            let mut max: f64 = 0.5;
            for i in 0..n {
                max = max.max(self.pressures[i]);
            }
            for i in 0..n {
                self.pressures[i] = max;
                self.radii[i] = size * ease(easing, 0.5 - thinning * (0.5 - max));
            }
            return;
        }

        let mut prev_pressure = self.pressures[0];
        for i in 0..n {
            if self.running_lengths[i] > size * 5.0 {
                break;
            }
            let sp = (self.distances[i] / size).min(1.0);
            let p: f64;
            if simulate_pressure {
                let rp = (1.0 - sp).min(1.0);
                p = (prev_pressure + (rp - prev_pressure) * (sp * RATE_OF_PRESSURE_CHANGE)).min(1.0);
            } else {
                p = (prev_pressure + (self.pressures[i] - prev_pressure) * 0.5).min(1.0);
            }
            prev_pressure += (p - prev_pressure) * 0.5;
        }

        for i in 0..n {
            let radius: f64;
            if thinning != 0.0 {
                let mut pressure = self.pressures[i];
                let sp = (self.distances[i] / size).min(1.0);
                if simulate_pressure {
                    let rp = (1.0 - sp).min(1.0);
                    pressure =
                        (prev_pressure + (rp - prev_pressure) * (sp * RATE_OF_PRESSURE_CHANGE)).min(1.0);
                } else {
                    pressure = (prev_pressure
                        + (pressure - prev_pressure) * (sp * RATE_OF_PRESSURE_CHANGE))
                        .min(1.0);
                }
                radius = size * ease(easing, 0.5 - thinning * (0.5 - pressure));
                prev_pressure = pressure;
            } else {
                radius = size / 2.0;
            }
            self.radii[i] = radius;
        }
    }

    // ---- load track source -------------------------------------------------------------
    fn ensure_src(&mut self, n: usize) {
        ensure_f64(&mut self.src_x, n);
        ensure_f64(&mut self.src_y, n);
        ensure_f64(&mut self.src_input_x, n);
        ensure_f64(&mut self.src_input_y, n);
        ensure_f64(&mut self.src_radius, n);
        ensure_f64(&mut self.src_running_length, n);
        ensure_u8(&mut self.src_is_cap, n);
    }

    fn load_src_from_pipeline(&mut self) {
        let n = self.point_count;
        self.ensure_src(n);
        for i in 0..n {
            self.src_x[i] = self.point_x[i];
            self.src_y[i] = self.point_y[i];
            self.src_input_x[i] = self.input_x[i];
            self.src_input_y[i] = self.input_y[i];
            self.src_radius[i] = self.radii[i];
            self.src_running_length[i] = self.running_lengths[i];
            self.src_is_cap[i] = if i == 0 || i == n - 1 { 1 } else { 0 };
        }
        self.src_count = n;
    }

    fn load_src_partition(
        &mut self,
        a: usize,
        a_elbow: bool,
        inner_start: usize,
        inner_end: isize,
        b: usize,
        b_elbow: bool,
        dup_quirk: bool,
    ) {
        let inner_len = if inner_end >= inner_start as isize {
            (inner_end - inner_start as isize + 1) as usize
        } else {
            0
        };
        self.ensure_src(inner_len + 3);

        self.src_x[0] = if a_elbow { self.input_x[a] } else { self.point_x[a] };
        self.src_y[0] = if a_elbow { self.input_y[a] } else { self.point_y[a] };
        self.src_input_x[0] = self.input_x[a];
        self.src_input_y[0] = self.input_y[a];
        self.src_radius[0] = self.radii[a];
        self.src_running_length[0] = self.running_lengths[a];
        self.src_is_cap[0] = 1;
        let mut w = 1usize;
        if inner_len > 0 {
            for i in inner_start..=(inner_end as usize) {
                self.src_x[w] = self.point_x[i];
                self.src_y[w] = self.point_y[i];
                self.src_input_x[w] = self.input_x[i];
                self.src_input_y[w] = self.input_y[i];
                self.src_radius[w] = self.radii[i];
                self.src_running_length[w] = self.running_lengths[i];
                self.src_is_cap[w] = 0;
                w += 1;
            }
        }
        if dup_quirk {
            self.src_is_cap[w - 1] = 1;
        }
        self.src_x[w] = if b_elbow { self.input_x[b] } else { self.point_x[b] };
        self.src_y[w] = if b_elbow { self.input_y[b] } else { self.point_y[b] };
        self.src_input_x[w] = self.input_x[b];
        self.src_input_y[w] = self.input_y[b];
        self.src_radius[w] = self.radii[b];
        self.src_running_length[w] = self.running_lengths[b];
        self.src_is_cap[w] = 1;
        self.src_count = w + 1;
    }

    // ---- simplifyTrack (getStrokeOutlinePoints.ts) -------------------------------------
    fn simplify_track(xs: &mut [f64], ys: &mut [f64], len: usize, tol: f64) -> usize {
        if len <= 2 || tol <= 0.0 {
            return len;
        }
        let tol2 = tol * tol;
        let mut out = 1usize;
        let mut anchor = 0usize;
        let last_idx = len - 1;
        while anchor < last_idx {
            let mut best = anchor + 1;
            let max_j = if anchor + SIMPLIFY_WINDOW > last_idx {
                last_idx
            } else {
                anchor + SIMPLIFY_WINDOW
            };
            let ax = xs[anchor];
            let ay = ys[anchor];
            'outer: for j in (anchor + 2)..=max_j {
                let acx = xs[j] - ax;
                let acy = ys[j] - ay;
                let l2 = acx * acx + acy * acy;
                for k in (anchor + 1)..j {
                    let mut tt = if l2 == 0.0 {
                        0.0
                    } else {
                        ((xs[k] - ax) * acx + (ys[k] - ay) * acy) / l2
                    };
                    tt = if tt < 0.0 { 0.0 } else if tt > 1.0 { 1.0 } else { tt };
                    let ex = xs[k] - (ax + acx * tt);
                    let ey = ys[k] - (ay + acy * tt);
                    if ex * ex + ey * ey > tol2 {
                        break 'outer;
                    }
                }
                best = j;
            }
            xs[out] = xs[best];
            ys[out] = ys[best];
            out += 1;
            anchor = best;
        }
        out
    }

    // ---- buildTracks (getStrokeOutlinePoints.ts) ---------------------------------------
    fn build_tracks(&mut self, o: &Options, has_anchor: bool, anchor_x: f64, anchor_y: f64) {
        let size = o.size;
        let smoothing = o.smoothing;

        self.track_left_count = 0;
        self.track_right_count = 0;
        let n = self.src_count;
        if n == 0 || size <= 0.0 {
            return;
        }

        // generous capacity: each point can emit a full rounded corner
        let track_cap = n * (MAX_ROUNDED_CORNER_STEPS + 2) + 16;
        ensure_f64(&mut self.track_left_x, track_cap);
        ensure_f64(&mut self.track_left_y, track_cap);
        ensure_f64(&mut self.track_right_x, track_cap);
        ensure_f64(&mut self.track_right_y, track_cap);

        let total_length = self.src_running_length[n - 1];
        let min_distance = (size * smoothing) * (size * smoothing);

        let mut cur_vec_x = 1.0;
        let mut cur_vec_y = 1.0;
        if n > 1 {
            let dx = self.src_x[0] - self.src_x[1];
            let dy = self.src_y[0] - self.src_y[1];
            let l = (dx * dx + dy * dy).sqrt();
            if l == 0.0 {
                cur_vec_x = dx;
                cur_vec_y = dy;
            } else {
                cur_vec_x = dx / l;
                cur_vec_y = dy / l;
            }
        }

        let mut prev_vec_x = cur_vec_x;
        let mut prev_vec_y = cur_vec_y;

        let mut plx = self.src_x[0];
        let mut ply = self.src_y[0];
        let mut prx = plx;
        let mut pry = ply;

        let mut tlx = plx;
        let mut tly = ply;
        let mut trx = prx;
        let mut tr_y = pry;

        let mut is_prev_point_sharp_corner = false;

        let mut lc = 0usize;
        let mut rc = 0usize;

        for i in 0..n {
            let point_x = self.src_x[i];
            let point_y = self.src_y[i];
            let radius = self.src_radius[i];
            let vec_x = cur_vec_x;
            let vec_y = cur_vec_y;

            let mut next_vec_x = vec_x;
            let mut next_vec_y = vec_y;
            if i < n - 1 {
                let (from_x, from_y) = if i == 0 && n > 2 && has_anchor {
                    (anchor_x, anchor_y)
                } else {
                    (point_x, point_y)
                };
                let dx = from_x - self.src_x[i + 1];
                let dy = from_y - self.src_y[i + 1];
                let l = (dx * dx + dy * dy).sqrt();
                if l == 0.0 {
                    next_vec_x = dx;
                    next_vec_y = dy;
                } else {
                    next_vec_x = dx / l;
                    next_vec_y = dy / l;
                }
            }
            cur_vec_x = next_vec_x;
            cur_vec_y = next_vec_y;

            let prev_dpr = vec_x * prev_vec_x + vec_y * prev_vec_y;
            let next_dpr = if i < n - 1 {
                next_vec_x * vec_x + next_vec_y * vec_y
            } else {
                1.0
            };

            let is_point_sharp_corner = prev_dpr < 0.0 && !is_prev_point_sharp_corner;
            let is_next_point_sharp_corner = next_dpr < 0.2;

            if is_point_sharp_corner || is_next_point_sharp_corner {
                if next_dpr > HARD_CORNER_DPR && total_length - self.src_running_length[i] > radius {
                    let offset_x = prev_vec_x * radius;
                    let offset_y = prev_vec_y * radius;
                    let cpr = prev_vec_x * next_vec_y - prev_vec_y * next_vec_x;

                    if cpr < 0.0 {
                        tlx = point_x + offset_x;
                        tly = point_y + offset_y;
                        trx = point_x - offset_x;
                        tr_y = point_y - offset_y;
                    } else {
                        tlx = point_x - offset_x;
                        tly = point_y - offset_y;
                        trx = point_x + offset_x;
                        tr_y = point_y + offset_y;
                    }

                    self.track_left_x[lc] = tlx;
                    self.track_left_y[lc] = tly;
                    lc += 1;
                    self.track_right_x[rc] = trx;
                    self.track_right_y[rc] = tr_y;
                    rc += 1;
                } else {
                    let in_x = self.src_input_x[i];
                    let in_y = self.src_input_y[i];
                    let dx = -prev_vec_y * radius;
                    let dy = prev_vec_x * radius;

                    let step = 1.0 / MAX_ROUNDED_CORNER_STEPS as f64;
                    let mut tt = 0.0;
                    while tt < 1.0 {
                        let mut angle = FIXED_PI * tt;
                        let mut s = libm::sin(angle);
                        let mut c = libm::cos(angle);
                        tlx = in_x + (dx * c - dy * s);
                        tly = in_y + (dx * s + dy * c);
                        self.track_left_x[lc] = tlx;
                        self.track_left_y[lc] = tly;
                        lc += 1;

                        angle = FIXED_PI + FIXED_PI * -tt;
                        s = libm::sin(angle);
                        c = libm::cos(angle);
                        trx = in_x + (dx * c - dy * s);
                        tr_y = in_y + (dx * s + dy * c);
                        self.track_right_x[rc] = trx;
                        self.track_right_y[rc] = tr_y;
                        rc += 1;

                        tt += step;
                    }
                }

                plx = tlx;
                ply = tly;
                prx = trx;
                pry = tr_y;

                if is_next_point_sharp_corner {
                    is_prev_point_sharp_corner = true;
                }
                continue;
            }

            is_prev_point_sharp_corner = false;

            if self.src_is_cap[i] != 0 {
                let offset_x = vec_y * radius;
                let offset_y = -vec_x * radius;
                self.track_left_x[lc] = point_x - offset_x;
                self.track_left_y[lc] = point_y - offset_y;
                lc += 1;
                self.track_right_x[rc] = point_x + offset_x;
                self.track_right_y[rc] = point_y + offset_y;
                rc += 1;
                continue;
            }

            let lerped_x = next_vec_x + (vec_x - next_vec_x) * next_dpr;
            let lerped_y = next_vec_y + (vec_y - next_vec_y) * next_dpr;
            let offset_x = lerped_y * radius;
            let offset_y = -lerped_x * radius;

            tlx = point_x - offset_x;
            tly = point_y - offset_y;
            if i <= 1 || (plx - tlx) * (plx - tlx) + (ply - tly) * (ply - tly) > min_distance {
                self.track_left_x[lc] = tlx;
                self.track_left_y[lc] = tly;
                lc += 1;
                plx = tlx;
                ply = tly;
            }

            trx = point_x + offset_x;
            tr_y = point_y + offset_y;
            if i <= 1 || (prx - trx) * (prx - trx) + (pry - tr_y) * (pry - tr_y) > min_distance {
                self.track_right_x[rc] = trx;
                self.track_right_y[rc] = tr_y;
                rc += 1;
                prx = trx;
                pry = tr_y;
            }

            prev_vec_x = vec_x;
            prev_vec_y = vec_y;
        }

        let tolerance = size * TRACK_TOLERANCE_RATIO;
        self.track_left_count =
            State::simplify_track(&mut self.track_left_x, &mut self.track_left_y, lc, tolerance);
        self.track_right_count =
            State::simplify_track(&mut self.track_right_x, &mut self.track_right_y, rc, tolerance);
    }

    // ---- fmt.ts writers ----------------------------------------------------------------
    #[inline]
    fn write_str(&mut self, s: &str) {
        self.output.extend_from_slice(s.as_bytes());
    }

    fn write_c(&mut self, mut n: i64) {
        if n < 0 {
            self.output.push(b'-');
            n = -n;
        }
        let i = n / 100;
        let f = n - i * 100;
        if i == 0 {
            if f == 0 {
                self.output.push(b'0');
                return;
            }
        } else if i < 10 {
            self.output.push(b'0' + i as u8);
        } else if i < 100 {
            self.output.push(b'0' + (i / 10) as u8);
            self.output.push(b'0' + (i % 10) as u8);
        } else {
            let start = self.output.len();
            let mut m = i;
            while m > 0 {
                self.output.push(b'0' + (m % 10) as u8);
                m /= 10;
            }
            self.output[start..].reverse();
        }
        if f != 0 {
            self.output.push(b'.');
            let d2 = f % 10;
            self.output.push(b'0' + (f / 10) as u8);
            if d2 != 0 {
                self.output.push(b'0' + d2 as u8);
            }
        }
    }

    #[inline]
    fn write_c_pair(&mut self, nx: i64, ny: i64) {
        self.write_c(nx);
        self.output.push(b',');
        self.write_c(ny);
        self.output.push(b' ');
    }

    // toDomPrecision(v) = Math.round(v * 1e4) / 1e4, then JS Number#toString — the shortest
    // representation, which for a multiple of 1e-4 is the <=4-decimal value with trailing
    // zeros trimmed and a leading "0" before the point (unlike write_c's ".5" form).
    fn write_dom(&mut self, v: f64) {
        let mut k = js_round(v * 1e4) as i64;
        if k < 0 {
            self.output.push(b'-');
            k = -k;
        }
        let int = k / 10000;
        let frac = k % 10000;
        if int == 0 {
            self.output.push(b'0');
        } else {
            let start = self.output.len();
            let mut m = int;
            while m > 0 {
                self.output.push(b'0' + (m % 10) as u8);
                m /= 10;
            }
            self.output[start..].reverse();
        }
        if frac != 0 {
            self.output.push(b'.');
            let digits = [
                (frac / 1000) % 10,
                (frac / 100) % 10,
                (frac / 10) % 10,
                frac % 10,
            ];
            let mut last = 3i32;
            while last >= 0 && digits[last as usize] == 0 {
                last -= 1;
            }
            for d in digits.iter().take((last + 1) as usize) {
                self.output.push(b'0' + *d as u8);
            }
        }
    }

    /// `precise(points[i])` from editor utils: "x,y " at dom precision.
    fn write_precise(&mut self, i: usize) {
        let x = self.input[i * 3];
        let y = self.input[i * 3 + 1];
        self.write_dom(x);
        self.output.push(b',');
        self.write_dom(y);
        self.output.push(b' ');
    }

    /// `average(points[i], points[j])` from editor utils: midpoint "x,y " at dom precision.
    fn write_average(&mut self, i: usize, j: usize) {
        let x = (self.input[i * 3] + self.input[j * 3]) / 2.0;
        let y = (self.input[i * 3 + 1] + self.input[j * 3 + 1]) / 2.0;
        self.write_dom(x);
        self.output.push(b',');
        self.write_dom(y);
        self.output.push(b' ');
    }

    // getSvgPathFromPoints (editor utils): quadratic path through point midpoints, used by
    // the scribble overlays. Reads points straight from the input buffer (x, y; z ignored).
    fn run_get_svg_path_from_points(&mut self, n: usize, closed: bool) {
        self.output.clear();
        if n < 2 {
            return;
        }
        if n == 2 {
            self.write_str("M");
            self.write_precise(0);
            self.write_str("L");
            self.write_precise(1);
            return;
        }
        if closed {
            self.write_str("M");
            self.write_average(0, 1);
            self.write_str("Q");
            self.write_precise(1);
            self.write_average(1, 2);
            self.write_str("T");
            for i in 2..(n - 1) {
                self.write_average(i, i + 1);
            }
            self.write_average(n - 1, 0);
            self.write_average(0, 1);
            self.write_str("Z");
        } else {
            self.write_str("M");
            self.write_precise(0);
            self.write_str("Q");
            self.write_precise(1);
            self.write_average(1, 2);
            if n > 3 {
                self.write_str("T");
            }
            for i in 2..(n - 1) {
                self.write_average(i, i + 1);
            }
            self.write_str("L");
            self.write_precise(n - 1);
        }
    }

    fn write_circle_path(&mut self, cx: f64, cy: f64, r: f64) {
        let ncx = to_centi(cx);
        let ncy = to_centi(cy);
        let nr = to_centi(r);
        self.write_str("M ");
        self.write_c(ncx);
        self.write_str(" ");
        self.write_c(ncy);
        self.write_str(" m -");
        self.write_c(nr);
        self.write_str(", 0 a ");
        self.write_c(nr);
        self.write_str(",");
        self.write_c(nr);
        self.write_str(" 0 1,1 ");
        self.write_c(nr * 2);
        self.write_str(",0 a ");
        self.write_c(nr);
        self.write_str(",");
        self.write_c(nr);
        self.write_str(" 0 1,1 -");
        self.write_c(nr * 2);
        self.write_str(",0");
    }

    fn write_cap_arc(&mut self, nr: i64, dx: i64, dy: i64) {
        self.write_str("a");
        self.write_c(nr);
        self.write_str(",");
        self.write_c(nr);
        self.write_str(" 0 0 1 ");
        self.write_c_pair(dx, dy);
    }

    // ---- renderPartition (svgInk.ts) ---------------------------------------------------
    fn render_partition(&mut self, o: &Options, has_anchor: bool, anchor_x: f64, anchor_y: f64) {
        let n = self.src_count;
        if n == 0 {
            return;
        }
        if n == 1 {
            self.write_circle_path(self.src_x[0], self.src_y[0], self.src_radius[0]);
            return;
        }

        self.build_tracks(o, has_anchor, anchor_x, anchor_y);

        let mut cx = to_centi(self.track_left_x[0]);
        let mut cy = to_centi(self.track_left_y[0]);
        self.write_str("M");
        self.write_c_pair(cx, cy);
        self.write_str("t");

        let mut prev_x = self.track_left_x[0];
        let mut prev_y = self.track_left_y[0];
        for i in 1..self.track_left_count {
            let ptx = self.track_left_x[i];
            let pty = self.track_left_y[i];
            let mx = js_round((prev_x + ptx) * 50.0) as i64;
            let my = js_round((prev_y + pty) * 50.0) as i64;
            self.write_c_pair(mx - cx, my - cy);
            cx = mx;
            cy = my;
            prev_x = ptx;
            prev_y = pty;
        }

        // end cap arc
        {
            let point_x = self.src_x[n - 1];
            let point_y = self.src_y[n - 1];
            let radius = self.src_radius[n - 1];
            let vdx = self.src_x[n - 2] - point_x;
            let vdy = self.src_y[n - 2] - point_y;
            let vlen = (vdx * vdx + vdy * vdy).sqrt();
            let dx = (-vdy / vlen) * radius;
            let dy = (vdx / vlen) * radius;
            let asx = to_centi(point_x + dx);
            let asy = to_centi(point_y + dy);
            let aex = to_centi(point_x - dx);
            let aey = to_centi(point_y - dy);
            self.write_c_pair(asx - cx, asy - cy);
            self.write_cap_arc(to_centi(radius), aex - asx, aey - asy);
            self.write_str("t");
            cx = aex;
            cy = aey;
        }

        // right track in reverse
        prev_x = self.track_right_x[self.track_right_count - 1];
        prev_y = self.track_right_y[self.track_right_count - 1];
        let mut i = self.track_right_count as isize - 2;
        while i >= 0 {
            let ptx = self.track_right_x[i as usize];
            let pty = self.track_right_y[i as usize];
            let mx = js_round((prev_x + ptx) * 50.0) as i64;
            let my = js_round((prev_y + pty) * 50.0) as i64;
            self.write_c_pair(mx - cx, my - cy);
            cx = mx;
            cy = my;
            prev_x = ptx;
            prev_y = pty;
            i -= 1;
        }

        // start cap arc
        {
            let point_x = self.src_x[0];
            let point_y = self.src_y[0];
            let radius = self.src_radius[0];
            let vdx = point_x - self.src_x[1];
            let vdy = point_y - self.src_y[1];
            let vlen = (vdx * vdx + vdy * vdy).sqrt();
            let dx = (vdy / vlen) * radius;
            let dy = (-vdx / vlen) * radius;
            let asx = to_centi(point_x + dx);
            let asy = to_centi(point_y + dy);
            let aex = to_centi(point_x - dx);
            let aey = to_centi(point_y - dy);
            self.write_c_pair(asx - cx, asy - cy);
            self.write_cap_arc(to_centi(radius), aex - asx, aey - asy);
            self.write_str("Z");
        }
    }

    // ---- finishPartition (svgInk.ts) ---------------------------------------------------
    fn finish_partition(
        &mut self,
        a: usize,
        a_elbow: bool,
        b: usize,
        b_elbow: bool,
        b_dup: bool,
        mut has_anchor: bool,
        mut anchor_x: f64,
        mut anchor_y: f64,
        o: &Options,
    ) {
        let len: isize = (b as isize - a as isize) + 1 + if b_dup { 1 } else { 0 };
        let mut s: isize = 0;
        let mut e: isize = 0;

        let start_x = if a_elbow { self.input_x[a] } else { self.point_x[a] };
        let start_y = if a_elbow { self.input_y[a] } else { self.point_y[a] };
        let start_radius = self.radii[a];
        while len - s > 2 {
            let i = a + 1 + s as usize;
            let dx = start_x - self.point_x[i];
            let dy = start_y - self.point_y[i];
            let thresh = ((start_radius + self.radii[i]) / 2.0) * 0.5;
            if dx * dx + dy * dy < thresh * thresh {
                has_anchor = true;
                anchor_x = self.point_x[i];
                anchor_y = self.point_y[i];
                s += 1;
            } else {
                break;
            }
        }

        let end_x = if b_elbow { self.input_x[b] } else { self.point_x[b] };
        let end_y = if b_elbow { self.input_y[b] } else { self.point_y[b] };
        let end_radius = self.radii[b];
        while len - s - e > 2 {
            let i = if b_dup { b - e as usize } else { b - 1 - e as usize };
            let dx = end_x - self.point_x[i];
            let dy = end_y - self.point_y[i];
            let thresh = ((end_radius + self.radii[i]) / 2.0) * 0.5;
            if dx * dx + dy * dy < thresh * thresh {
                e += 1;
            } else {
                break;
            }
        }

        let inner_start = a + 1 + s as usize;
        let inner_end: isize = if b_dup {
            b as isize - e
        } else {
            b as isize - 1 - e
        };
        self.load_src_partition(
            a,
            a_elbow,
            inner_start,
            inner_end,
            b,
            b_elbow,
            b_dup && e == 0,
        );
        self.render_partition(o, has_anchor, anchor_x, anchor_y);
    }

    // ---- partitionAtElbows (svgInk.ts) -------------------------------------------------
    fn partition_at_elbows(&mut self, o: &Options) {
        let n = self.point_count;
        if n == 0 {
            return;
        }
        if n <= 2 {
            self.load_src_from_pipeline();
            self.render_partition(o, false, 0.0, 0.0);
            return;
        }

        let mut a = 0usize;
        let mut a_elbow = false;
        let mut has_anchor = false;
        let mut anchor_x = 0.0;
        let mut anchor_y = 0.0;

        let mut dx = self.point_x[1] - self.point_x[0];
        let mut dy = self.point_y[1] - self.point_y[0];
        let mut len = (dx * dx + dy * dy).sqrt();
        let mut prev_vx = dx / len;
        let mut prev_vy = dy / len;

        for i in 1..(n - 1) {
            dx = self.point_x[i + 1] - self.point_x[i];
            dy = self.point_y[i + 1] - self.point_y[i];
            len = (dx * dx + dy * dy).sqrt();
            let next_vx = dx / len;
            let next_vy = dy / len;
            let dpr = prev_vx * next_vx + prev_vy * next_vy;
            prev_vx = next_vx;
            prev_vy = next_vy;

            if dpr < -0.8 {
                self.finish_partition(a, a_elbow, i, true, false, has_anchor, anchor_x, anchor_y, o);
                a = i;
                a_elbow = true;
                has_anchor = true;
                anchor_x = self.point_x[i];
                anchor_y = self.point_y[i];
                continue;
            }

            if dpr > 0.7 {
                continue;
            }

            let pdx = self.point_x[i] - self.point_x[i - 1];
            let pdy = self.point_y[i] - self.point_y[i - 1];
            let ndx = self.point_x[i + 1] - self.point_x[i];
            let ndy = self.point_y[i + 1] - self.point_y[i];
            let mean_radius = (self.radii[i - 1] + self.radii[i] + self.radii[i + 1]) / 3.0;
            if (pdx * pdx + pdy * pdy + ndx * ndx + ndy * ndy) / (mean_radius * mean_radius) < 1.5 {
                self.finish_partition(a, a_elbow, i, false, true, has_anchor, anchor_x, anchor_y, o);
                a = i;
                a_elbow = false;
                has_anchor = false;
                continue;
            }
        }
        self.finish_partition(a, a_elbow, n - 1, false, false, has_anchor, anchor_x, anchor_y, o);
    }

    fn run_svg_ink(&mut self, n_points: usize, o: &Options) {
        self.output.clear();
        self.ingest(n_points, o);
        if self.point_count == 0 {
            return;
        }
        self.compute_radii(o);
        self.partition_at_elbows(o);
    }

    // ---- getSvgPathFromStrokePoints (svg.ts) -------------------------------------------
    // Quadratic curves through the streamlined centerline points. Uses only x/y (no radii),
    // so this path runs ingest but not computeRadii. `closed` joins the ends.
    fn write_svg_from_points(&mut self, closed: bool) {
        let len = self.point_count;
        if len < 2 {
            return;
        }

        if len == 2 {
            let ax = to_centi(self.point_x[0]);
            let ay = to_centi(self.point_y[0]);
            self.write_str("M");
            self.write_c_pair(ax, ay);
            self.write_str("l");
            let dx = to_centi(self.point_x[1]) - ax;
            let dy = to_centi(self.point_y[1]) - ay;
            self.write_c_pair(dx, dy);
            return;
        }

        let first_x = self.point_x[0];
        let first_y = self.point_y[0];
        let second_x = self.point_x[1];
        let second_y = self.point_y[1];
        let third_x = self.point_x[2];
        let third_y = self.point_y[2];

        let second_cx = to_centi(second_x);
        let second_cy = to_centi(second_y);
        let m01x = js_round((first_x + second_x) * 50.0) as i64;
        let m01y = js_round((first_y + second_y) * 50.0) as i64;
        let m12x = js_round((second_x + third_x) * 50.0) as i64;
        let m12y = js_round((second_y + third_y) * 50.0) as i64;

        let mut cx = m12x;
        let mut cy = m12y;

        if closed {
            self.write_str("M");
            self.write_c_pair(m01x, m01y);
            self.write_str("q");
            self.write_c_pair(second_cx - m01x, second_cy - m01y);
            self.write_c_pair(m12x - m01x, m12y - m01y);
            self.write_str("t");
        } else {
            let first_cx = to_centi(first_x);
            let first_cy = to_centi(first_y);
            self.write_str("M");
            self.write_c_pair(first_cx, first_cy);
            self.write_str("q");
            self.write_c_pair(second_cx - first_cx, second_cy - first_cy);
            self.write_c_pair(m12x - first_cx, m12y - first_cy);
            if len > 3 {
                self.write_str("t");
            }
        }

        let max = len - 1;
        for i in 2..max {
            let px = self.point_x[i];
            let py = self.point_y[i];
            let qx = self.point_x[i + 1];
            let qy = self.point_y[i + 1];
            let mx = js_round((px + qx) * 50.0) as i64;
            let my = js_round((py + qy) * 50.0) as i64;
            self.write_c_pair(mx - cx, my - cy);
            cx = mx;
            cy = my;
        }

        let last_x = self.point_x[len - 1];
        let last_y = self.point_y[len - 1];

        if closed {
            let m_last_x = js_round((last_x + first_x) * 50.0) as i64;
            let m_last_y = js_round((last_y + first_y) * 50.0) as i64;
            self.write_c_pair(m_last_x - cx, m_last_y - cy);
            self.write_c_pair(m01x - m_last_x, m01y - m_last_y);
            self.write_str("Z");
        } else {
            self.write_str("l");
            self.write_c_pair(to_centi(last_x) - cx, to_centi(last_y) - cy);
        }
    }

    fn run_svg_from_points(&mut self, n_points: usize, o: &Options, closed: bool) {
        self.output.clear();
        self.ingest(n_points, o);
        self.write_svg_from_points(closed);
    }
}

// ---- C ABI ----------------------------------------------------------------------------
// Single-threaded wasm: one reusable State, non-reentrant like the JS pipeline buffers.

static mut STATE: Option<State> = None;

#[inline]
fn state() -> &'static mut State {
    // SAFETY: wasm is single-threaded; calls are synchronous and non-reentrant.
    unsafe {
        let ptr = core::ptr::addr_of_mut!(STATE);
        if (*ptr).is_none() {
            *ptr = Some(State::default());
        }
        (*ptr).as_mut().unwrap()
    }
}

/// Ensure the input buffer holds at least `n_floats` and return a pointer to it. JS writes
/// interleaved [x, y, z, ...] (3 floats per point) here before calling `svg_ink`.
#[no_mangle]
pub extern "C" fn points_ptr(n_floats: usize) -> *mut f64 {
    let s = state();
    ensure_f64(&mut s.input, n_floats);
    s.input.as_mut_ptr()
}

/// Generate the SVG path for the points currently in the input buffer. Returns the byte
/// length of the result; read it from `output_ptr()`.
#[no_mangle]
pub extern "C" fn svg_ink(
    n_points: usize,
    size: f64,
    thinning: f64,
    smoothing: f64,
    streamline: f64,
    simulate_pressure: u32,
    easing: u32,
    last: u32,
) -> usize {
    let o = Options {
        size,
        thinning,
        smoothing,
        streamline,
        simulate_pressure: simulate_pressure != 0,
        easing,
        last: last != 0,
    };
    let s = state();
    s.run_svg_ink(n_points, &o);
    s.output.len()
}

#[no_mangle]
pub extern "C" fn output_ptr() -> *const u8 {
    state().output.as_ptr()
}

/// Centerline path (getStrokePoints + getSvgPathFromStrokePoints): solid/fill stroke render
/// for draw and highlight shapes. Returns the byte length of the path; read from
/// `output_ptr()`. The number of streamlined points is available via `last_point_count()`
/// so the caller can decide whether to draw a dot instead.
#[no_mangle]
pub extern "C" fn svg_from_points(
    n_points: usize,
    size: f64,
    thinning: f64,
    smoothing: f64,
    streamline: f64,
    simulate_pressure: u32,
    easing: u32,
    last: u32,
    closed: u32,
) -> usize {
    let o = Options {
        size,
        thinning,
        smoothing,
        streamline,
        simulate_pressure: simulate_pressure != 0,
        easing,
        last: last != 0,
    };
    let s = state();
    s.run_svg_from_points(n_points, &o, closed != 0);
    s.output.len()
}

/// The number of streamlined points produced by the most recent ingest. Equals
/// `getStrokePoints(...).length`; used to choose the dot branch.
#[no_mangle]
pub extern "C" fn last_point_count() -> usize {
    state().point_count
}

/// getSvgPathFromPoints (editor utils): quadratic path through the points in the input
/// buffer (x, y interleaved; z ignored). Used by the scribble overlays. Returns the byte
/// length of the path; read from `output_ptr()`.
#[no_mangle]
pub extern "C" fn get_svg_path_from_points(n_points: usize, closed: u32) -> usize {
    let s = state();
    s.run_get_svg_path_from_points(n_points, closed != 0);
    s.output.len()
}
