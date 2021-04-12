function Query(queryArray){
    let conditions = [];

    function queryParser(query) {
        query.forEach(fieldQuery => {
            const splitQuery = fieldQuery.split(" ");
            if (splitQuery.length < 3) {
                throw Error(`Invalid query format. A query's format is <field> <operator> <value>`);
            }
            const operatorKeys = Object.keys(operators);
            const operatorIndex = splitQuery.findIndex(operator => {
                return operatorKeys.findIndex(el => el === operator) !== -1;
            });

            if (operatorIndex === -1) {
                throw Error(`The provided query does not contain a valid operator.`);
            }

            const field = splitQuery.slice(0, operatorIndex).join(" ");
            const operator = splitQuery[operatorIndex];
            const value = splitQuery.slice(operatorIndex + 1).join(" ");

            conditions.push([field, operator, value]);
        });

    }

    this.filterValuesForIndex = (valueArray)=> {
        let conds = conditions.filter(cond => cond[0] === this.getIndexName());
        return valueArray.filter(val => {
            for (let i = 0; i < conds.length; i++) {
                if (!operators[conds[i][1]](val, conds[i][2])) {
                    return false;
                }
            }

            return true;
        });
    }

    this.filter = (sortedValues, getNextRecordForValue, limit, callback) => {
        let conds = conditions.filter(cond => cond[0] !== this.getIndexName());
        let filteredRecords = [];

        function getNextRecord(currentIndex){
            if (currentIndex === sortedValues.length) {
                return callback(undefined, filteredRecords);
            }
            getNextRecordForValue(sortedValues[currentIndex], (err, record) => {
                if (record === null) {
                    getNextRecord(currentIndex + 1);
                }else{
                    processRecord(record);
                    if (currentIndex === sortedValues.length || filteredRecords.length === limit) {
                        return callback(undefined, filteredRecords);
                    }
                    getNextRecord(currentIndex + 1);
                }
            });
        }

        function processRecord(record) {
            for (let i = 0; i < conds.length; i++) {
                if (!operators[conds[i][1]](record[conds[i][0]], conds[i][2])) {
                    return;
                }
            }
            filteredRecords.push(record);
        }

        getNextRecord(0);
    };

    this.sortValues = (values, sortType) => {
        let compareFn;
        try {
            compareFn = getCompareFunction(sortType);
        } catch (e) {
            throw createOpenDSUErrorWrapper(`Failed to get compare function`, e);
        }

        values.sort(compareFn);
    };

    this.getIndexName = () => {
        return conditions[0][0];
    };

    const operators = {
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

    queryParser(queryArray);
}

module.exports = Query;