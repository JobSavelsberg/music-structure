import * as sim from "./similarity"

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