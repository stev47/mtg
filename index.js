var path = require('path'),
	bodyParser = require('body-parser'),
	Q = require('q'),
	express = require('express'),
	cards = require('./cards');

Q.longStackSupport = true;

var app = express();

// template engine
app.engine('jade', require('jade').__express);
app.set('views', 'views');
app.set('view engine', 'jade');
app.set('view options', {pretty: true});

// process post variables
app.use(bodyParser.urlencoded({extended: true}));

// serve static documents
app.use(express.static('public'));


app.get('/', function (req, res) {
	res.render('index');
});

app.get('/print/*', function (req, res) {

	function getImageUrl(card) {
		//return "http://mtgimage.com/card/" + encodeURIComponent(card.imageName) + ".jpg";
		//return "https://api.mtgdb.info/content/hi_res_card_images/" + encodeURIComponent(card.multiverseid) + ".jpg";
		return card.imgUrl;
	}

	var MongoClient = require('mongodb').MongoClient;
	Q.ninvoke(MongoClient, 'connect', "mongodb://localhost:27017/mtg").done(function (db) {


		var card_names = decodeURIComponent(req.path.replace(/\/print\//, '')).split('/')
			.map(function (s) { return s.trim(); });
		console.log(card_names);

		return Q.all(card_names.map(function (card_name) {
			return Q.ninvoke(db.collection('cards'), 'findOne', {name: card_name});
		})).then(function (cards) {
			var cards = cards.map(function (card) {
				card.src = getImageUrl(card);
				return card;
			});
			res.render('print', {cards: cards});
		});

	});
});
/*
app.get('/import', admin.import);

app.get('/fetchDb', function (req, res) {
	admin.fetchDb().then(function () {
		res.send('finished!');
	})
});
app.get('/loadDb', function (req, res) {
	admin.loadDb().then(function () {
		res.send('finished!');
	})
});
app.get('/preprocess', function (req, res) {
	admin.preprocess.all().then(function () {
		res.send('finished!');
	})
});
app.get('/preprocess/nestDoubleFaced', function (req, res) {
	admin.preprocess.nestDoubleFaced().then(function () {
		res.send('finished!');
	})
})
app.get('/preprocess/types', function (req, res) {
	admin.preprocess.types().then(function () {
		res.send('finished!');
	})
})
*/
app.post('/query', cards.findByName);

app.get('/supertypes', cards.supertypes);
app.get('/types', cards.types);
app.get('/subtypes', cards.subtypes);

app.listen(3000);
