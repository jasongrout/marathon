// casperjs sample.js 'http://www.marathonguide.com/results/browse.cfm?MIDD=472131103' NYC_2013.csv

var casper = require('casper').create({
    //verbose: true,
    //logLevel: "debug"
});

var url = casper.cli.args[0]
var file = casper.cli.args[1]
var fs = require('fs');

//require("utils").dump(casper.cli.args);

function addtolinks(index) {
    casper.thenEvaluate(function(index) {
        document.querySelector('select[name="RaceRange"]').selectedIndex = index; //it is obvious
        document.querySelector('form[name="race"]').submit();
    }, index);
    casper.waitForSelector("table[border='1']", function() {
        var links = casper.evaluate(function() {
            var newlinks = document.querySelectorAll("table[border='1'] tr");
            newlinks = Array.prototype.map.call(newlinks, function(e) {
                return Array.prototype.map.call(e.querySelectorAll('td'), function(td) {
                    return td.textContent;
                });
            });
            return newlinks.slice(3);
        });
        writelinks(links);
    });
}

function range(lowEnd, highEnd) {
    var arr = [];
    while(lowEnd <= highEnd){
        arr.push(lowEnd++);
    }
    return arr;
}

casper.start(url, function() {
    var numpages = casper.evaluate(function() {
        return document.querySelector('select[name="RaceRange"]').length;
    });
    casper.eachThen(range(1,numpages), function(response) {
        var i = response.data
        casper.echo('page '+i);
        addtolinks(i);
        casper.wait(300);
        casper.thenOpen(url);
        casper.waitForSelector('select[name="RaceRange"]');
    });
});

function writelinks(links) {
    var data = links.map(function(row) {return row.join('\t')}).join('\n')+'\n';
    fs.write(file, data, 'a');
}

fs.remove(file);
casper.run(function() {
    // echo results in some pretty fashion
    //var data = links.map(function(row) {return row.join('\t')}).join('\n');
    this.exit();
});
