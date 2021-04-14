import assert from "assert";
import { NumberType, getNumberTypeByName } from "./NumberType";
import * as log from "../../dev/log";
import * as Matrix from "./Matrix";
import { drop } from "lodash";
export default class HalfMatrix {
    static get NumberType() {
        return NumberType;
    }

    data;
    size;
    featureAmount;
    sampleDuration;
    numberType;
    length;

    /**
     *
     * @param {*} size
     * @param {*} shape array of nested array sizes eg, ssm with 2 values per cell [2]
     * @param {*} type
     */
    constructor(options) {
        this.size = options.size;
        this.featureAmount = options.featureAmount || 1;
        this.numberType = getNumberTypeByName(options.numberType) || NumberType.FLOAT32;
        this.sampleDuration = options.sampleDuration || 1;
        this.length = ((this.size * this.size + this.size) / 2) * this.featureAmount;
        if (options.buffer) {
            this.data = new this.numberType.array(options.buffer);
            assert(this.length === this.data.length);
        } else {
            this.data = new this.numberType.array(this.length);
        }
    }

    static from(matrix, options) {
        if (typeof matrix === Matrix) {
            return this.fromMatrix(matrix);
        }
        if (!options) options = {};
        const featureAmount = options.featureAmount || matrix.featureAmount;
        const numberType = options.numberType || matrix.numberType;
        const sampleDuration = options.sampleDuration || matrix.sampleDuration;
        return new HalfMatrix({ size: matrix.size, featureAmount, numberType, sampleDuration });
    }

    static fromMatrix(matrix) {
        const halfMatrix = new HalfMatrix({
            size: matrix.width,
            numberType: matrix.numberType,
            sampleDuration: matrix.sampleDuration,
        });
        halfMatrix.fill((x, y) => {
            return matrix.getValue(x, y);
        });
        return halfMatrix;
    }

    clone() {
        const halfMatrix = new HalfMatrix({
            size: this.size,
            numberType: this.numberType,
            sampleDuration: this.sampleDuration,
        });
        halfMatrix.fillByIndex((i) => this.data[i]);
        return halfMatrix;
    }

    getCellFromIndex(index) {}

    hasCell(x, y) {
        return x <= y && y < this.size && x >= 0 && y >= 0;
    }
    setValue(x, y, value) {
        this.data[((y * y + y) / 2) * this.featureAmount + x * this.featureAmount] = value;
    }
    setValueNormalized(x, y, value) {
        this.data[((y * y + y) / 2) * this.featureAmount + x * this.featureAmount] = value * this.numberType.scale;
    }
    setValueNormalizedMirrored(x, y, value) {
        if (x > y) {
            this.data[((x * x + x) / 2) * this.featureAmount + y * this.featureAmount] = value * this.numberType.scale;
        } else {
            this.data[((y * y + y) / 2) * this.featureAmount + x * this.featureAmount] = value * this.numberType.scale;
        }
    }
    getValue(x, y, f = 0) {
        return this.data[((y * y + y) / 2) * this.featureAmount + x * this.featureAmount + f];
    }
    getValues(x, y) {
        const values = new this.numberType.array(this.featureAmount);
        for (let o = 0; o < this.featureAmount; o++) {
            values[o] = this.data[((y * y + y) / 2) * this.featureAmount + x * this.featureAmount + o];
        }
        return values;
    }
    getValueMirrored(x, y) {
        if (x > y) {
            return this.data[((x * x + x) / 2) * this.featureAmount + y * this.featureAmount];
        } else {
            return this.data[((y * y + y) / 2) * this.featureAmount + x * this.featureAmount];
        }
    }
    getValuesNormalized(x, y) {
        const values = new this.numberType.array(this.featureAmount);
        for (let o = 0; o < this.featureAmount; o++) {
            values[o] =
                this.data[((y * y + y) / 2) * this.featureAmount + x * this.featureAmount + o] / this.numberType.scale;
        }
        return values;
    }
    getValueNormalizedMirrored(x, y) {
        if (x > y) {
            return this.data[((x * x + x) / 2) * this.featureAmount + y * this.featureAmount] / this.numberType.scale;
        } else {
            return this.data[((y * y + y) / 2) * this.featureAmount + x * this.featureAmount] / this.numberType.scale;
        }
    }
    getValueNormalized(x, y, f = 0) {
        return this.data[((y * y + y) / 2) * this.featureAmount + x * this.featureAmount + f] / this.numberType.scale;
    }

    getColumnNormalized(x) {
        const values = new Float32Array(this.size);
        for (let y = 0; y < this.size; y++) {
            values[y] = this.getValueNormalizedMirrored(x, y);
        }
        return values;
    }

    fillByIndex(callback) {
        let i = this.length;
        while (i--) {
            this.data[i] = callback(i);
        }
    }

    /**
     *
     * @param {*} callback dunction that returns number (compatible with DataType)
     */
    fill(callback) {
        for (let y = 0; y < this.size; y++) {
            const cellsBefore = ((y * y + y) / 2) * this.featureAmount;
            for (let x = 0; x < y + 1; x++) {
                this.data[cellsBefore + x * this.featureAmount] = callback(x, y);
            }
        }
    }

