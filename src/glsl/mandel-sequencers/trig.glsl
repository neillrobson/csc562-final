void nextZTrig(in vec3 cVec, in float power, inout vec3 zVec) {
    float r = length(zVec);

    // Convert to polar coordinates
    float theta = acos(zVec.y / r);
    float phi = atan(zVec.x, zVec.z);

    // scale and rotate the point
    float zr = pow(r, power);
    theta = theta * power;
    phi = phi * power;
    
    // convert back to cartesian coordinates
    zVec = zr*vec3(sin(theta)*sin(phi), cos(theta), cos(phi)*sin(theta));
    zVec += cVec;
}

#pragma glslify: export(nextZTrig)