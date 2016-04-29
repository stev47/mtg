var Q = require('q');
var merge = require('lodash/object/merge');
var assign = require('lodash/object/assign');
var request = require('request');
var htmlparser = require('htmlparser2');
var cssselect = require('css-select');

// TODO: create parallel scheduling, perhaps async.js parallelLimit()?
// TODO: use dom-serializer for html output

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



var config = {
    headers: {
        'User-Agent': 'request',
    },
};

exports.config = function (newConfig) {
    config = merge(config, newConfig);
}

var element = {
    text: function (index) {
        if (this.data)
            return this.data;

        if (index !== undefined) {
            var el = this.children[index];
            return element.text.call(el);
        }

        if (this.children instanceof Array) {
            var text = '';
            this.children.map(function (el) {
                text += element.text.call(el);
            });
            return text;
        }
    },
    isEmpty: function () {
        if (!this.children.every(c => c.type == 'text'))
            return false;
        if (this.text().trim() == '')
            return true;
        return false;
    }
}

var selector = function (dom, cssQuery, context) {
    context = (context)? context : dom;

    var result = cssselect(cssQuery, context);

    if (result.length == 0)
        return result;

    //if (result.length == 1) {
        for (key in element) {
            result[key] = element[key].bind(result[0]);
        }
    //}
    result.type = result[0].type;
    result.name = result[0].name;
    result.attribs = result[0].attribs;
    result.children = result[0].children;
    result.next = result[0].next;
    result.prev = result[0].prev;
    result.parent = result[0].parent;

    result.forEach(function (el) {
        assign(el, element);
    });

    return result;
}



exports.get = function (url, fnHarvest) {
    if (url instanceof Array) {
        return QW.sequence(url.map(u => exports.get.bind(null, u, fnHarvest)));
    }

    requestOptions = {
        url: url,
        headers: config.headers,
        baseUrl: config.baseUrl,
    }

    return Q.nfcall(request, requestOptions)
        .then(function (res) {
            var response = res[0];
            var body = res[1];

            var deferred = Q.defer();
            var domCallback = deferred.makeNodeResolver();

            var domHandler = new htmlparser.DomHandler(domCallback);
            var parser = new htmlparser.Parser(domHandler);

            parser.write(body);
            parser.done();

            return deferred.promise;
        }).then(function (dom) {
            return fnHarvest(selector.bind(null, dom));
        });
}
