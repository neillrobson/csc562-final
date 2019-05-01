precision highp float;

#pragma glslify: yignbu = require('glsl-colormap/yignbu')
#pragma glslify: nextZTrig = require('./mandel-sequencers/trig.glsl');

const float PI = 3.141592653589793238462643383279502884197169;
const int MAX_BOUNCES = 16;
const int MAX_Z_FUNCTION_ITERATIONS = 16;
const int MAX_RAY_MARCH_ITERATIONS = 128;
const float EPSILON = 0.001;
const float BAILOUT_LENGTH = 3.0;
const vec3 X_EPSILON = vec3(EPSILON, 0.0, 0.0);
const vec3 Y_EPSILON = vec3(0.0, EPSILON, 0.0);
const vec3 Z_EPSILON = vec3(0.0, 0.0, EPSILON);
const vec3 LIGHT_COLOR = vec3(1.0);
const vec3 FRACTAL_COLOR = vec3(0.9);

uniform sampler2D source;
uniform sampler2D tRand2Normal;
uniform sampler2D tRand3Normal;
uniform sampler2D tRand2Uniform;
// Avoids sampling the same area between frames
uniform vec2 rand;
uniform vec3 eye;
uniform vec3 skyboxColorUp;
uniform vec3 skyboxColorDown;
uniform int backgroundType;
uniform int bounces;
uniform int rayMarchIterations;
uniform int shadingType;
uniform int viewportHeight;
uniform int viewportWidth;
uniform int zFunctionIterations;
uniform float lightIntensity;
uniform float lightRadius;
uniform float lightTheta;
uniform float lightPhi;
uniform float fractalRoughness;
uniform bool antialias;
uniform bool useDirectLighting;
uniform bool usePreethamModel;
uniform mat4 targetTransform;
uniform float turbidity;
uniform float SkyFactor;
uniform float mandelbulbPower;

// Avoids sampling the same area within a frame
vec2 randState = vec2(0.0);
vec2 resolution = vec2(viewportWidth, viewportHeight);
vec2 SunPos = vec2(lightTheta, lightPhi);
float sunAngularDiameterCos = cos(lightRadius*PI/180.0);

// Source for orthogonal vector calculator: http://lolengine.net/blog/2013/09/21/picking-orthogonal-vector-combing-coconuts
vec3 ortho(in vec3 v) {
    return abs(v.x) > abs(v.z) ? vec3(-v.y, v.x, 0.0) : vec3(0.0, -v.z, v.y);
}

// Source for ray-sphere intersection: http://viclw17.github.io/2018/07/16/raytracing-ray-sphere-intersection/
bool raySphereIntersect(in vec3 rayOrigin, in vec3 rayDirection, in vec3 sphereOrigin, in float sphereRadius, out float t) {
    t = 1.0; // Set t to a positive value to signal whether or not we failed the discriminant test
    vec3 sphereToEye = rayOrigin - sphereOrigin;
    float a = dot(rayDirection, rayDirection);
    float b = 2.0 * dot(sphereToEye, rayDirection);
    float c = dot(sphereToEye, sphereToEye) - sphereRadius * sphereRadius;
    float discriminant = b * b - 4.0 * a * c;
    if (discriminant < 0.0) return false;
    // We always want the smaller of the two solutions (the intersection closer to the ray origin)
    t = (-b - sqrt(discriminant)) / (2.0 * a);
    return t >= 0.0;
}

// A random vec2 whose coordinates are distributed around zero according to a normal curve.
vec2 fRand2Uniform() {
    vec2 ret = texture2D(tRand2Uniform, gl_FragCoord.xy / resolution + rand.xy + randState).ba;
    randState += ret;
    return ret;
}

// A random vec2 that lies on the unit circle.
vec2 fRand2Normal() {
    vec2 ret = texture2D(tRand2Normal, gl_FragCoord.xy / resolution + rand.xy + randState).ba;
    randState += ret;
    return ret;
}

// A random vec3 that lies on the unit sphere.
vec3 fRand3Normal() {
    vec3 ret = texture2D(tRand3Normal, gl_FragCoord.xy / resolution + rand.xy + randState).rgb;
    randState += ret.xy;
    return ret;
}

