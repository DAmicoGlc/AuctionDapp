'user strict';
var sql = require('./db.js');


var Vicrey = function (auction) {
    this.address = auction.address;
    this.title = auction.title;
    this.description = auction.description;
};

Vicrey.createVicrey = function (newVicrey, result) {
    sql.query("INSERT INTO vicrey set ?", newVicrey, function (err, res) {

        if (err) {
            console.log("error: ", err);
            result(err, null);
        }
        else {
            console.log(res.insertId);
            result(null, res.insertId);
        }
    });
};
Vicrey.getVicreyById = function (vicreyAddress, result) {
    sql.query("Select title, description from vicrey where address = ? ", vicreyAddress, function (err, res) {
        if (err) {
            console.log("error: ", err);
            result(err, null);
        }
        else {
            result(null, res);

        }
    });
};
Vicrey.getAllVicrey = function (result) {
    sql.query("Select * from vicrey", function (err, res) {

        if (err) {
            console.log("error: ", err);
            result(null, err);
        }
        else {
            console.log('vicrey : ', res);

            result(null, res);
        }
    });
};

Vicrey.remove = function (address, result) {
    sql.query("DELETE FROM vicrey WHERE address = ?", [address], function (err, res) {

        if (err) {
            console.log("error: ", err);
            result(null, err);
        }
        else {

            result(null, res);
        }
    });
};

module.exports = Vicrey;