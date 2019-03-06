// get the JSON file from the passed URL
function getJSONFile(url: string, descr: string) {
    var httpReq = new XMLHttpRequest(); // a new http request
    httpReq.open("GET", url, false); // init the request
    httpReq.send(null); // send the request
    var startTime = Date.now();
    while ((httpReq.status !== 200) && (httpReq.readyState !== XMLHttpRequest.DONE)) {
        if ((Date.now() - startTime) > 3000)
            break;
    } // until its loaded or we time out after three seconds
    if ((httpReq.status !== 200) || (httpReq.readyState !== XMLHttpRequest.DONE))
        throw "Unable to open " + descr + " file!";
    else
        return JSON.parse(httpReq.response); 
}

class FrameMeasure {
    private lastTime = Date.now();
    private window: Array<number> = [];
    private _fps = 0;

    constructor(private windowSize: number) { };

    public tick() {
        let now = Date.now();
        let thisDelta = (now - this.lastTime) / this.windowSize;
        this.window.push(thisDelta);
        if (this.window.length > this.windowSize) {
            thisDelta -= this.window.shift();
        }
        this._fps += thisDelta;
        this.lastTime = now;
    }

    get fps() {
        return this._fps;
    }
}

function resize(canvas: HTMLCanvasElement) {
    let displayWidth = canvas.clientWidth;
    let displayHeight = canvas.clientHeight;

    if (canvas.width !== displayWidth)
        canvas.width = displayWidth;
    
    if (canvas.height !== displayHeight)
        canvas.height = displayHeight;
}

export { FrameMeasure, resize };