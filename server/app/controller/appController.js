'use strict';

var English = require('../model/appModelEng.js');
var Vicrey = require('../model/appModelVic.js');

exports.list_all_english = function (req, res) {
    English.getAllEnglish(function (err, english) {

        console.log('controller')
        if (err)
            res.send(err);
        console.log('res', english);
        res.send(english);
    });
};

exports.create_a_english = function (req, res) {
    var new_english = new English(req.body);

    //handles null error 
    if (!new_english.address || !new_english.title 
        || !new_english.description) {

        res.status(400).send({ error: true, message: 'Please provide address/title/description' });

    }
    else {

        English.createEnglish(new_english, function (err, result) {

            if (err)
                res.send(err);
            res.json(result);
        });
    }
};


exports.read_a_english = function (req, res) {
    English.getEnglishById(req.params.englishAddress, function (err, english) {
        if (err)
            res.send(err);
        res.json(english);
    });
};

exports.delete_a_english = function (req, res) {

    English.remove(req.params.englishAddress, function (err, task) {
        if (err)
            res.send(err);
        res.json({ message: 'English auction successfully deleted' });
    });
};


exports.list_all_vicrey = function (req, res) {
    Vicrey.getAllVicrey(function (err, vicrey) {

        console.log('controller')
        if (err)
            res.send(err);
        console.log('res', vicrey);
        res.send(vicrey);
    });
};

exports.create_a_vicrey = function (req, res) {
    var new_vicrey = new Vicrey(req.body);

    if (!new_vicrey.address || !new_vicrey.title
        || !new_vicrey.description) {

        res.status(400).send({ error: true, message: 'Please provide address/title/description' });

    }
    else {

        Vicrey.createVicrey(new_vicrey, function (err, result) {

            if (err)
                res.send(err);
            res.json(result);
        });
    }
};


exports.read_a_vicrey = function (req, res) {
    Vicrey.getVicreyById(req.params.vicreyAddress, function (err, vicrey) {
        if (err)
            res.send(err);
        res.json(vicrey);
    });
};

exports.delete_a_vicrey = function (req, res) {

    Vicrey.remove(req.params.vicreyAddress, function (err, task) {
        if (err)
            res.send(err);
        res.json({ message: 'Vicrey auction successfully deleted' });
    });
};