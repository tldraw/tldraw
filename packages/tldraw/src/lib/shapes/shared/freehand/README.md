# Perfect Freehand Script

1. raw input points
2. processed input points 
    1. reduce noise
        1. zoom in, average second point against the first point (streamline)
        2. continue with third against (new) second point
        3. zoom out and apply to all points
        4. add in the last point? not while drawing! only when done
    2. calculate length
    3. have total length
3. calculate pressure
    1. real
    2. simulated (acceleration)
4. apply tapering
5. detect corners
    1. compare directions—have they changed?
    2. add points along an arc
6. add left and right points
    1. but only if they’re far enough away from the last point (smoothing)
7. Add caps
    1. arcs
    2. butts