var cors = require('cors');
var express = require('express'),
    app = express(),
bodyParser = require('body-parser');
port = 5000;

const mysql = require('mysql');
// connection configurations
var connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'mypassword',
    database: 'AuctionList'
});

// connect to database
connection.connect();
app.use(cors());
app.listen(port);


app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var routes = require('./app/routes/approutes'); //importing route
routes(app); //register the route