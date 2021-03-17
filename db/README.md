# db module

An OpenDSU  Data Base (DB) is a simple noSQL database offered by OpenDSU for programmers to handle tasks where multiple users are contributing to a database.

Aimed for storing DSU related metadata as records organised in tables.

This module offers a generic interface to handle database systems but currently the most useful
implementation are MonolithicDB and the MultiUserDB.
 
A WalletDB is an embedded database that persist records in a single DSU. This DSU could still be shared with
multiple users, however sharing with multiple writers  is not a good idea because of the
potential concurrency issues.  
This is useful in wallets/ssapps owned by a single user because will has the best performances. 

A MultiUserDB is an embedded database that persist records in separate DSUs for each user, while offering 
the same impression as a WalletDB. 

The MultiUserDB is used with a concept of "table" as described bellow:
- users are sharing information in the database with other users in a self sovereign way
- users are capable to read data from other users
- users are keeping strict auditability and ownership on written data (they share only sReadSSI and not SeedSSIs with other users)
- users are working with a concept of "tables" at a logical level:  however each user has a "shard" that he is updating
- all records have a primary key and are indexed by this primary key

Each DSU  maintain a special file called ".dbindex" that records the current 
state for all the records in the user's DSU.
The MultiUserDB objects instantiated in wallets will merge all the ".dbindex" files in a single index that indicates which DSU has the
latest version of a record.
During this merging, conflicts could be discovered. The database could use conflictSolvingStrategy will decide how to solve it. 
