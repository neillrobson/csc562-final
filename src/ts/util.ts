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

function resize(canvas: HTMLCanvasElement) {
    let displayWidth = canvas.clientWidth;
    let displayHeight = canvas.clientHeight;

    if (canvas.width !== displayWidth)
        canvas.width = displayWidth;
    
    if (canvas.height !== displayHeight)
        canvas.height = displayHeight;
}

function reflow(canvas: HTMLCanvasElement) {
    if (window.innerHeight > window.innerWidth) {
        canvas.style.width = '100vw';
        canvas.style.height = `${canvas.clientWidth}px`;
    } else {
        canvas.style.height = '100vh';
        canvas.style.width = `${canvas.clientHeight}px`;
    }
}

export { resize, reflow };