/**
 * ATTENTION: The algorithm outlined below is hard-coded to a Mandelbulb power of 8.
 */
void nextZPoly(in vec3 cVec, inout vec3 zVec) {
    float x = zVec.x;
    float y = zVec.y;
    float z = zVec.z;
    float x2 = x * x;
    float y2 = y * y;
    float z2 = z * z;
    float x4 = x2 * x2;
    float y4 = y2 * y2;
    float z4 = z2 * z2;

    float k3 = x2 + z2;
    // one over the root of k3 to the 7th power
    float k2 = inversesqrt(k3*k3*k3*k3*k3*k3*k3);
    float k1 = x4 + y4 + z4 - 6.0*y2*z2 - 6.0*x2*y2 + 2.0*z2*x2;
    float k4 = x2 - y2 + z2;

    zVec.x = cVec.x + 64.0*x*y*z*(x2-z2)*k4*(x4-6.0*x2*z2+z4)*k1*k2;
    zVec.y = cVec.y - 16.0*y2*k3*k4*k4 + k1*k1;
    zVec.z = cVec.z - 8.0*y*k4*(x4*x4 - 28.0*x4*x2*z2 + 70.0*x4*z4 - 28.0*x2*z2*z4 + z4*z4)*k1*k2;
}

#pragma glslify: export(nextZPoly)