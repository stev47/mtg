var express = require('express'),
	cards = require('./cards');

var app = express();

app.engine('jade', require('jade').__express);


app.use(express.static(__dirname + '/public'));

app.get('/', function (req, res) {
	res.render('index.jade', {abc : 'abc'});
});

app.get('/cards', cards.findAll);
app.get('/regex/:pattern?', cards.findByName);
app.get('/import', cards.import);


app.listen(3000);
