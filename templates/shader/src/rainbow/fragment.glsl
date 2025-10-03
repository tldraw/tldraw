#version 300 es
precision mediump float;
precision mediump int;

in vec2 v_uv;
out vec4 fragColor;

uniform vec2 u_resolution;
uniform float u_darkMode;
uniform float u_quality;
uniform float u_zoom;

// Geometry data
#define STEPS 20.0
#define MAX_SEGMENTS 512
uniform vec4 u_segments[MAX_SEGMENTS]; // xy = start, zw = end
uniform float u_segmentCount;
  
// Simple noise function
float hash(vec2 p) {
	return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	f = f * f * (3.0 - 2.0 * f);
	
	float a = hash(i);
	float b = hash(i + vec2(1.0, 0.0));
	float c = hash(i + vec2(0.0, 1.0));
	float d = hash(i + vec2(1.0, 1.0));
	
	return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// Fractal Brownian Motion for more organic noise
float fbm(vec2 p) {
	float value = 0.0;
	float amplitude = 0.5;
	float frequency = 1.0;
	
	for (int i = 0; i < 4; i++) {
		value += amplitude * noise(p * frequency);
		amplitude *= 0.5;
		frequency *= 2.0;
	}
	
	return value;
}

// Find closest point on line segment to point p
vec2 closestPointOnSegment(vec2 p, vec2 a, vec2 b) {
	vec2 pa = p - a;
	vec2 ba = b - a;
	float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
	return a + ba * h;
}

// Ease out quintic for smooth falloff
float easeOutQuint(float t) {
	return 1.0 - pow(1.0 - t, 5.0);
}

void main() {
	// Convert UV to pixel coordinates
	vec2 pixelPos = v_uv * u_resolution;
	
	float minDist = 1000.0;
	vec2 closestPoint = vec2(0.0);
	
	// Find actual closest point on any segment
	for (int i = 0; i < MAX_SEGMENTS; i++) {
		if (float(i) >= u_segmentCount) break;

		vec4 segment = u_segments[i];
		vec2 start = segment.xy * u_resolution;
		vec2 end = segment.zw * u_resolution;

		vec2 pointOnSegment = closestPointOnSegment(pixelPos, start, end);
		float dist = distance(pixelPos, pointOnSegment);
		
		if (dist < minDist) {
			minDist = dist;
			closestPoint = pointOnSegment;
		}
	}

	
	// Proximity-based rainbow
	// Scale maxDistance by quality and zoom to maintain consistent appearance
	float maxDistance = 200.0 * u_quality * u_zoom;

	if (minDist > maxDistance) {
		fragColor = vec4(0.0, 0.0, 0.0, 0.0);
		return;
  }
	
	
	minDist = floor(minDist / (maxDistance/STEPS)) * (maxDistance/STEPS);
	float proximity = smoothstep(maxDistance, 0.0, minDist);
	
	// Static rainbow based on distance
	// Scale by quality and zoom to maintain consistent color bands
	float hue = mod(minDist * 0.003 / (u_quality * u_zoom), 1.0);
	
	// Convert HSV to RGB (simple approximation)
	vec3 rainbowColor;
	float h = hue * 20.0;
	float x = 1.0 - abs(mod(h, 2.0) - 1.0);
	if (h < 1.0) rainbowColor = vec3(1.0, x, 0.0);       // Red to Yellow
	else if (h < 2.0) rainbowColor = vec3(x, 1.0, 0.0);  // Yellow to Green
	else if (h < 3.0) rainbowColor = vec3(0.0, 1.0, x);  // Green to Cyan
	else if (h < 4.0) rainbowColor = vec3(0.0, x, 1.0);  // Cyan to Blue
	else if (h < 5.0) rainbowColor = vec3(x, 0.0, 1.0);  // Blue to Magenta
	else rainbowColor = vec3(1.0, 0.0, x);               // Magenta to Red

	// Adjust colors for dark mode
	if (u_darkMode > 0.5) {
		// In dark mode, reduce brightness and increase saturation
		rainbowColor = rainbowColor * 0.8;
	} else {
		// In light mode, slightly desaturate for better visibility
		rainbowColor = mix(rainbowColor, vec3(dot(rainbowColor, vec3(0.299, 0.587, 0.114))), 0.1);
	}

	// Opacity with ease out quintic for smooth falloff
	float alpha = easeOutQuint(proximity);

    fragColor = vec4(rainbowColor, alpha);
}