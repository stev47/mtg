var mongoskin = require('mongoskin');
var db = new mongoskin.db('mongodb://localhost:27017/mtg', {w : 0});

var Q = require('q');
var fs = require('fs'),
    http = require('http'),
    unzip = require('unzip');

var argv = require('yargs')
        .argv;


Q.nbind = function (fn, thisp) {
    var fnArgs = Array.prototype.slice.call(arguments).slice(2);
    return function () {
        var deferred = Q.defer();
        fnArgs.push(deferred.makeNodeResolver());
        try {
            fn.apply(thisp, fnArgs)
        } catch (e) {
            deferred.reject(e);
        }
        return deferred.promise;
    }
}

exports.import = function (req, res) {
	exports.fetchDb()
		.then(exports.loadDb)
		.then(exports.preprocess.all);
};

exports.preprocess = {};
exports.preprocess.all = function () {
	return exports.preprocess.reduceNames()
		.then(exports.preprocess.nestDoubleFaced);
		.then(exports.preprocess.types);
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

	console.log('Fetching json …');
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
			fs.unlinkSync("data/cards.json.zip");
			console.log('Fetching json … finished');
			deferred.resolve();
		});
	});

	return deferred.promise;
}

exports.loadDb = function () {
	var deferred = Q.defer();

	var extend = require('util')._extend;
	console.log('Loading json …')
	var sets = require('./data/cards.json');


	return Q.all(Object.keys(sets).map(function (setname) {
		var set = extend({}, sets[setname]);
		delete set.cards;
		var cards = sets[setname].cards;

		cards = cards.map(function (card) {
			if (!'releaseDate' in card) card.releaseDate = set.releaseDate;
			return card;
		});

		return Q.all([].concat(
				Q.ninvoke(db.collection('sets'), 'insert', set),
				Q.ninvoke(db.collection('cardsRaw'), 'insert', cards)
			)).then(function () {
				console.log('Imported set ' + set.name);
			});
	})).then(function () {
		console.log('Importing DB finished!');
	});
}

exports.preprocess.reduceNames = function () {


	console.log('Reducing Names ...');

	//db.collection('cards').drop();

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

	return Q.ninvoke(db.collection('cardsRaw'), 'mapReduce',
			map,
			reduce,
			{
				out: "inline"
			}
		).then(function (res) {
			return Q.ninvoke(res.find(), 'toArray');
		})
		.then(function (cards) {
			//console.log(cards);
			return Q.all(cards.map(function (card) {
				return Q.ninvoke(db.collection('cards'), 'insert', card.value);
			}));
		}).then(function () {
			console.log('Reducing Names ... finished');
		});
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

	//db.dropCollection('supertypes');
	//db.dropCollection('types');
	//db.dropCollection('subtypes');

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

switch (argv._[0]) {
	case 'all':

		Q()
			.then(Q.nbind(db.collection('sets').drop, db.collection('sets'))).then(Q, Q)
			.then(Q.nbind(db.collection('cardsRaw').drop, db.collection('cardsRaw'))).then(Q, Q)
			.then(exports.fetchDb)
			.then(exports.loadDb)
			.then(exports.preprocess.all)
			.done(function () {
				console.log('Import finished.');
				process.exit();
			});
		break;
	case 'preprocess':
		Q()
			.then(Q.nbind(db.collection('cards').drop, db.collection('cards'))).then(Q, Q)
			.then(exports.preprocess.all)
			.done(function () {
				console.log('Preprocessing done.');
				process.exit();
			});
		break;
}

