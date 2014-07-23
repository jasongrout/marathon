// casperjs sample.js 'http://www.marathonguide.com/results/browse.cfm?MIDD=472131103' NYC

main_url = "http://www.marathonguide.com/";

var casper = require('casper').create({
    verbose: true,
    //logLevel: "debug",
    onResourceRequested: function(c, requestData, networkRequest) {
        if (requestData.url.slice(0, main_url.length) !== main_url) {
            // ignore iframes that want to be loaded from random other URLs
            networkRequest.abort();
        }
},
});

var race = casper.cli.args[0];
var url = casper.cli.args[1];
var startyear = casper.cli.args[2] || 2014;
var fs = require('fs');
var utils = require('utils');

//require("utils").dump(casper.cli.args);

function thenEcho(s) {
    casper.then(function() {this.echo(s);});
}

function getraceresults(options) {
    var year = options.year;
    var link = options.link;
    console.log("***** FETCHING DATA FROM YEAR "+year+"****** "+link);
    casper.thenOpen(link);
    casper.waitForSelector('table[cellspacing="2"] td');
    casper.then(function() {
        var info = casper.evaluate(function() {
            return document.querySelector('table[cellspacing="2"] td').innerText
        });
        var date = info.match(/(\w+) (\d+), (\d+)/);
        var month = date[1];
        var day = date[2];
        var year = date[3];
        var finishers = info.match(/Finishers: (\d+)/) || ["","-1"];
        var line = [race, month, day, year, finishers[1] ].join('\t') + '\n';
        fs.write('info.txt', line, 'a');
    });
};

casper.start(url, function() {
    var years = casper.evaluate(function() {
        return Array.prototype.map.call(document.querySelectorAll('a[href^="../results/browse.cfm?MIDD="]'), function(elt) {
            return {'year': elt.innerText, 'link': elt.href};
        });
    });

    casper.eachThen(years, function(response) {
        if (parseInt(response.data.year) <= startyear) {
            getraceresults(response.data);
        } else {
            thenEcho("Skipping year "+response.data.year);
        }
    });
});

casper.run();
