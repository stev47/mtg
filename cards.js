var mongoskin = require('mongoskin');

var db = new mongoskin.db('mongodb://localhost:27017/mtg', {w : 0});

//mongo.MongoClient.connect("mongodb://localhost:27017/mtg", function (err, db) {

console.log("Connected to database ?");




//db.dropCollection('sets');
//db.dropCollection('cards');

//var sets_c = db.collection('sets');
//var cards_c = db.collection('cards');

exports.import = function (req, res) {

	var sets = require('./AllSets-x.json');

	db.collection('sets', {strict: true}, function (err, collection) {

		db.dropCollection('sets');
		db.dropCollection('cards');

		for (var setname in sets) {
			var set = sets[setname];
			var cards = set.cards;

			for (var i in cards) {
				var card = cards[i];
				//console.log(card);
				db.collection('cards').insert(card, function (err) {
					//console.log([err]);
				} );
			}

			delete set.cards;

			console.log("Inserting set '" + setname + "'");
			db.collection('sets').insert(set, function (err) {
				//console.log("Inserted set '" + setname + "'");
			});
		}
		res.send('Finished!');

	});

};

exports.findAll = function (req, res) {
	res.send('Alle');
};

exports.findByName = function (req, res) {
	db.collection('cards').find(
		{$or: [
			{ name: { $regex: req.params.pattern, $options: 'i' } },
			{ text: { $regex: req.params.pattern, $options: 'is' } }
			]
		}
	).limit(20).toArray(function (err, results) {
		res.send(results);
	});
};




