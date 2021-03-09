function getBasicSharedDB(){
    return new (require("./BasicSharedDB"));
}

module.exports = {
    getBasicSharedDB,
}
