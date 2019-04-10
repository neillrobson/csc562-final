/**
 * Signed distance function for sphere with radius 1 centered at origin
 */
float sphere(vec3 pos) {
    return length(pos) - 1.0;
}

float sdBox(vec3 p, vec3 b) {
    vec3 d = abs(p) - b;
    return length(max(d,0.0))
        + min(max(d.x,max(d.y,d.z)),0.0);
}

float sdTetra(vec3 p) {
    vec3 a1 = vec3(1,1,1);
    vec3 a2 = vec3(-1,-1,1);
    vec3 a3 = vec3(1,-1,-1);
    vec3 a4 = vec3(-1,1,-1);
    vec3 c;
    int n = 0;
    float dist, d;
    while (n++ < TETRA_ITERATIONS) {
        c = a1;
        dist = length(p - a1);
        d = length(p - a2);
        if (d < dist) {
            c = a2;
            dist = d;
        }
        d = length(p - a3);
        if (d < dist) {
            c = a3;
            dist = d;
        }
        d = length(p - a4);
        if (d < dist) {
            c = a4;
            dist = d;
        }
        p = SCALE * p - c * (SCALE - 1.0);
    }
    return length(p) * pow(SCALE, float(-n));
}

float sdTetraFold(vec3 p) {
    vec3 a1 = vec3(1, 1, 1);
    float r;
    int n = 0;
    while (n++ < TETRA_ITERATIONS) {
        if (p.x + p.y < 0.0) p.xy = -p.yx;
        if (p.x + p.z < 0.0) p.xz = -p.zx;
        if (p.y + p.z < 0.0) p.yz = -p.zy;
        p = SCALE * p - a1 * (SCALE - 1.0);
    }
    return length(p) * pow(SCALE, float(-n));
}