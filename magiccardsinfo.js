var harmest = require('./harmest.js');
var _ = require('lodash');

harmest.config({baseUrl: 'http://magiccards.info/'});

// todo: gets wrong url sometimes (when name is contained in other cards name: "Blizzard")

exports.getImgUrl = function (cardName) {
    console.log('Requesting card ' + cardName)
    return harmest.get('query?q=!' + encodeURIComponent(cardName), function ($) {
        return $('table:nth-of-type(3) tr:nth-child(1) td:nth-child(1) img').attribs.src;
    });
}




