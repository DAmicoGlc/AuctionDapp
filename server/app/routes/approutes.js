'use strict';
module.exports = function (app) {
    var auctionList = require('../controller/appController.js');

    // Auction Routes
    app.route('/english')
        .get(auctionList.list_all_english)
        .post(auctionList.create_a_english);

    app.route('/english/:englishAddress')
        .get(auctionList.read_a_english)
        .delete(auctionList.delete_a_english);

    app.route('/vicrey')
        .get(auctionList.list_all_vicrey)
        .post(auctionList.create_a_vicrey);

    app.route('/vicrey/:vicreyAddress')
        .get(auctionList.read_a_vicrey)
        .delete(auctionList.delete_a_vicrey);
};