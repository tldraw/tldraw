#version 300 es
precision highp float;
precision highp int;

in vec2 v_uv;
out vec4 fragColor;

uniform vec2 u_resolution;
uniform float u_darkMode;
uniform float u_quality;
uniform float u_zoom;
uniform vec2 u_lightPos;
uniform float u_shadowContrast;

// Constants
#define MAX_SEGMENTS 512
const float LIGHT_SHADOW_ALPHA = 0.5;
const float DARK_SHADOW_ALPHA = 0.15;
const float EPSILON_SMALL = 0.001;
const float DARK_MODE_THRESHOLD = 0.5;

// Geometry data
uniform vec4 u_segments[MAX_SEGMENTS]; // xy = start, zw = end
uniform float u_segmentCount;

// Ray-segment intersection test
// Returns t value if ray intersects segment, -1.0 otherwise
float raySegmentIntersect(vec2 rayOrigin, vec2 rayDir, vec2 segStart, vec2 segEnd) {
	vec2 v1 = rayOrigin - segStart;
	vec2 v2 = segEnd - segStart;
	vec2 v3 = vec2(-rayDir.y, rayDir.x);

	float det = dot(v2, v3);
	if (abs(det) < EPSILON_SMALL) return -1.0;

	float t1 = (v2.x * v1.y - v2.y * v1.x) / det;
	float t2 = dot(v1, v3) / det;

	if (t1 >= 0.0 && t2 >= 0.0 && t2 <= 1.0) {
		return t1;
	}

	return -1.0;
}

// Check if a point is visible from the light (not in shadow)
bool isVisible(vec2 point, vec2 lightPos) {
	vec2 toLight = lightPos - point;
	float distToLight = length(toLight);
	vec2 rayDir = normalize(toLight);
	
	// Check if any segment blocks the light
	for (int i = 0; i < MAX_SEGMENTS; i++) {
		if (float(i) >= u_segmentCount) break;
		
		vec4 segment = u_segments[i];
		vec2 start = segment.xy;
		vec2 end = segment.zw;
		
		float t = raySegmentIntersect(point, rayDir, start, end);

		// If intersection exists and is closer than the light, we're blocked
		// Using small epsilon for normalized coordinates (0-1 range)
		if (t > EPSILON_SMALL && t < distToLight - EPSILON_SMALL) {
			return false;
		}
	}
	
	return true;
}

void main() {
	// v_uv is already in normalized coordinates (0-1)

	// Check if this pixel is visible from the light
	bool visible = isVisible(v_uv, u_lightPos);

	bool isDark = u_darkMode > DARK_MODE_THRESHOLD;

	if (isDark) {
		if (visible) {
			// Visible area is transparent (show canvas)
			// Shadow area - semi-transparent black overlay
			fragColor = vec4(1.0, 1.0, 1.0, u_shadowContrast * DARK_SHADOW_ALPHA);
		} else {
			fragColor = vec4(0.0, 0.0, 0.0, 0.0);
		}
	} else {
		if (visible) {
			// Visible area is transparent (show canvas)
			fragColor = vec4(0.0, 0.0, 0.0, 0.0);
		} else {
			// Shadow area - semi-transparent black overlay
			fragColor = vec4(0.0, 0.0, 0.0, u_shadowContrast * LIGHT_SHADOW_ALPHA);
		}
	}
}