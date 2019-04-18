#version 300 es

precision mediump float;

#pragma glslify: blackbody = require('glsl-colormap/blackbody')

const float SCALE = 2.0;
const int SDF_ITERATIONS = 10;
const int MARCH_ITERATIONS = 90;
const float EPSILON = 0.001;
const float BAILOUT_LENGTH = 5.0;
const float MANDELBULB_POWER = 8.0;
const float SHININESS = 6.0;

const vec3 objAmbient = vec3(0.1, 0.1, 0.1);
const vec3 objDiffuse = vec3(0.6, 0.6, 0.6);
const vec3 objSpecular = vec3(0.3, 0.3, 0.3);
const vec3 lightAmbient = vec3(1.0, 1.0, 1.0);
const vec3 lightDiffuse = vec3(1.0, 1.0, 1.0);
const vec3 lightSpecular = vec3(1.0, 1.0, 1.0);

const vec3 lightPosition = vec3(0.0, 3.0, 0.0);

const vec3 xEpsilon = vec3(EPSILON, 0.0, 0.0);
const vec3 yEpsilon = vec3(0.0, EPSILON, 0.0);
const vec3 zEpsilon = vec3(0.0, 0.0, EPSILON);

uniform vec2 u_resolution;
uniform vec3 u_eye;
uniform mat4 u_targetTransform;

out vec4 color;

bool hitSphere(vec3 center, float radius, vec3 lookOrigin, vec3 lookDirection) {
    vec3 oc = lookOrigin - center;
    float a = dot(lookDirection, lookDirection);
    float b = 2.0 * dot(oc, lookDirection);
    float c = dot(oc, oc) - radius * radius;
    float discriminant = b * b - 4.0 * a * c;
    return discriminant > 0.0;
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
    vec3 z = p;
    float dr = 1.0;
    float r = 0.0;
    for (int i = 0; i < SDF_ITERATIONS; ++i) {
        r = length(z);
        if (r > BAILOUT_LENGTH) break;

        // Convert to polar coordinates
        float theta = acos(z.z / r);
        float phi = atan(z.y, z.x);
        dr = pow(r, MANDELBULB_POWER - 1.0) * MANDELBULB_POWER * dr + 1.0;

        // scale and rotate the point
        float zr = pow(r, MANDELBULB_POWER);
        theta = theta * MANDELBULB_POWER;
        phi = phi * MANDELBULB_POWER;
        
        // convert back to cartesian coordinates
        z = zr*vec3(sin(theta)*cos(phi), sin(phi)*sin(theta), cos(theta));
        z += p;
    }
    escapeZ = z;
    return 0.5 * log(r) * r / dr;
}

vec3 getNormal(in vec3 hitPos) {
    vec3 dummy;
    return normalize(vec3(
        sdMandelbulb(hitPos+xEpsilon, dummy) - sdMandelbulb(hitPos-xEpsilon, dummy),
        sdMandelbulb(hitPos+yEpsilon, dummy) - sdMandelbulb(hitPos-yEpsilon, dummy),
        sdMandelbulb(hitPos+zEpsilon, dummy) - sdMandelbulb(hitPos-zEpsilon, dummy)
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
bool trace(in vec3 from, in vec3 dir, out vec3 hitPos, out vec3 hitNormal, out float complexity) {
    vec3 marchTo;
    vec3 escapeZ;
    float totalStep = 0.0;
    int i;
    if (hitSphere(vec3(0, 0, 0), 2.0, from, dir)) {
        for (i = 0; i < MARCH_ITERATIONS; ++i) {
            marchTo = from + dir * totalStep;
            float nextStep = sdMandelbulb(marchTo, escapeZ);
            if (nextStep < EPSILON) break;
            totalStep += nextStep;
        }
        if (i == MARCH_ITERATIONS) {
            return false;
        } else {
            hitPos = marchTo;
            hitNormal = getNormal(marchTo);
            complexity = (
                float(i) + 1.0 - log(log(length(escapeZ))) / log(MANDELBULB_POWER)
            ) / float(MARCH_ITERATIONS);
            return true;
        }
    }
    return false;
}

void main() {
    // uv is (0, 0) at the center of the screen
    vec2 uv = (2.0 * gl_FragCoord.xy - u_resolution) / u_resolution.y;

    vec3 lookAt = (u_targetTransform * vec4(normalize(vec3(uv, -1.0)), 1.0)).xyz;
    vec3 hitPos;
    vec3 hitNormal;
    vec4 rawColor;
    float marchComplexity;

    bool didHit = trace(u_eye, lookAt, hitPos, hitNormal, marchComplexity);
    rawColor = blackbody(marchComplexity);

    // Early return if no hit
    if (!didHit) {
        color = vec4(1.0, 1.0, 1.0, 1.0);
        return;
    }

    vec3 ambient = objAmbient * lightAmbient;

    vec3 light = normalize(lightPosition - hitPos);
    float lambert = max(0.0, dot(hitNormal, light));
    vec3 diffuse = rawColor.xyz * lightDiffuse * lambert;

    vec3 eye = normalize(u_eye - hitPos);
    vec3 halfVec = normalize(light + eye);
    float highlight = pow(max(0.0, dot(hitNormal, halfVec)), SHININESS);
    vec3 specular = objSpecular * lightSpecular * highlight;

    color = vec4(ambient + diffuse + specular, 1.0);
}