import { vec3 } from "gl-matrix";

import { DEFAULT_EYE, DEFAULT_CENTER, DEFAULT_UP, viewDelta, cameraPosition } from "./globals";
import renderer from './renderer';

function handleKeyDown(event: KeyboardEvent) {
    // set up needed view params
    let lookAt = vec3.create(),
        viewRight = vec3.create(),
        temp = vec3.create(); // lookat, right & temp vectors
    lookAt = vec3.normalize(lookAt,vec3.subtract(temp,cameraPosition.center,cameraPosition.eye)); // get lookat vector
    viewRight = vec3.normalize(viewRight,vec3.cross(temp,lookAt,cameraPosition.up)); // get view right vector

    switch (event.code) {
        case "KeyA": // translate view left, rotate left with shift
            cameraPosition.center = vec3.add(cameraPosition.center,cameraPosition.center,vec3.scale(temp,viewRight,viewDelta));
            if (!event.getModifierState("Shift"))
                cameraPosition.eye = vec3.add(cameraPosition.eye,cameraPosition.eye,vec3.scale(temp,viewRight,viewDelta));
            break;
        case "KeyD": // translate view right, rotate right with shift
            cameraPosition.center = vec3.add(cameraPosition.center,cameraPosition.center,vec3.scale(temp,viewRight,-viewDelta));
            if (!event.getModifierState("Shift"))
                cameraPosition.eye = vec3.add(cameraPosition.eye,cameraPosition.eye,vec3.scale(temp,viewRight,-viewDelta));
            break;
        case "KeyS": // translate view backward, rotate up with shift
            if (event.getModifierState("Shift")) {
                cameraPosition.center = vec3.add(cameraPosition.center,cameraPosition.center,vec3.scale(temp,cameraPosition.up,viewDelta));
                cameraPosition.up = vec3.cross(cameraPosition.up,viewRight,vec3.subtract(lookAt,cameraPosition.center,cameraPosition.eye)); /* global side effect */
            } else {
                cameraPosition.eye = vec3.add(cameraPosition.eye,cameraPosition.eye,vec3.scale(temp,lookAt,-viewDelta));
                cameraPosition.center = vec3.add(cameraPosition.center,cameraPosition.center,vec3.scale(temp,lookAt,-viewDelta));
            } // end if shift not pressed
            break;
        case "KeyW": // translate view forward, rotate down with shift
            if (event.getModifierState("Shift")) {
                cameraPosition.center = vec3.add(cameraPosition.center,cameraPosition.center,vec3.scale(temp,cameraPosition.up,-viewDelta));
                cameraPosition.up = vec3.cross(cameraPosition.up,viewRight,vec3.subtract(lookAt,cameraPosition.center,cameraPosition.eye)); /* global side effect */
            } else {
                cameraPosition.eye = vec3.add(cameraPosition.eye,cameraPosition.eye,vec3.scale(temp,lookAt,viewDelta));
                cameraPosition.center = vec3.add(cameraPosition.center,cameraPosition.center,vec3.scale(temp,lookAt,viewDelta));
            } // end if shift not pressed
            break;
        case "KeyQ": // translate view up, rotate counterclockwise with shift
            if (event.getModifierState("Shift"))
                cameraPosition.up = vec3.normalize(cameraPosition.up,vec3.add(cameraPosition.up,cameraPosition.up,vec3.scale(temp,viewRight,-viewDelta)));
            else {
                cameraPosition.eye = vec3.add(cameraPosition.eye,cameraPosition.eye,vec3.scale(temp,cameraPosition.up,viewDelta));
                cameraPosition.center = vec3.add(cameraPosition.center,cameraPosition.center,vec3.scale(temp,cameraPosition.up,viewDelta));
            } // end if shift not pressed
            break;
        case "KeyE": // translate view down, rotate clockwise with shift
            if (event.getModifierState("Shift"))
                cameraPosition.up = vec3.normalize(cameraPosition.up,vec3.add(cameraPosition.up,cameraPosition.up,vec3.scale(temp,viewRight,viewDelta)));
            else {
                cameraPosition.eye = vec3.add(cameraPosition.eye,cameraPosition.eye,vec3.scale(temp,cameraPosition.up,-viewDelta));
                cameraPosition.center = vec3.add(cameraPosition.center,cameraPosition.center,vec3.scale(temp,cameraPosition.up,-viewDelta));
            } // end if shift not pressed
            break;
        case "Escape": // reset view to default
            resetView();
            break;
    } // end switch

    renderer.resetSampler();
} // end handleKeyDown

function resetView() {
    vec3.copy(cameraPosition.eye, DEFAULT_EYE);
    vec3.copy(cameraPosition.center, DEFAULT_CENTER);
    vec3.copy(cameraPosition.up, DEFAULT_UP);
}

export {
    handleKeyDown,
    resetView,
};