// A random vec3 within the hemisphere centered on dir.
vec3 getSampleUnweighted(vec3 dir) {
    vec3 ret = fRand3Normal();
    if (dot(ret, dir) < 0.0) {
        ret *= -1.0;
    }
    return ret;
}

// A cosine-weighted vec3 within the hemisphere centered on dir.
vec3 getSampleWeighted(vec3 dir) {
    return normalize(normalize(dir) + fRand3Normal());
}

// A cosine-weighted vec3 within the solid angle centered on dir.
vec3 getConeSample(vec3 dir, float maxCos) {
    vec3 nDir = normalize(dir);
    vec3 o1 = normalize(ortho(nDir));
    vec3 o2 = normalize(cross(nDir, o1));
    vec2 rand2 = fRand2Uniform();
    float u = 2.0 * PI * rand2.x;
    float z = 1.0 - rand2.y * (1.0 - maxCos);
    float oneminus = sqrt(1.0 - z * z);
    return cos(u) * oneminus * o1 + sin(u) * oneminus * o2 + z * nDir;
}

vec3 fromSpherical(vec2 p) {
	return vec3(
		cos(p.x)*sin(p.y),
		cos(p.y),
		sin(p.x)*sin(p.y)
    );
}
	
vec3 getSunDirection() {
    return normalize(fromSpherical((SunPos-vec2(0.0,0.5))*vec2(6.28,3.14)));
}

vec3 getBackground(vec3 dir) {
    if (dot(getSunDirection(), dir) >= sunAngularDiameterCos) {
        return LIGHT_COLOR;
    } else if (backgroundType == 0) {
        return mix(skyboxColorDown, skyboxColorUp, acos(-normalize(dir).y) / PI);
    } else {
        return yignbu(acos(-normalize(dir).y) / PI).xyz;
    }
}

/**
 * Given a starting point, return information about the Mandelbulb's escape
 * behavior at that location.
 *
 * escapeZ: The z-value of the first element in the recursive Mandlebrot
 * function that ventured outside the boundary.
 * return: How far away the given point is from the fractal's surface.
 */
float sdMandelbulb(in vec3 p, out vec3 escapeZ) {
    vec3 zVec = p;
    float dr = 1.0;
    float r = 0.0;
    for (int i = 0; i < MAX_Z_FUNCTION_ITERATIONS; ++i) {
        if (i >= zFunctionIterations) break;
        r = length(zVec);
        if (r > BAILOUT_LENGTH) break;

        dr = pow(r, mandelbulbPower - 1.0) * mandelbulbPower * dr + 1.0;

        nextZTrig(p, mandelbulbPower, zVec);
    }
    escapeZ = zVec;
    return 0.5 * log(r) * r / dr;
}

vec3 getMandelbulbNormal(in vec3 hitPos) {
    vec3 dummy;
    return normalize(vec3(
        sdMandelbulb(hitPos+X_EPSILON, dummy) - sdMandelbulb(hitPos-X_EPSILON, dummy),
        sdMandelbulb(hitPos+Y_EPSILON, dummy) - sdMandelbulb(hitPos-Y_EPSILON, dummy),
        sdMandelbulb(hitPos+Z_EPSILON, dummy) - sdMandelbulb(hitPos-Z_EPSILON, dummy)
    ));
}

/**
 * Given a starting point and direction, path-trace a line to the nearest
 * intersection and return the position of that intersection, the normal at that
 * point, and complex the calculation was (on a scale of zero to one, one being
 * the most complex).
 *
 * from: Starting location of the look vector
 * dir: Direction along which to shoot the path-tracing ray
 * hitPos: Point of intersection between ray and object
 * hitNormal: Normal vector at the point of intersection
 * complexity: Roughly how "long" it took for the path marcher to terminate
 * RETURN: True if an intersection was found
 */
