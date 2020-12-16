import { assert } from "assert";

/*
*   Everything is defined in seconds; it is samplerate agnostic
*/
export default class Section {
    start;
    end;
    
    confidence = 1;
    groupID = 0;

    // family variables
    parent = false;
    pathFamily;
    pathFamilyScores;
    score;
    normalizedScore;
    coverage;
    normalizedCoverage;
    fitness;
    
    constructor(args){
        this.start = args.start;
        this.end = args.end;
        if(args.groupID !== undefined){
            this.groupID = args.groupID;
        }
        if(args.confidence !== undefined){
            this.confidence = args.confidence;
        }
    }

    //label;


    
    getDuration(){
        return this.end - this.start;
    }


}