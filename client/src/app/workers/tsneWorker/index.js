import { PWBHost } from "promise-worker-bi";
import Worker from 'worker-loader!./tsneWorker'

let worker
let promiseWorker

const send = message => promiseWorker.postMessage({type: 'message', message})
const receive = callback => promiseWorker.register(callback);
const terminate = () =>{worker.terminate(); worker = new Worker(); promiseWorker = new PWBHost(worker);} 

const init = () => {  
    worker = new Worker({ synchronizedStdio: false });
    promiseWorker = new PWBHost(worker)
}

export default {
    init,
    send,
    receive,
    terminate,
}