bool trace(in vec3 from, in vec3 dir, out vec3 hitPos, out vec3 hitNormal, out float complexity, out bool hitLight) {
    bool hit = false;
    float totalStep = 0.0;
    hitLight = (dot(getSunDirection(), dir) >= sunAngularDiameterCos);
    vec3 marchTo;
    vec3 escapeZ;
    float dummy;
    int itr;

    // Mandelbulb intersection
    if (raySphereIntersect(from, dir, vec3(0, 0, 0), 1.2, dummy) || dummy < 0.0) {
        for (int i = 0; i < MAX_RAY_MARCH_ITERATIONS; ++i) {
            itr = i;
            if (i >= rayMarchIterations) break;
            marchTo = from + dir * totalStep;
            float nextStep = sdMandelbulb(marchTo, escapeZ);
            if (nextStep < EPSILON) break;
            totalStep += nextStep;
        }
        if (itr < rayMarchIterations) {
            hitPos = marchTo;
            hitNormal = getMandelbulbNormal(marchTo);
            hitLight = false;
            hit = true;
            complexity = (
                float(itr) + 1.0 - log(log(length(escapeZ))) / log(mandelbulbPower)
            ) / float(rayMarchIterations);
        }
    }
    return hit;
}

// ###################################################################################

const float mieCoefficient = 0.005;
const float mieDirectionalG = 0.80;

const float n = 1.0003; // refractive index of air
const float N = 2.545E25; // number of molecules per unit volume for air at
// 288.15K and 1013mb (sea level -45 celsius)

// wavelength of used primaries, according to preetham
const vec3 primaryWavelengths = vec3(680E-9, 550E-9, 450E-9);

// mie stuff
// K coefficient for the primaries
const vec3 K = vec3(0.686, 0.678, 0.666);
const float v = 4.0;

// optical length at zenith for molecules
const float rayleighZenithLength = 8.4E3;
const float mieZenithLength = 1.25E3;
const vec3 up = vec3(0.0, 1.0, 0.0);

const float sunIntensity = 1000.0;

// earth shadow hack
const float cutoffAngle = PI/1.95;
const float steepness = 1.5;

float RayleighPhase(float cosViewSunAngle) {
	return (3.0 / (16.0*PI)) * (1.0 + pow(cosViewSunAngle, 2.0));
}

vec3 totalMie(vec3 primaryWavelengths, vec3 K, float T) {
	float c = (0.2 * T ) * 10E-18;
	return 0.434 * c * PI * pow((2.0 * PI) / primaryWavelengths, vec3(v - 2.0)) * K;
}

float hgPhase(float cosViewSunAngle, float g) {
	return (1.0 / (4.0*PI)) * ((1.0 - pow(g, 2.0)) / pow(1.0 - 2.0*g*cosViewSunAngle + pow(g, 2.0), 1.5));
}

float SunIntensity(float zenithAngleCos) {
	return sunIntensity * max(0.0, 1.0 - exp(-((cutoffAngle - acos(zenithAngleCos))/steepness)));
}

vec3 sun(vec3 viewDir) {
    vec3 sunDirection = getSunDirection();
	// Cos Angles
	float cosViewSunAngle = dot(viewDir, sunDirection);
	float cosSunUpAngle = dot(sunDirection, up);
	float cosUpViewAngle = dot(up, viewDir);

	float sunE = SunIntensity(cosSunUpAngle);  // Get sun intensity based on how high in the sky it is
	// extinction (asorbtion + out scattering)
	// rayleigh coeficients
	vec3 rayleighAtX = vec3(5.176821E-6, 1.2785348E-5, 2.8530756E-5);
	
	// mie coefficients
	vec3 mieAtX = totalMie(primaryWavelengths, K, turbidity) * mieCoefficient;
	
	// optical length
	// cutoff angle at 90 to avoid singularity in next formula.
	float zenithAngle = max(0.0, cosUpViewAngle);
	
	float rayleighOpticalLength = rayleighZenithLength / zenithAngle;
	float mieOpticalLength = mieZenithLength / zenithAngle;
	
	// combined extinction factor
	vec3 Fex = exp(-(rayleighAtX * rayleighOpticalLength + mieAtX * mieOpticalLength));
	
	// in scattering
	vec3 rayleighXtoEye = rayleighAtX * RayleighPhase(cosViewSunAngle);
	vec3 mieXtoEye = mieAtX *  hgPhase(cosViewSunAngle, mieDirectionalG);
	
	vec3 totalLightAtX = rayleighAtX + mieAtX;
	vec3 lightFromXtoEye = rayleighXtoEye + mieXtoEye;
	
	vec3 somethingElse = sunE * (lightFromXtoEye / totalLightAtX);
	
	vec3 sky = somethingElse * (1.0 - Fex);
	sky *= mix(vec3(1.0),pow(somethingElse * Fex,vec3(0.5)),clamp(pow(1.0-dot(up, sunDirection),5.0),0.0,1.0));
	// composition + solar disc
	
	float sundisk = sunAngularDiameterCos < cosViewSunAngle ? 1.0 : 0.0;
	vec3 sun = (sunE * 19000.0 * Fex)*sundisk;
	
	return 0.01*sun;
}

