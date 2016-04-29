var mongoskin = require('mongoskin');
var db = new mongoskin.db('mongodb://localhost:27017/mtg', {w : 0});

var Q = require('q');
var fs = require('fs'),
    http = require('http'),
    unzip = require('unzip');

var argv = require('yargs')
        .argv;

// Small wrapper utility for Q
var QW = {};
QW.sequence = function (jobs) {
    var resArr = [];
    var seq = Q();
    jobs.forEach(function (job, i) {
        seq = seq.then(job).then(function (res) {
            resArr[i] = res;
        });
    });
    return seq.then(() => resArr);
}

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
        .then(exports.preprocess.nestDoubleFaced)
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
    exports.download("http://mtgjson.com/json/AllSets-x.json.zip", "data/cards.json.zip", function (err, res) {
        if (err) throw err;
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

    var fns = []
    for (var setname in sets) {

        var set = extend({}, sets[setname]);
        delete set.cards;
        var cards = sets[setname].cards;

        cards = cards.map(function (card) {
            if (!'releaseDate' in card) card.releaseDate = set.releaseDate;
            if (set.magicCardsInfoCode && card.number)
                card.imgUrl = "http://magiccards.info/scans/en/" + set.magicCardsInfoCode + "/" + card.number + ".jpg";
            return card;
        });

        fns.push((function(set, cards) {
            return QW.sequence([
                Q.nbind(db.collection('sets').insert, db.collection('sets'), set),
                Q.nbind(db.collection('cardsRaw').insert, db.collection('cardsRaw'), cards),
                function () {
                    console.log('Imported set ' + set.name);
                },
            ]);
        }).bind(null, set, cards));
    }
    return QW.sequence(fns).then(function () {
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

    console.log('Nesting double-faced cards …');

    db.collection('cards').find({
        layout: 'double-faced'
    }).toArray(function (err, cards) {
        var promises = [];
        for (var i in cards) {
            var card = cards[i];
            (function (card) {
                var backside_name = card.names.filter(function (x) { return x != card.name })[0];
                db.collection('cards').findOne({name: backside_name}, function (err, backside_card) {
                    card.backside = backside_card;
                    promises.push(Q.ninvoke(db.collection('cards'), 'update', {_id: card._id}, card));
                });
            })(card);
        }

        console.log('Nesting double-faced cards … finished');
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

    db.collection('cards').mapReduce(
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

    db.collection('cards').mapReduce(
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

    db.collection('cards').mapReduce(
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
    case 'fetch':
        Q()
            .then(exports.fetchDb)
            .done(function () {
                console.log('Fetch finished.');
                process.exit();
            });
        break;
    case 'all':

        Q()
            .then(Q.nbind(db.collection('sets').drop, db.collection('sets'))).then(Q, Q)
            .then(Q.nbind(db.collection('cardsRaw').drop, db.collection('cardsRaw'))).then(Q, Q)
            .then(Q.nbind(db.collection('cards').drop, db.collection('cards'))).then(Q, Q)
            .then(Q.nbind(db.collection('supertypes').drop, db.collection('supertypes'))).then(Q, Q)
            .then(Q.nbind(db.collection('types').drop, db.collection('types'))).then(Q, Q)
            .then(Q.nbind(db.collection('subtypes').drop, db.collection('subtypes'))).then(Q, Q)
            //.then(exports.fetchDb)
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
            .then(Q.nbind(db.collection('supertypes').drop, db.collection('supertypes'))).then(Q, Q)
            .then(Q.nbind(db.collection('types').drop, db.collection('types'))).then(Q, Q)
            .then(Q.nbind(db.collection('subtypes').drop, db.collection('subtypes'))).then(Q, Q)
            .then(exports.preprocess.all)
            .done(function () {
                console.log('Preprocessing done.');
                process.exit();
            });
        break;
}

