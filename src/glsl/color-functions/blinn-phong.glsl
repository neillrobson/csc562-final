#pragma glslify: blackbody = require('glsl-colormap/blackbody')

const float SHININESS = 6.0;

const vec3 objAmbient = vec3(0.1, 0.1, 0.1);
const vec3 objDiffuse = vec3(0.6, 0.6, 0.6);
const vec3 objSpecular = vec3(0.3, 0.3, 0.3);
const vec3 lightAmbient = vec3(1.0, 1.0, 1.0);
const vec3 lightDiffuse = vec3(1.0, 1.0, 1.0);
const vec3 lightSpecular = vec3(1.0, 1.0, 1.0);

const vec3 lightPosition = vec3(0.0, 3.0, 0.0);

vec3 getColorBlinnPhong(vec3 from, vec3 dir) {
    vec3 hitPos;
    vec3 hitNormal;
    vec4 rawColor;
    float marchComplexity;

    bool didHit = trace(from, dir, hitPos, hitNormal, marchComplexity);
    rawColor = blackbody(marchComplexity);

    // Early return if no hit
    if (!didHit) {
        return vec3(1.0);
    }

    vec3 ambient = objAmbient * lightAmbient;

    vec3 light = normalize(lightPosition - hitPos);
    float lambert = max(0.0, dot(hitNormal, light));
    vec3 diffuse = rawColor.xyz * lightDiffuse * lambert;

    vec3 eye = normalize(from - hitPos);
    vec3 halfVec = normalize(light + eye);
    float highlight = pow(max(0.0, dot(hitNormal, halfVec)), SHININESS);
    vec3 specular = objSpecular * lightSpecular * highlight;

    return ambient + diffuse + specular;
}

#pragma glslify: export(getColorBlinnPhong)