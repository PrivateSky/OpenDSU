/*
    An OpenDSU  Data Base (DB) is a simple noSQL database offered by OpenDSU for programmers to handle tasks where multiple users are contributing to a database.
    The DB is used with a concept of "table" as described bellow:
     - users are sharing information in the database with other users in a self sovereign way
        - users are capable to read data from other users
        - users are keeping strict audiatbility and ownership on written data (they share only sReadSSI and not SeedSSIs with other users)
     - users are working with a concept of "tables" at a logical level:  however each user has a "shard" that he is updating
     - the data stored as a map of objects. The objects have a primary key and are indexed by this primary key
     -  the array of objects from all users is automatically merged when the user is reading a table.


       The initialisation a DB can be done using and "mountingPoint" and 2 KeySSIs:
       - sharedSSI :
                - typically is a sReadSSI that users  use for reading data
                - if sharedSSI is a SeedSSI, that this can be used  in the wallets belonging to the organisation to enrol new users.
       - mySeedSSI: the current user use it to write data in its shard
 */


function SSDB(mountingPoint, sharedSSI, mySeedSSI){

    /*
        Get the whole content of the table and returns an array with all the  records satisfying the condition tested by the filterFunction
     */
    this.filterTable = function(tableName, filterFunction){

    };


    /*
        Update the content of my part of the table
     */
    this.updateMyShard = function(tableName, shardObject){

    };


    /*
        Get a single row from a table
     */
    this.getRow = function(tableName, key){

    };

    /*
        Update a single row
     */
    this.updateRow = function(tableName, key, value){

    };


    /*
       Insert a single row
     */
    this.insertRow = function(tableName, key, value){

    };


    /*
      Delete a single row
     */
    this.deleteRow = function(tableName, key, value){

    };


    /*
      Enrol a user by mounting the sReadSSI in the list of users
     */
    this.enrolUser = function(userName, sReadSSI){

    };

    /*
      Enrol a user by mounting the sReadSSI in the list of users
     */
    this.removeUser = function(userName, sReadSSI){

    };
}

module.exports = SSDB;