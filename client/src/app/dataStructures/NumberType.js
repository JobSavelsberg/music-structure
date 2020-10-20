import * as log from "../../dev/log";

export const NumberType = Object.freeze({
    UINT8: { name: "UINT8", max: Math.pow(2, 8) - 1, min: 0, scale: Math.pow(2, 8) - 1, array: Uint8Array },
    UINT16: { name: "UINT16", max: Math.pow(2, 16) - 1, min: 0, scale: Math.pow(2, 16) - 1, array: Uint16Array },
    UINT32: { name: "UINT32", max: Math.pow(2, 32) - 1, min: 0, scale: Math.pow(2, 32) - 1, array: Uint32Array },
    INT8: { name: "INT8", max: Math.pow(2, 7) - 1, min: -Math.pow(2, 7), scale: Math.pow(2, 7) - 1, array: Int8Array },
    INT16: {
        name: "INT16",
        max: Math.pow(2, 15) - 1,
        min: -Math.pow(2, 15),
        scale: Math.pow(2, 15) - 1,
        array: Int16Array,
    },
    INT32: {
        name: "INT32",
        max: Math.pow(2, 31) - 1,
        min: -Math.pow(2, 31),
        scale: Math.pow(2, 31) - 1,
        array: Int32Array,
    },
    FLOAT32: {
        name: "FLOAT32",
        max: Number.POSITIVE_INFINITY,
        min: Number.NEGATIVE_INFINITY,
        scale: 1,
        array: Float32Array,
    },
    FLOAT64: {
        name: "FLOAT64",
        max: Number.POSITIVE_INFINITY,
        min: Number.NEGATIVE_INFINITY,
        scale: 1,
        array: Float64Array,
    },
});

export function getNumberTypeByName(objectOrString) {
    if (typeof objectOrString === "string") {
        for (const type of Object.values(NumberType)) {
            if (type.name === objectOrString) {
                return type;
            }
        }
    } else {
        return objectOrString;
    }
}
