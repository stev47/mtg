var path = require('path'),
	bodyParser = require('body-parser'),
	express = require('express'),
	cards = require('./cards');
	admin = require('./admin');

var app = express();

// template engine
app.engine('jade', require('jade').__express);
app.set('views', 'views');
app.set('view engine', 'jade');

// process post variables
app.use(bodyParser.urlencoded({extended: true}));

// serve static documents
app.use(express.static('public'));


app.get('/', function (req, res) {
	res.render('index');
});

app.get('/import', admin.import);

app.get('/fetchDb', function (req, res) {
	admin.fetchDb().then(function () {
		res.send('finished!');
	})
});
app.get('/loadDb', function (req, res) {
	admin.fetchDb().then(function () {
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

app.post('/query', cards.findByName);

app.get('/types', cards.types);

app.listen(3000);
