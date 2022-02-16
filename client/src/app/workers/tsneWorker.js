import * as log from "../../dev/log";
import * as mds from "../mds";
import * as sim from "../similarity";

import Matrix from "../dataStructures/Matrix";
import HalfMatrix from "../dataStructures/HalfMatrix";
addEventListener("message", (event) => {
    log.debug("TSNE", event);
    // Hyper parameters
    let opt = {};
    opt.theta = 0.15; // theta
    opt.perplexity = 30; // perplexity
    opt.dims = 2; // dimensions
    const GRADIENT_STEPS = 500;

    var model = new tsneez.TSNEEZ(opt); // create a tsneez instance]

    const features = event.data.features;
    model.initData(features);

    let prevTime = new Date();

    for (var k = 0; k < GRADIENT_STEPS; k++) {
        model.step(); // gradient update
        //console.log(`Step : ${k}`)
        //check time passed
        let currTime = new Date();
        var timeDiff = currTime - prevTime; //in ms
        if (timeDiff > 500) {
            postMessage({ state: "processing", result: getResult(model, features) });
            prevTime = currTime;
        }
    }

    postMessage({ state: "done", result: getResult(model, features) });
    //postMessage({ state: "processing", result: tsneMDS(features) });
});

import tsneez from "tsneez";

function tsneMDS(features) {
    log.debug("MDS");
    const distanceMatrix = new HalfMatrix({ size: features.length, numberType: HalfMatrix.NumberType.FLOAT32 });
    distanceMatrix.fill((x, y) => {
        return sim.euclidianTimbre(features[x], features[y]);
    });
    log.debug("DISTANCE MATRIX CREEATED", distanceMatrix);
    const coords = mds.getMDSCoordinates(distanceMatrix, "Classic");
    log.debug("MDS DONE", coords);
    return coords;
}

function getResult(model, features) {
    var Y = model.Y;

    let result = [];
    let max = 0;
    for (let i = 0; i < features.length; i++) {
        const x = Y.data[i * 2];
        const y = Y.data[i * 2 + 1];
        result.push([x, y]);

        max = Math.max(max, Math.abs(x), Math.abs(y));
    }

    let maxRadius = 0;
    for (let i = 0; i < features.length; i++) {
        const coord = result[i];
        const radius = Math.sqrt(coord[0] * coord[0] + coord[1] * coord[1]);
        if (radius > maxRadius) maxRadius = radius;
    }

    for (let i = 0; i < features.length; i++) {
        result[i] = [result[i][0] / maxRadius, result[i][1] / maxRadius];
    }

    return result;
}
