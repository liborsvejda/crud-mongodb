const mongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID;
const config = require('config');
const cfg = config.get('MongoDB');
const dbColl = "studenti";
let dbo;

mongoClient.connect(cfg.url, { useNewUrlParser: true, useUnifiedTopology: true }, function(err, db) {
    if (err) throw err;
    dbo = db.db(cfg.database);
    dbo.createCollection(dbColl, function(err, res) {
        if (err) throw err;
        dbo.collection(dbColl).createIndex( { jmeno: "text", prijmeni: "text" } ); //vytvori index pro fulltext
        console.log(`Collection ${dbColl} created!`);
    });
});

const list = function (req, res, resObj, query = null) {
    console.log(JSON.stringify(query));
    dbo.collection(dbColl).find(query).toArray(function (err, result) {
        if (err) throw err;
        // console.log(result);
        resObj.studenti = result;
        res.end(JSON.stringify(resObj));
    });
}

exports.apiStudenti = function (req, res, resObj) {
    if (req.pathname.endsWith("/list")) {
        list(req, res, resObj);
    } else if (req.pathname.endsWith("/add")) {
        dbo.collection(dbColl).insertOne(req.parameters, function(err, result) {
            if (err) throw err;
            // console.log(result);
            list(req, res, resObj);
        });
    } else if (req.pathname.endsWith("/update")) {
        let select = { _id : ObjectID(req.parameters._id) };
        delete(req.parameters._id); //nelze modifikovat _id!
        dbo.collection(dbColl).updateOne(select, { $set: req.parameters  }, function(err, result) {
            if (err) throw err;
            // console.log(result);
            list(req, res, resObj);
        });
    } else if (req.pathname.endsWith("/delete")) {
        let select = { _id : ObjectID(req.parameters._id) };
        dbo.collection(dbColl).deleteOne(select, function(err, result) {
            if (err) throw err;
            // console.log(result);
            list(req, res, resObj);
        });
    } else if (req.pathname.endsWith("/search")) {
        let query;
        if (req.parameters.fulltext) {
            query = { $or: new Array() };
            query.$or.push({"jmeno": {$regex:`\\s*(${req.parameters.fulltext})`, $options: "i"}});
            query.$or.push({"prijmeni": {$regex:`\\s*(${req.parameters.fulltext})`, $options: "i"}});
            // query = `{ $text: { $search: { ${req.parameters.fulltext} } } }`; //podle https://docs.mongodb.com/manual/text-search/, ale nejak nefunguje :-(
        } else {
            query = {};
            if (req.parameters.jmeno) {
                query.jmeno = { $regex:`\\s*(${req.parameters.jmeno})`, $options: "i"};
            }
            if (req.parameters.prijmeni) {
                query.prijmeni = { $regex:`\\s*(${req.parameters.prijmeni})`, $options: "i"};
            }
        }
        list(req, res, resObj, query);
    }

};
