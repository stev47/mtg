var mongoskin = require('mongoskin');
var db = new mongoskin.db('mongodb://localhost:27017/mtg', {w : 0});

var Q = require('q');

var fs = require('fs');
var http = require('http');
var unzip = require('unzip');

exports.import = function (req, res) {
	exports.fetchDb()
		.then(exports.loadDb)
		.then(exports.preprocess.all);
};

exports.preprocess = {};
exports.preprocess.all = function () {
	var deferred = Q.defer();

	exports.preprocess.reduceNames()
		.then(exports.preprocess.nestDoubleFaced)
		.then(function () {
			deferred.resolve();
		});

	return deferred.promise;
}

exports.download = function (url, dest, cb) {
	var file = fs.createWriteStream(dest);
	var request = http.get(url, function(response) {
		response.pipe(file);
		file.on('finish', function() {
			file.close(cb);
		});
	});
}

exports.fetchDb = function () {
	// todo
	var deferred = Q.defer();

	exports.download("http://mtgjson.com/json/AllSets-x.json.zip", "data/cards.json.zip", function () {
		var reader = fs.createReadStream("data/cards.json.zip");
		var writer = fs.createWriteStream("data/cards.json");
		reader.pipe(unzip.Parse()).on('entry', function (entry) {
			if (entry.path === "AllSets-x.json") {
				entry.pipe(writer);
			} else {
				entry.autodrain();
			}
		});

		writer.on('finish', function () {
			deferred.resolve();
		});
	});

	return deferred.promise;
}

exports.loadDb = function () {
	var deferred = Q.defer();

	var extend = require('util')._extend;
	var sets = require('./data/cards.json');

	db.collection('sets', {strict: true}, function (err, collection) {

		db.dropCollection('sets');
		db.dropCollection('cards');

		var promises_sets = [];

		for (var setname in sets) {
			var deferred_set = Q.defer();
			promises_sets.push(deferred_set.promise);

			var set = extend({}, sets[setname]);
			delete set.cards;
			var cards = sets[setname].cards;

			(function (set, cards, deferred_set) {
				db.collection('sets').insert(set, function (err, cardset) {
					var promises = [];
					for (var i in cards) {
						var card = cards[i];
						card.releaseDate = set.releaseDate;
						promises.push(Q.ninvoke(db.collection('cards'), 'insert', card));
					}
					Q.all(promises).then(function () {
						console.log('Imported set ' + set.name);
					}).done(deferred_set.resolve);
				});
			})(set, cards, deferred_set);

		}
		Q.all(promises_sets).then(function () {
			console.log('Importing DB finished!');
			deferred.resolve();
		});
	});

	return deferred.promise;
}

exports.preprocess.reduceNames = function () {

	var deferred = Q.defer();

	console.log('Reducing Names ...');

	db.dropCollection('cardsNameReduced');

	var map = function () {
		emit(this.name, this);
	}

	var reduce = function (key, values) {
			reducedVal = values[0];
			for (var i = 1; i < values.length; i++){
				if (values[i].releaseDate > reducedVal.releaseDate)
					reducedVal = values[i];
			}
			return reducedVal;
	}

	db.collection('cards').mapReduce(
		map,
		reduce,
		{
			out: "inline"
		}, function (err, result) {
			if (err) throw err;

			result.find().toArray( function (err, cards) {
				var promises = [];
				for (var i in cards) {
					var card = cards[i].value;
					promises.push(Q.ninvoke(db.collection('cardsNameReduced'), 'insert', card));
				}
				Q.all(promises).then(function () {
					console.log('Reducing Names ... finished');
				}).done(deferred.resolve);
			});
		}
	);
	return deferred.promise;
}

exports.preprocess.nestDoubleFaced = function () {
	var deferred = Q.defer();

	db.collection('cardsNameReduced').find({
		layout: 'double-faced'
	}).toArray(function (err, cards) {
		var promises = [];
		for (var i in cards) {
			var card = cards[i];
			(function (card) {
				var backside_name = card.names.filter(function (x) { return x != card.name })[0];
				db.collection('cardsNameReduced').findOne({name: backside_name}, function (err, backside_card) {
					card.backside = backside_card;
					promises.push(Q.ninvoke(db.collection('cardsNameReduced'), 'update', {_id: card._id}, card));
				});
			})(card);
		}

		//console.log(cards);
		deferred.resolve();
	});

	return deferred.promise;
}

exports.preprocess.types = function () {
	var deferred = Q.defer();

	db.dropCollection('supertypes');
	db.dropCollection('types');
	db.dropCollection('subtypes');

	var reduce = function (key, values) {
		return values.reduce(function (a, b) {
			var obj = {};

			for (var i in a) {
				obj[a[i]] = a[i];
			}
			for (var i in b) {
				obj[b[i]] = b[i];
			}
			return obj;
		})
	}

	db.collection('cardsNameReduced').mapReduce(
		function () { emit(0, this.supertypes) },
		reduce,
		{
			out: "inline"
		}, function (err, result) {
			if (err) throw err;

			result.find().toArray( function (err, cards) {
				var promises = [];
				for (var i in cards[0].value) {
					promises.push(Q.ninvoke(db.collection('supertypes'), 'insert', {
						name: cards[0].value[i]
					}));
				}
				Q.all(promises).then(function () {
					console.log('Finding supertypes ... finished');
				}).done(deferred.resolve);
			});
		}
	);

	db.collection('cardsNameReduced').mapReduce(
		function () { emit(0, this.types) },
		reduce,
		{
			out: "inline"
		}, function (err, result) {
			if (err) throw err;

			result.find().toArray( function (err, cards) {
				var promises = [];
				for (var i in cards[0].value) {
					promises.push(Q.ninvoke(db.collection('types'), 'insert', {
						name: cards[0].value[i]
					}));
				}
				Q.all(promises).then(function () {
					console.log('Finding types ... finished');
				}).done(deferred.resolve);
			});
		}
	);

	db.collection('cardsNameReduced').mapReduce(
		function () { emit(0, this.subtypes) },
		reduce,
		{
			out: "inline"
		}, function (err, result) {
			if (err) throw err;

			result.find().toArray( function (err, cards) {
				var promises = [];
				for (var i in cards[0].value) {
					promises.push(Q.ninvoke(db.collection('subtypes'), 'insert', {
						name: cards[0].value[i]
					}));
				}
				Q.all(promises).then(function () {
					console.log('Finding subtypes ... finished');
				}).done(deferred.resolve);
			});
		}
	);
	return deferred.promise;
}
