#version 300 es
precision mediump float;
precision mediump int;

in vec2 v_uv;
out vec4 fragColor;

uniform vec2 u_resolution;
uniform float u_darkMode;
uniform float u_quality;
uniform float u_zoom;
uniform float u_stepSize;
uniform int u_steps;
uniform float u_offset;

// Geometry data
#define MAX_SEGMENTS 512
uniform vec4 u_segments[MAX_SEGMENTS]; // xy = start, zw = end
uniform float u_segmentCount;
  
// Simple noise function
float hash(vec2 p) {
	return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// Rotate through full rainbow spectrum based on step count
vec3 rotateHue(float step, float steps, float offset) {
	float t = mod(step + offset * steps, steps) / steps;
	float hue = t * 6.0; // 0-6 range for six color transitions
	float x = 1.0 - abs(mod(hue, 2.0) - 1.0);

	if (hue < 1.0) return vec3(1.0, x, 0.0);       // Red to Yellow
	else if (hue < 2.0) return vec3(x, 1.0, 0.0);  // Yellow to Green
	else if (hue < 3.0) return vec3(0.0, 1.0, x);  // Green to Cyan
	else if (hue < 4.0) return vec3(0.0, x, 1.0);  // Cyan to Blue
	else if (hue < 5.0) return vec3(x, 0.0, 1.0);  // Blue to Magenta
	else return vec3(1.0, 0.0, x);                 // Magenta to Red
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
	// Scale by quality and zoom to maintain consistent appearance
	float maxDistance = u_stepSize * float(u_steps) * u_quality * u_zoom;

	if (minDist > maxDistance) {
		fragColor = vec4(0.0, 0.0, 0.0, 0.0);
		return;
  }


	// Quantize distance into discrete bands
	float steps = float(u_steps);

	float bandIndex = floor(minDist / (maxDistance/steps));
	minDist = bandIndex * (maxDistance/steps);
	float proximity = smoothstep(maxDistance, 0.0, minDist);

	// Generate rainbow color for this band using rotateHue
	vec3 rainbowColor = rotateHue(bandIndex, steps, u_offset);

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