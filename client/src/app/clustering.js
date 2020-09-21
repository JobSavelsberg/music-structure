import * as sim from "./similarity"
import * as skmeans from "skmeans";

export function kMeansSearch(features, minK, maxK, tries){
    const results = []
    const lowScores = [];
    for(let k = minK; k < maxK; k++){
        for(let i = 0; i < tries; i++){
            //console.log(`kmeans k=${k}, try=${i}`);
            const result = skmeans(features, k);
            const score = calculateScore(features, result);
            if(score < lowScores[k-minK] || Infinity){
                lowScores[k-minK] = score;
                results[k-minK] = result;
            }
        }
    }

    console.log("Finding elbow point")
    // Find elbow point
    const start = [minK, lowScores[0]];
    const end = [maxK, lowScores[lowScores.length-1]];
    const slope = (end[1] - start[1]) / (end[0] - start[0]);
    const b = start[1] - slope*start[0];
    const straightLine = (x) => { return slope*x + b }; 

    let maxHeight = 0;
    let bestResult = null;
    for(let k = minK; k < maxK; k++){
        const height = straightLine(k) - lowScores[k-minK];
        if(height > maxHeight){
            maxHeight = height;
            bestResult = results[k-minK];
        }
    }

    return bestResult;
}

function calculateScore(features, result){
    let score = 0;
    for(let i = 0; i < features.length; i++){
        score += sim.squaredDistance(features[i], result.centroids[result.idxs[i]]);
    }
    return score;
}


/**
 * 
 * @param {*} segments 
 * @param {*} k 
 */
export function kMeans(segments, k){
    const threshold = 0.01;
    const clusters = [];
    const size = [...segments[0].pitches, ...segments[0].timbres].length;

    // Initialize groups and randomize cluster centroids
    for( let i = 0; i < k; i++){
        const randomIndex = Math.floor(Math.random()*segments.length);
        const features = segments[randomIndex].getFeatures();
        clusters.push({centroid: features, segments: [], distMoved: Infinity });
    }

    let maxDistMoved;
    do{
        // reset 
        maxDistMoved = 0;

        // for all segments, check which centroid is closest and add to corresponding cluster
        segments.forEach((segment) => {
            let closestCluster = null;
            let closestDistance = Infinity;
            clusters.forEach((cluster) => {
                const dist = sim.euclidianDistance(cluster.centroid, segment.getFeatures());
                if(dist < closestDistance){
                    closestDistance = dist;
                    closestCluster = cluster;
                }
            })
            closestCluster.segments.push(segment);
        });

        // calculate mean value of each cluster
        clusters.forEach((cluster) => {
            const segmentCount = cluster.segments.length;
            const oldCentroid = cluster.centroid.slice();
            cluster.centroid = new Array(size).fill(0);
            cluster.segments.forEach((segment) => {
                segment.getFeatures().forEach((value, index) => {
                    cluster.centroid[index] += value/segmentCount;
                })
            })

            cluster.distMoved = sim.euclidianDistance(oldCentroid, cluster.centroid);
            maxDistMoved = Math.max(maxDistMoved, cluster.distMoved);
        })
        
        console.log("Daid k-means loop, maxDistMoved: ", maxDistMoved);
    }while(maxDistMoved >= threshold);
    return clusters;
}