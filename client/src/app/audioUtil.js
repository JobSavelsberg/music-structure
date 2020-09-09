export function loudness(db){
    const l = Math.max(0,60+db)/60;
    return l*l;
}