module.exports = {
    "<": function (x, y) {
        return x < y
    },
    "<=": function (x, y) {
        return x <= y
    },
    ">": function (x, y) {
        return x > y
    },
    ">=": function (x, y) {
        return x >= y
    },
    "==": function (x, y) {
        return x == y
    },
    "!=": function (x, y) {
        if (y === "undefined") {
            y = undefined;
        }
        return x != y;
    },
    "like": function (str, regex) {
        if (typeof regex === "string") {
            let splitRegex = regex.split("/");
            if (splitRegex[0] === '') {
                splitRegex = splitRegex.slice(1);
            }
            let flag = undefined;
            if (splitRegex.length > 1) {
                flag = splitRegex.pop();
            }
            if (flag === '') {
                flag = undefined;
            }
            regex = new RegExp(splitRegex.join('/'), flag);
        }
        // return regex.test(str);
        return str.match(regex);
    }
};
