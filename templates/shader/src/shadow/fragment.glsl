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

// Geometry data
#define MAX_SEGMENTS 512
uniform vec4 u_segments[MAX_SEGMENTS]; // xy = start, zw = end
uniform float u_segmentCount;

// Ray-segment intersection test
// Returns t value if ray intersects segment, -1.0 otherwise
float raySegmentIntersect(vec2 rayOrigin, vec2 rayDir, vec2 segStart, vec2 segEnd) {
	vec2 v1 = rayOrigin - segStart;
	vec2 v2 = segEnd - segStart;
	vec2 v3 = vec2(-rayDir.y, rayDir.x);
	
	float det = dot(v2, v3);
	if (abs(det) < 0.001) return -1.0;
	
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
		if (t > 0.001 && t < distToLight - 0.001) {
			return false;
		}
	}
	
	return true;
}

void main() {
	// v_uv is already in normalized coordinates (0-1)

	// Check if this pixel is visible from the light
	bool visible = isVisible(v_uv, u_lightPos);
	
	// Canvas background colors
	vec3 darkBg = vec3(16.0/255.0, 16.0/255.0, 17.0/255.0);
	vec3 lightBg = vec3(249.0/255.0, 250.0/255.0, 251.0/255.0);
	
	vec3 bgColor = u_darkMode > 0.5 ? darkBg : lightBg;
	bool isDark = u_darkMode > 0.5;
	
	if (visible) {
		if (isDark) {
			// Dark mode: Visible area is lighter than background
			vec3 litColor = bgColor + vec3(u_shadowContrast);
			fragColor = vec4(litColor, 1.0);
		} else {
			// Light mode: Visible area is transparent (show canvas)
			fragColor = vec4(0.0, 0.0, 0.0, 0.0);
		}
	} else {
		// Shadow area - darker than background
		vec3 shadowColor = bgColor - vec3(u_shadowContrast * 0.5);
		fragColor = vec4(shadowColor, 1.0);
	}
}