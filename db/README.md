# db module
Aimed for storing DSU related metadata, that can be used for delegated conflict solving or further analysis.

DB by itself is mean to perform only conflict free operation while writing,
this is managed by introducing a db schema where each user changes are stored separately and using mostly commutative operations.
Operations can yield conflict by definition such as `set` (insert) can be used only in non-conflicting manner. 

## Data Flowchart
![flow chart](db-flow-chart.png)
