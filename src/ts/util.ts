import { featureToggles } from "./globals";

function reflow(canvas: HTMLCanvasElement) {
    if (featureToggles.screenFillType === 0) {
        canvas.style.width = '100vmin';
        canvas.style.height = '100vmin';
    } else {
        canvas.style.width = '100vmax';
        canvas.style.height = '100vmax';
    }
}

export { reflow };