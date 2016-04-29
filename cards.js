var mongoskin = require('mongoskin');
var Q = require('q');
var mci = require('./magiccardsinfo.js');

var db = new mongoskin.db('mongodb://localhost:27017/mtg', {w : 0});


//mongo.MongoClient.connect("mongodb://localhost:27017/mtg", function (err, db) {

console.log("Connected to database ?");


exports.types = function (req, res) {
	var col = db.collection('types');

	col = col.find();
	col = col.sort({name: 1});

	col.toArray(function (err, results) {
		if (err) throw err;
		res.send(results);
	});
}

exports.supertypes = function (req, res) {
	db.collection('supertypes').find().sort({name: 1}).toArray(function (err, results) {
		if (err) throw err;
		res.send(results);
	});
}

exports.subtypes = function (req, res) {
	db.collection('subtypes').find().sort({name: 1}).toArray(function (err, results) {
		if (err) throw err;
		res.send(results);
	});
}

exports.findAll = function (req, res) {
	res.send('Alle');
};

exports.findByName = function (req, res) {

	var limit = req.body.limit ? req.body.limit : 100;
	var qparams = req.body;
	var query = {};

	var col = db.collection('cards');

	/* Query Building */
	query.layout = { $nin : ['scheme', 'phenomenon', 'vanguard', 'plane'] };
	query.legalities = { format: 'Legacy', legality: 'Legal' };

	if (qparams.name)
		query.name = { $regex: qparams.name, $options: 'i' };
	if (qparams.text)
		query.text = { $regex: qparams.text, $options: 'i' };
	if (qparams.type)
		query.types = qparams.type;
	if (qparams.subtype)
		query.subtypes = qparams.subtype;
	if (qparams.cmc && qparams.cmc != -1)
		query.cmc = parseInt(qparams.cmc);

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

		var urlUpdates = [];

		results.forEach(function(card) {
			// todo: actually check for valid url?
			if (card.imgUrl)
				return

			urlUpdates.push(mci.getImgUrl(card.name).then(function (url) {
				card.imgUrl = url
				return Q.ninvoke(db.collection('cards'), 'update', {_id: card._id}, card)
			}))
		});

		Q.all(urlUpdates).then(function () {
			res.send(results);
		});
	});

};




