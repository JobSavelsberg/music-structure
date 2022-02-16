const argPlaceholder = navigator.userAgent.indexOf("Chrome") != -1 ? "%O" : "%O";
export const levels = {
    DEBUG: { name: "Debug", id: 0, color: "#40A0EE", bg: "#204099" },
    INFO: { name: "Info", id: 1, color: "#2DE974", bg: "#187639" },
    WARN: { name: "Warn", id: 2, color: "darkorange", bg: "darkorange" },
    ERROR: { name: "Error", id: 3, color: "red", bg: "brown" },
    FATAL: { name: "Fatal", id: 4, color: "white", bg: "brown" },
};

let currentLevel = () => levelStack[levelStack.length - 1];
let levelStack = [levels.INFO];

export let debug;
export let info;
export let warn;
export let error;
export let fatal;
updateLogs(currentLevel());

function updateLogs(currentLevel) {
    debug =
        currentLevel.id <= levels.DEBUG.id
            ? console.debug.bind(
                  console,
                  `%c Debug %c\t%c${argPlaceholder}`,
                  `color:white;background:${levels.DEBUG.bg};font-style:italic`,
                  `color:${levels.DEBUG.color}`,
                  `color:${levels.DEBUG.color}`
              )
            : function() {};

    info =
        currentLevel.id <= levels.INFO.id
            ? console.info.bind(
                  console,
                  `%c Info  %c\t%c${argPlaceholder}`,
                  `color:white;background:${levels.INFO.bg};font-style:italic`,
                  `color:${levels.INFO.color}`,
                  `color:${levels.INFO.color}`
              )
            : function() {};

    warn =
        currentLevel.id <= levels.WARN.id
            ? console.warn.bind(
                  console,
                  `%c Warn  %c\t%c${argPlaceholder}`,
                  `color:white;background:${levels.WARN.bg};font-style:italic`,
                  `color: ${levels.WARN.color}`,
                  `color:${levels.WARN.color}`
              )
            : function() {};

    error =
        currentLevel.id <= levels.ERROR.id
            ? console.error.bind(
                  console,
                  `%c Error %c\t%c${argPlaceholder}`,
                  `color:white;background:${levels.ERROR.bg};font-style:italic`,
                  `color: ${levels.ERROR.color}`,
                  `color: ${levels.ERROR.color}`
              )
            : function() {};

    fatal =
        currentLevel.id <= levels.FATAL.id
            ? console.error.bind(
                  console,
                  `%c Fatal \t%c${argPlaceholder}`,
                  `color: ${levels.FATAL.color}; background: ${levels.FATAL.bg};font-weight:bold`,
                  `color: ${levels.FATAL.color}; background: ${levels.FATAL.bg};font-weight:bold`
              )
            : function() {};
}

export function push(level) {
    levelStack.push(level);
    updateLogs(currentLevel());
}

export function pop() {
    levelStack.pop();
    updateLogs(currentLevel());
}
