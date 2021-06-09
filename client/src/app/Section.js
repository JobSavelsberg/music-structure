import assert from "assert";
import * as log from "../dev/log";
import * as audioUtil from "./audioUtil";

import * as _ from "lodash";
/*
 *   Everything is defined in seconds; it is samplerate agnostic
 */
export default class Section {
    start;
    end;
    startSample;
    endSample;

    confidence = 1;
    groupID = 0;

    key = -1;

    mdsFeature;

    // family variables
    parent = false;
    pathFamily;
    pathFamilyScores;
    score;
    normalizedScore;
    coverage;
    normalizedCoverage;
    fitness;

    constructor(args) {
        this.start = args.start;
        this.end = args.end;
        this.startSample = args.startSample;
        this.endSample = args.endSample;
        if (args.groupID !== undefined) {
            this.groupID = args.groupID;
        }
        if (args.confidence !== undefined) {
            this.confidence = args.confidence;
        }
        if (args.mdsFeature !== undefined) {
            this.mdsFeature = args.mdsFeature;
        }
        if (args.colorAngle !== undefined) {
            this.colorAngle = args.colorAngle;
        }
        if (args.colorRadius !== undefined) {
            this.colorRadius = args.colorRadius;
        }
    }

    //label;

    getDuration() {
        return this.end - this.start;
    }

    getVerticalPosition() {}

    overlaps(otherSection) {
        return (
            (this.start <= otherSection.start && this.end > otherSection.start) ||
            (this.start < otherSection.start && this.end >= otherSection.end) ||
            (otherSection.start <= this.start && otherSection.end > this.start) ||
            (otherSection.start < this.start && otherSection.end >= this.end) ||
            (this.start >= otherSection.start && this.end <= otherSection.end) ||
            (otherSection.start >= this.start && otherSection.end <= this.end)
        );
    }

    splits(otherSection) {
        return otherSection.start < this.start && otherSection.end > this.end;
    }

    covers(otherSection) {
        return this.start <= otherSection.start && this.end >= otherSection.end;
    }

    clipsStart(otherSection) {
        return this.end > otherSection.start && this.end < otherSection.end && this.start <= otherSection.start;
    }

    clipsEnd(otherSection) {
        return this.start > otherSection.start && this.start < otherSection.end && this.end >= otherSection.end;
    }

    disjoint(otherSection) {
        return this.end <= otherSection.start || this.start >= otherSection.end;
    }

    clone() {
        return _.cloneDeep(this);
    }

    amountOfSectionsAfterSubtract(otherSection) {
        if (otherSection.covers(this)) return 0;
        if (otherSection.splits(this)) return 2;
        return 1;
    }

    subtract(otherSection) {
        if (otherSection.disjoint(this)) return this;

        assert(
            this.amountOfSectionsAfterSubtract(otherSection) === 1,
            `Won't subtract, subtraction yields ${this.amountOfSectionsAfterSubtract(otherSection)} sections [${
                this.start
            }, ${this.end}] - [${otherSection.start}, ${otherSection.end}]`
        );

        if (otherSection.clipsEnd(this)) {
            this.end = otherSection.start;
        } else if (otherSection.clipsStart(this)) {
            this.start = otherSection.end;
        }

        if (this.end <= this.start) {
            throw new Error("Section end is before start");
        }

        return this;
    }

    subtractAndCreateNew(otherSection) {
        if (otherSection.covers(this)) return [];
        if (otherSection.splits(this)) {
            const left = this.clone();
            left.end = otherSection.start;
            const right = this.clone();
            right.start = otherSection.end;
            return [left, right];
        }

        const thisClone = this.clone();
        return [thisClone.subtract(otherSection)];
    }

    getKeyName() {
        return audioUtil.keyNames[this.key];
    }
}
