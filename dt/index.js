/*
html API space
*/



//const builder = new test.DossierBuilder
const getDossierBuilder = () => {
    return new (require("./DossierBuilder"))()
}

module.exports = {
    getDossierBuilder
}
