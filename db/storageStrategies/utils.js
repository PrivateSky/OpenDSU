function getCompareFunction(sortOrder) {
    if (sortOrder === "asc" || sortOrder === "ascending") {
        return function (a, b) {
            if (a < b) {
                return -1;
            }

            if (a === b) {
                return 0
            }

            if (a > b) {
                return 1;
            }
        }
    } else if (sortOrder === "dsc" || sortOrder === "descending") {
        return function (a, b) {
            if (a > b) {
                return -1;
            }

            if (a === b) {
                return 0
            }

            if (a < b) {
                return 1;
            }
        }
    } else {
        throw Error(`Invalid sort order provided <${sortOrder}>`);
    }
}

function getCompareFunctionForObjects(sortOrder, fieldName) {
    return function (firstObj, secondObj) {
        const compareFn = getCompareFunction(sortOrder);
        return compareFn(firstObj[fieldName], secondObj[fieldName]);
    }
}
module.exports = {
    getCompareFunction,
    getCompareFunctionForObjects
}