vec3 sky(vec3 viewDir) {
    vec3 sunDirection = getSunDirection();
	// Cos Angles
	float cosViewSunAngle = dot(viewDir, sunDirection);
	float cosSunUpAngle = dot(sunDirection, up);
	float cosUpViewAngle = dot(up, viewDir);
	
	float sunE = SunIntensity(cosSunUpAngle);  // Get sun intensity based on how high in the sky it is
	// extinction (asorbtion + out scattering)
	// rayleigh coeficients
	vec3 rayleighAtX = vec3(5.176821E-6, 1.2785348E-5, 2.8530756E-5);
	
	// mie coefficients
	vec3 mieAtX = totalMie(primaryWavelengths, K, turbidity) * mieCoefficient;
	
	// optical length
	// cutoff angle at 90 to avoid singularity in next formula.
	float zenithAngle = max(0.0, cosUpViewAngle);
	
	float rayleighOpticalLength = rayleighZenithLength / zenithAngle;
	float mieOpticalLength = mieZenithLength / zenithAngle;
	
	// combined extinction factor
	vec3 Fex = exp(-(rayleighAtX * rayleighOpticalLength + mieAtX * mieOpticalLength));
	
	// in scattering
	vec3 rayleighXtoEye = rayleighAtX * RayleighPhase(cosViewSunAngle);
	vec3 mieXtoEye = mieAtX *  hgPhase(cosViewSunAngle, mieDirectionalG);
	
	vec3 totalLightAtX = rayleighAtX + mieAtX;
	vec3 lightFromXtoEye = rayleighXtoEye + mieXtoEye;
	
	vec3 somethingElse = sunE * (lightFromXtoEye / totalLightAtX);
	
	vec3 sky = somethingElse * (1.0 - Fex);
	sky *= mix(vec3(1.0),pow(somethingElse * Fex,vec3(0.5)),clamp(pow(1.0-dot(up, sunDirection),5.0),0.0,1.0));
	// composition + solar disc
	
	float sundisk = smoothstep(sunAngularDiameterCos,sunAngularDiameterCos+0.00002,cosViewSunAngle);
	vec3 sun = (sunE * 19000.0 * Fex)*sundisk;
	
	return SkyFactor*0.01*(sky);
}

vec3 sunsky(vec3 viewDir) {
    if (sunAngularDiameterCos == 1.0) {
        return vec3(1.0,0.0,0.0);	
    }

    vec3 sunDirection = getSunDirection();
	// Cos Angles
	float cosViewSunAngle = dot(viewDir, sunDirection);
	float cosSunUpAngle = dot(sunDirection, up);
	float cosUpViewAngle = dot(up, viewDir);

	float sunE = SunIntensity(cosSunUpAngle);  // Get sun intensity based on how high in the sky it is
	// extinction (asorbtion + out scattering)
	// rayleigh coeficients
	vec3 rayleighAtX = vec3(5.176821E-6, 1.2785348E-5, 2.8530756E-5);
	
	// mie coefficients
	vec3 mieAtX = totalMie(primaryWavelengths, K, turbidity) * mieCoefficient;
	
	// optical length
	// cutoff angle at 90 to avoid singularity in next formula.
	float zenithAngle = max(0.0, cosUpViewAngle);
	
	float rayleighOpticalLength = rayleighZenithLength / zenithAngle;
	float mieOpticalLength = mieZenithLength / zenithAngle;
	
	// combined extinction factor
	vec3 Fex = exp(-(rayleighAtX * rayleighOpticalLength + mieAtX * mieOpticalLength));
	
	// in scattering
	vec3 rayleighXtoEye = rayleighAtX * RayleighPhase(cosViewSunAngle);
	vec3 mieXtoEye = mieAtX *  hgPhase(cosViewSunAngle, mieDirectionalG);
	
	vec3 totalLightAtX = rayleighAtX + mieAtX;
	vec3 lightFromXtoEye = rayleighXtoEye + mieXtoEye;
	
	vec3 somethingElse = sunE * (lightFromXtoEye / totalLightAtX);
	
	vec3 sky = somethingElse * (1.0 - Fex);
	sky *= mix(vec3(1.0),pow(somethingElse * Fex,vec3(0.5)),clamp(pow(1.0-dot(up, sunDirection),5.0),0.0,1.0));
	// composition + solar disc
	
	float sundisk = smoothstep(sunAngularDiameterCos,sunAngularDiameterCos+0.00002,cosViewSunAngle);
	vec3 sun = (sunE * 19000.0 * Fex)*sundisk;
	
	return 0.01*(sun+SkyFactor*sky);
}

