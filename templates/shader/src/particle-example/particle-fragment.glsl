// Rain particle fragment shader
// Renders elongated rain drop effect

precision mediump float;

varying vec4 v_color;
varying float v_speed;

void main() {
    vec2 coord = gl_PointCoord - vec2(0.5);

    // Elongate drops vertically for rain streak effect
    coord.y *= 0.3;

    float dist = length(coord);
    if (dist > 0.5) {
        discard;
    }

    // Soft edges with glow
    float alpha = 1.0 - smoothstep(0.3, 0.5, dist);

    gl_FragColor = vec4(v_color.rgb, v_color.a * alpha);
}
