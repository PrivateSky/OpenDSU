const {prettyByte} = require("@msgpack/msgpack/dist/utils/prettyByte");

class Storage {
    get(key) {
        return localStorage.getItem(key);
    }


    getJSON(key) {
        return JSON.parse(this.get(key));
    }


    set(key, value) {
        localStorage.setItem(key, value);
    }


    setJSON(key, value) {
        this.set(key, JSON.stringify(value));
    }


    remove(key) {
        localStorage.removeItem(key);
    }
}

const getStorage = () => {
    if (!$$.storage) {
        $$.storage = new Storage();
    }

    return $$.storage;
}

module.exports = {
    getStorage
};