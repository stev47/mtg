var path = require('path'),
	express = require('express'),
	cards = require('./cards');

var app = express();

app.engine('jade', require('jade').__express);

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(express.static('public'));

app.get('/', function (req, res) {
	res.render('index');
});

app.get('/cards', cards.findAll);
app.get('/regex/:pattern?', cards.findByName);
app.get('/import', cards.import);


app.listen(3000);
