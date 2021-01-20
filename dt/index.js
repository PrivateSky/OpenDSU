/*
html API space
*/



//const builder = new test.DossierBuilder
const getDossierBuilder = () => {
    return new (require("./DossierBuilder"))()
}

const test = getDossierBuilder();

module.exports = {
    getDossierBuilder
}
