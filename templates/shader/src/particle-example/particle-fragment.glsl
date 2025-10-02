// Fragment shader for rendering particles
// Makes circular point sprites

precision mediump float;

varying vec4 v_color;

void main() {
    // Make particles circular
    vec2 coord = gl_PointCoord - vec2(0.5);
    if (length(coord) > 0.5) {
        discard;
    }
    
    gl_FragColor = v_color;
}