    fillFeatures(callback) {
        for (let y = 0; y < this.size; y++) {
            const cellsBefore = ((y * y + y) / 2) * this.featureAmount;
            for (let x = 0; x < y + 1; x++) {
                for (let f = 0; f < this.featureAmount; f++) {
                    this.data[cellsBefore + x * this.featureAmount + f] = callback(x, y, f);
                }
            }
        }
    }
    fillFeaturesNormalized(callback) {
        for (let y = 0; y < this.size; y++) {
            const cellsBefore = ((y * y + y) / 2) * this.featureAmount;
            for (let x = 0; x < y + 1; x++) {
                for (let f = 0; f < this.featureAmount; f++) {
                    this.data[cellsBefore + x * this.featureAmount + f] = callback(x, y, f) * this.numberType.scale;
                }
            }
        }
    }
    forEach(callback) {
        let i = this.length;
        while (i--) {
            callback(this.data[i], i);
        }
    }

    forEachCell(callback) {
        for (let y = 0; y < this.size; y++) {
            const cellsBefore = ((y * y + y) / 2) * this.featureAmount;

            for (let x = 0; x < y + 1; x++) {
                callback(x, y, this.data[cellsBefore + x]);
            }
        }
    }

    /**
     * Expect normalized number [0,1] and stfores this as number of specified type, with 1 being scaled to the number's max
     * @param {*} callback function that returns number in range 0,1
     */
    fillNormalized(callback) {
        for (let y = 0; y < this.size; y++) {
            const cellsBefore = (y * y + y) / 2;
            for (let x = 0; x < y + 1; x++) {
                this.data[cellsBefore + x] = callback(x, y) * this.numberType.scale;
            }
        }
    }

    map(callback) {
        let i = this.length;
        while (i--) {
            this.data[i] = callback(this.data[i]);
        }
    }

    divide(number) {
        let i = this.length;
        while (i--) {
            this.data[i] /= number;
        }
    }
    multiply(number) {
        let i = this.length;
        while (i--) {
            this.data[i] *= number;
        }
    }
    add(number) {
        let i = this.length;
        while (i--) {
            this.data[i] += number;
        }
    }

    getFirstFeatureMatrix() {
        const matrix = new HalfMatrix(this);
        matrix.fill((x, y) => {
            return this.getValue(x, y);
        });
        return matrix;
    }

    getFeatureMatrix(featureIndex) {
        const matrix = new HalfMatrix(this);
        matrix.fill((x, y) => {
            return this.getValue(x, y, featureIndex);
        });
        return matrix;
    }

    getBuffer() {
        return {
            type: "HalfMatrix",
            buffer: this.data.buffer,
            size: this.size,
            numberType: this.numberType.name,
            featureAmount: this.featureAmount,
            sampleDuration: this.sampleDuration,
        };
    }

    getSampleAmount() {
        return this.size;
    }

    getSampleDuration() {
        return this.sampleDuration;
    }

    getNestedArray() {
        const nestedArray = new Array(this.size);
        for (let y = 0; y < this.size; y++) {
            nestedArray[y] = new Array(this.size);
            for (let x = 0; x < this.size; x++) {
                nestedArray[y][x] = this.getValueMirrored(x, y);
            }
        }

        return nestedArray;
    }

    getNewEmptyMatrix() {
        return new HalfMatrix(this);
    }
    getSize() {
        return this.size;
    }

    normalize() {
        let min = this.numberType.max;
        let max = this.numberType.min;
        this.forEach((value) => {
            if (value > max) {
                max = value;
            }
            if (value < min) {
                min = value;
            }
        });

        let i = this.length;
        while (i--) {
            this.data[i] = (this.data[i] - min) / (max - min);
        }
    }

    getMeanAndStandardDeviation() {
        if (this.featureAmount > 1) return 0;
        let sum = 0;
        for (let y = 0; y < this.size; y++) {
            const cellsBefore = ((y * y + y) / 2) * this.featureAmount;
            for (let x = 0; x < y + 1; x++) {
                sum += this.data[cellsBefore + x] / this.numberType.scale;
            }
        }
        const mean = sum / this.data.length;
        let meanSquared = 0;
        for (let y = 0; y < this.size; y++) {
            const cellsBefore = ((y * y + y) / 2) * this.featureAmount;
            for (let x = 0; x < y + 1; x++) {
                meanSquared += Math.pow(this.data[cellsBefore + x] / this.numberType.scale - mean, 2);
            }
        }
        const sd = Math.sqrt(meanSquared / this.data.length);
        return [mean, sd];
    }

    changeDistribution(deltaMean, deltaDeviation) {
        const [mean, sd] = this.getMeanAndStandardDeviation();
        let i = this.length;
        while (i--) {
            let val = this.data[i] / this.numberType.scale;
            val -= mean;
            val *= deltaDeviation;
            val += mean + deltaMean;
            val = Math.min(1, Math.max(0, val));
            this.data[i] = val * this.numberType.scale;
        }
    }
}
