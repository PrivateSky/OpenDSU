function InMemoryMainDSU() {
    const obj = {};
    obj["/environment.json"] = Buffer.from(JSON.stringify({
        vaultDomain: "vault",
        didDomain: "vault"
    }))

    this.writeFile = (path, data, callback) => {
        obj[path] = data;
        callback();
    }

    this.readFile = (path, callback) => {
        callback(undefined, obj[path]);
    }
}

module.exports = InMemoryMainDSU;