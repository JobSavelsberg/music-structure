import assert from "assert";
import { NumberType, getNumberTypeByName } from "./NumberType";
import * as log from "../../dev/log";

export default class Matrix {
    static get NumberType() {
        return NumberType;
    }

    data;
    width;
    height;
    featureAmount;
    numberType;
    length;

    constructor(options) {
        this.width = options.width || options.size;
        this.height = options.height || options.size;

        this.featureAmount = options.featureAmount || 1;
        this.numberType = getNumberTypeByName(options.numberType) || NumberType.FLOAT32;
        this.sampleDuration = options.sampleDuration || 1;
        this.length = this.width * this.height * this.featureAmount;
        if (options.buffer) {
            this.data = new this.numberType.array(options.buffer);
            assert(this.length === this.data.length);
        } else {
            this.data = new this.numberType.array(this.length);
        }
    }

    static from(matrix, options) {
        if (!options) options = {};
        const featureAmount = options.featureAmount || matrix.featureAmount;
        const numberType = options.numberType || matrix.numberType;
        const sampleDuration = options.sampleDuration || matrix.sampleDuration;
        return new Matrix({ width: matrix.width, height: matrix.height, featureAmount, numberType, sampleDuration });
    }

    static fromHalfMatrix(halfMatrix) {
        const matrix = new Matrix({
            width: halfMatrix.size,
            height: halfMatrix.size,
            numberType: halfMatrix.numberType,
            sampleDuration: halfMatrix.sampleDuration,
        });
        matrix.fill((x, y) => halfMatrix.getValueMirrored(x, y));
        return matrix;
    }

    static createTimeLagMatrix(matrix) {
        const size = matrix.size || matrix.width;
        const timeLagMatrix = new Matrix(matrix);
        timeLagMatrix.fill((n, lag) => {
            const x = (n + lag) % size;
            return matrix.getValueMirrored(x, n);
        });
        return timeLagMatrix;
    }

    static combine(halfMatrixLeft, halfMatrixRight) {
        assert(halfMatrixLeft.size === halfMatrixRight.size);
        assert(halfMatrixLeft.numberType === halfMatrixRight.numberType);
        assert(halfMatrixLeft.sampleDuration === halfMatrixRight.sampleDuration);
        const size = halfMatrixLeft.size;
        const numberType = halfMatrixLeft.numberType;
        const sampleDuration = halfMatrixLeft.sampleDuration;
        const matrix = new Matrix({
            width: size,
            height: size,
            numberType: numberType,
            sampleDuration: sampleDuration,
        });
        matrix.fill((x, y) => {
            if (x > y) {
                return halfMatrixRight.getValueMirrored(x, y);
            } else {
                return halfMatrixLeft.getValue(x, y);
            }
        });
        return matrix;
    }

    hasCell(x, y) {
        return x < this.width && y < this.height && x >= 0 && y >= 0;
    }
    setValue(x, y, value) {
        this.data[(y * this.width + x) * this.featureAmount] = value;
    }
    getValueMirrored(x, y, f = 0) {
        return this.getValue(x, y, f);
    }
    getValue(x, y, f = 0) {
        return this.data[(y * this.width + x) * this.featureAmount + f];
    }
    getValues(x, y) {
        const values = new this.numberType.array(this.featureAmount);
        for (let f = 0; f < this.featureAmount; f++) {
            values[f] = this.data[(y * this.width + x) * this.featureAmount + f];
        }
        return values;
    }

    getValuesNormalized(x, y) {
        const values = new this.numberType.array(this.featureAmount);
        for (let f = 0; f < this.featureAmount; f++) {
            values[f] = this.data[(y * this.width + x) * this.featureAmount + f] / this.numberType.scale;
        }
        return values;
    }
    getValueNormalizedMirrored(x, y) {
        return this.getValueNormalized(x, y);
    }
    getValueNormalized(x, y) {
        return this.data[(y * this.width + x) * this.featureAmount] / this.numberType.scale;
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
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                this.data[(y * this.width + x) * this.featureAmount] = callback(x, y);
            }
        }
    }

    fillFeatures(callback) {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                for (let f = 0; f < this.featureAmount; f++) {
                    this.data[(y * this.width + x) * this.featureAmount + f] = callback(x, y, f);
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

    /**
     * Expect normalized number [0,1] and stores this as number of specified type, with 1 being scaled to the number's max
     * @param {*} callback function that returns number in range 0,1
     */
    fillNormalized(callback) {
        for (let y = 0; y < this.heigth; y++) {
            for (let x = 0; x < this.width; x++) {
                this.data[(y * this.width + x) * this.featureAmount] = callback(x, y) * this.numberType.max;
            }
        }
    }

    fillFeaturesNormalized(callback) {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                for (let f = 0; f < this.featureAmount; f++) {
                    this.data[(y * this.width + x) * this.featureAmount + f] = callback(x, y, f) * this.numberType.max;
                }
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

    getBuffer() {
        return {
            type: "Matrix",
            buffer: this.data.buffer,
            width: this.width,
            height: this.height,
            numberType: this.numberType.name,
            featureAmount: this.featureAmount,
            sampleDuration: this.sampleDuration,
        };
    }

    getNewEmptyMatrix() {
        return new Matrix(this);
    }

    getSize() {
        assert(this.width === this.height);
        return this.width;
    }
}
