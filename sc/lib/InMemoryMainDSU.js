function InMemoryMainDSU() {
    const obj = {};
    obj["/environment.json"] = Buffer.from(JSON.stringify({
        vaultDomain: "vault",
        didDomain: "vault"
    }))

    obj["environment.json"] = obj["/environment.json"];

    this.writeFile = (path, data, callback) => {
        if (!path.startsWith("/")) {
            path = `/${path}`;
        }
        obj[path] = data;
        callback();
    }

    this.readFile = (path, callback) => {
        if (!path.startsWith("/")) {
            path = `/${path}`;
        }
        callback(undefined, obj[path]);
    }

    this.refresh = (callback)=>{
        callback();
    }
}

module.exports = InMemoryMainDSU;