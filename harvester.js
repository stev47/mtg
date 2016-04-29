var harmest = require('./harmest.js');
var _ = require('lodash');
var Q = require('q');

harmest.config({
    headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2272.101 Safari/537.36'
    },
});

//exports.logLevel = log.level;

exports.fetchCardOffers = function (cardname) {
    var url = 'https://www.magiccardmarket.eu/Cards/' + encodeURIComponent(cardname);
    return harmest.get(url, function ($) {
        return Q($('.MKMTable tbody tr').map(function(tr) {
            //console.log(tr);
            //console.log($('td:nth-child(5) a span', tr));
            return {
                lang: $('td:nth-child(5) a span', tr).attribs.onmouseover.match(/showMsgBox\('(.+)'\)/)[1],
                condition: $('td:nth-child(6) a img', tr).attribs.onmouseover.match(/showMsgBox\('(.+)'\)/)[1],
                foil: !$('td:nth-child(7)', tr).isEmpty(),
                signed: !$('td:nth-child(8)', tr).isEmpty(),
                playset: !$('td:nth-child(9)', tr).isEmpty(),
                altered: !$('td:nth-child(10)', tr).isEmpty(),
                price: parseFloat($('td:nth-child(13)', tr).text(0).replace(',', '.')),
            }
        }));
    });
}
