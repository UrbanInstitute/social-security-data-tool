#OSX

##install mongodb
 brew update
 brew install mongodb

 sudo mkdir -p /data/db
 sudo chmod 777 /data

##run
 mongod

##start over
 db.tables.drop() (note that .remove({}) will not remove indices)
##insert
 mongoimport --db test --collection tables --file sample-data/supplement-2014-2A3.json

##get by title id
###mongo shell
 db.tables.find({'title.id':"2.A3"})

###python (sleepy.mongoose)
 criteria from escape('{"title.id":"2.A3"}')
 curl -X GET 'http://localhost:27080/test/tables/_find?criteria=%7B%22title.id%22%3A%222.A3%22%7D'
 http://localhost:27080/test/tables/_find?criteria=%7B%22title.id%22%3A%222A3%22%7D



##install Sleepy.Mongoose (receommend by [mongo docs](http://docs.mongodb.org/ecosystem/tools/http-interfaces/))
```
 mkvirtualenv ssa
 pip install pymongo==2.8.1
 git clone git@github.com:UrbanInstitute/sleepy.mongoose.git
 cd sleepy.mongoose
```