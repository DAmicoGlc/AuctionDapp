'user strict';
var sql = require('./db.js');

//Task object constructor
var English = function (auction) {
    this.address = auction.address;
    this.title = auction.title;
    this.description = auction.description;
};

English.createEnglish = function (newEnglish, result) {
    sql.query("INSERT INTO english set ?", newEnglish, function (err, res) {

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
English.getEnglishById = function (englishAddress, result) {
    sql.query("Select title, description from english where address = ? ", englishAddress, function (err, res) {
        if (err) {
            console.log("error: ", err);
            result(err, null);
        }
        else {
            result(null, res);

        }
    });
};
English.getAllEnglish = function (result) {
    sql.query("Select * from english", function (err, res) {

        if (err) {
            console.log("error: ", err);
            result(null, err);
        }
        else {
            console.log('english : ', res);

            result(null, res);
        }
    });
};
English.remove = function (address, result) {
    sql.query("DELETE FROM english WHERE address = ?", [address], function (err, res) {

        if (err) {
            console.log("error: ", err);
            result(null, err);
        }
        else {

            result(null, res);
        }
    });
};


module.exports = English;