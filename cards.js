var mongoskin = require('mongoskin');

var db = new mongoskin.db('mongodb://localhost:27017/mtg', {w : 0});

var admin = require('./admin');

//mongo.MongoClient.connect("mongodb://localhost:27017/mtg", function (err, db) {

console.log("Connected to database ?");


exports.import = function (req, res) {
	admin.fetchDb()
		.then(admin.importDb)
		//.then(function () { console.log('blabla!') })
		.then(admin.preprocess.all)
		.then(function () {
			res.send('finished!');
		});
};

exports.types = function (req, res) {
	var col = db.collection('types');

	col = col.find();
	col = col.sort({name: 1});

	col.toArray(function (err, results) {
		if (err) throw err;
		res.send(results);
	});
}

exports.findAll = function (req, res) {
	res.send('Alle');
};

exports.findByName = function (req, res) {

	var limit = req.body.limit ? req.body.limit : 50;
	var qparams = req.body;
	var query = {};

	var col = db.collection('cardsNameReduced');

	/* Query Building */
	query.layout = { $nin : ['scheme', 'phenomenom', 'vanguard', 'plane'] };

	if (qparams.name)
		query.name = { $regex: qparams.name, $options: 'i' };
	if (qparams.text)
		query.text = { $regex: qparams.text, $options: 'i' };
	if (qparams.type)
		query.types = qparams.type;

	qcolors = [];
	['white', 'blue', 'black', 'red', 'green'].forEach(function (color) {
		if (qparams[color])
			qcolors.push(color.charAt(0).toUpperCase() + color.slice(1));
	});

	if (qcolors.length > 0) {
		query.colors = { $all : qcolors };
	}

	/* Query Execution */
	col = col.find(query);
	col = col.limit(limit);
	//col = col.sort({releaseDate: -1});
	col = col.sort({cmc: 1});

	col.toArray(function (err, results) {
		if (err) throw err;
		res.send(results);
	});

};