// ###################################################################################

vec3 getColorGI(in vec3 from, in vec3 dir) {
    vec3 pos = from;
    vec3 ray = dir;
    vec3 color = vec3(1.0);
    vec3 direct = vec3(0.0);

    for (int i = 0; i < MAX_BOUNCES; ++i) {
        if (i >= bounces) {
            return direct;
        };
        vec3 hitPos;
        vec3 hitNormal;
        bool hitLight;
        float dummyFloat;
        vec3 dummyVec;

        // Hit nothing (skybox)
        if (!trace(pos, ray, hitPos, hitNormal, dummyFloat, hitLight)) {
            if (usePreethamModel) {
                if (useDirectLighting) {
                    color *= (i > 0 ? sky(ray) : sunsky(ray));
                } else {
                    color *= sunsky(ray);
                }
            } else {
                color *= getBackground(ray);
            }
            break;
        }

        // Hit fractal
        color *= FRACTAL_COLOR;

        if (useDirectLighting) {
            // Soft shadows
            vec3 lightSampleRay = getConeSample(getSunDirection(), sunAngularDiameterCos);
            float lightCos = dot(hitNormal, lightSampleRay);
            if (
                lightCos > 0.0
                && !trace(hitPos + hitNormal * EPSILON, lightSampleRay, dummyVec, dummyVec, dummyFloat, hitLight)
                && hitLight
            ) {
                if (usePreethamModel) {
                    direct += color * sun(lightSampleRay) * lightCos * 1E-5;
                } else {
                    vec3 oldPosRay = normalize(pos - hitPos);
                    vec3 halfVec = normalize(lightSampleRay + oldPosRay);
                    float d = clamp(dot(hitNormal, halfVec), 0.0, 1.0);
                    direct += d * lightIntensity * LIGHT_COLOR * color;
                }
            }
        }

        ray = normalize(mix(reflect(ray, hitNormal), getSampleWeighted(hitNormal), fractalRoughness));
        // Ensure that the new position does not hit the object at the same point
        pos = hitPos + ray * EPSILON;
    }
    
    return direct + color;
}

#pragma glslify: getColorBlinnPhong = require('./color-functions/blinn-phong.glsl', trace=trace);

void main() {
    vec3 sourceRgb = texture2D(source, gl_FragCoord.xy / resolution).rgb;

    vec2 jitter = vec2(0.0);
    if (antialias) {
        jitter = fRand2Uniform() - 0.5;
    }

    // lookAtCoords is (0, 0) at the center of the screen
    vec2 lookAtCoords = 2.0 * (gl_FragCoord.xy + jitter) / resolution - 1.0;
    vec3 lookAt = (targetTransform * vec4(normalize(vec3(lookAtCoords, -1.0)), 1.0)).xyz;

    if (shadingType == 0) {
        gl_FragColor = vec4(sourceRgb + getColorBlinnPhong(eye, lookAt), 1.0);
    } else if (shadingType == 1) {
        gl_FragColor = vec4(sourceRgb + getColorGI(eye, lookAt), 1.0);
    }
}