void nextZTrig(in vec3 cVec, in float power, inout vec3 zVec) {
    float r = length(zVec);

    // Convert to polar coordinates
    float theta = acos(zVec.z / r);
    float phi = atan(zVec.y, zVec.x);

    // scale and rotate the point
    float zr = pow(r, power);
    theta = theta * power;
    phi = phi * power;
    
    // convert back to cartesian coordinates
    zVec = zr*vec3(sin(theta)*cos(phi), sin(phi)*sin(theta), cos(theta));
    zVec += cVec;
}

#pragma glslify: export(nextZTrig)