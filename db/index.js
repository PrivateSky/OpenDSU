

function getSelfSovereignDB(mountingPoint, sharedSSI, mySeedSSI){
    return new require("./SSDB")(mountingPoint, sharedSSI, mySeedSSI);
}

module.exports = {
    getSelfSovereignDB
}