import { PWBHost } from "promise-worker-bi";
import Worker from 'worker-loader!./tsneWorker'

let worker = new Worker();
let promiseWorker = new PWBHost(worker)

const send = message => promiseWorker.postMessage({
  type: 'message',
  message
})

const receive = callback => promiseWorker.register(callback);


const terminate = () =>{
    worker.terminate(); 
    worker = new Worker();
    promiseWorker = new PWBHost(worker);
} 

export default {
    send,
    receive,
    terminate
}