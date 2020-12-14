/*
    A Single Owner Secret Smart Contract is a DSU containing the validation logic to ensure that a specific moment of time, there is a single key capable to update the value of the SSC
    A smart controls contains only a single value (typically a KeySSI) that indicates the current value
    The code guarantees that the current value obeys the single rule of this smart contract:  the ownership was passed correctly between past owners and the current value is set by the latest owner
 */

function SingleOwnerSSC(){
    /*

     */
    this.initialise = function(controllingSeedSSI){

    };


    /*

     */
    this.giveControl = function(newSeedSSI){

    };


    /*

     */
    this.putValue = function(value){

    };

    /*

     */
    this.getValue = function(callback){

    };

}

module.exports = SingleOwnerSSC;