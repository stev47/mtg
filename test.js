var m = require('./magiccardsinfo.js');

m.getImgUrl('Dark Depths').done(function (res) {
    console.log(res);
})

/*var harvester = require('./harvester.js'),
    argv = require('yargs')
        .boolean('v')
        .argv,
    log = require('npmlog');


if (argv.v) log.level = 'verbose';

harvester.fetchCardOffers('Narset Transcendent').done(function (res) {
    console.log(res);
    process.exit();
});
/*

var harmest = require('./harmest.js');
var _ = require('lodash');

harmest.config({baseUrl: 'https://www.magiccardmarket.eu/'});

harmest.get('/Products/Singles/Dragons+of+Tarkir', function ($) {
    var count = $('.navBarTopText span.vAlignMiddle').text().match(/^(\d+)/)[1];
    var pages = Math.ceil(count / 30);

    var urls = []
    for (var i = 0; i < pages; ++i) {
        urls.push('/Products/Singles/Dragons+of+Tarkir?resultsPage=' + i);
    }
    return harmest.get(urls, function ($) {
        return $('.MKMTable tr td:nth-child(3) a').map(el => el.attribs.href);
    }).then(_.flatten);

}).done(function (res) {
    console.log(res);
});

*/
