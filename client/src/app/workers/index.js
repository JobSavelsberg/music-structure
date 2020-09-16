import PromiseWorker from 'promise-worker'
import Worker from 'worker-loader!./tsneWorker'

let worker = new Worker();
let promiseWorker = new PromiseWorker(worker)

const send = message => promiseWorker.postMessage({
  type: 'message',
  message
})

const terminate = () =>{
    worker.terminate(); 
    worker = new Worker();
    promiseWorker = new PromiseWorker(worker);
} 

export default {
    send,
    terminate
}