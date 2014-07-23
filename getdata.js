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
casper.options.waitTimeout = 90000;
var interpage_wait = 300;

//require("utils").dump(casper.cli.args);

function thenEcho(s) {
    casper.then(function() {this.echo(s);});
}

function getheader(year) {
    casper.waitForSelector("table[border='1']", function() {
        // get headers
        var headers = casper.evaluate(function() {
            var newlinks = document.querySelectorAll("table[border='1'] tr:nth-of-type(2)");
            newlinks = Array.prototype.map.call(newlinks, function(e) {
                return Array.prototype.map.call(e.querySelectorAll('th'), function(td) {
                    return td.textContent.replace('\n', ' '); // don't want newlines
                });
            });
            return newlinks;
        });
        writeheaders(year, headers);
    });
}

function addtolinks(year, index) {
    casper.waitForSelector("table[border='1']", function() {
        var links = casper.evaluate(function() {
            var newlinks = document.querySelectorAll("table[border='1'] tr");
            newlinks = Array.prototype.map.call(newlinks, function(e) {
                return Array.prototype.map.call(e.querySelectorAll('td'), function(td) {
                    return td.textContent.replace('\n',' ');
                });
            });
            return newlinks.slice(3);
        });
        writelinks(year, links);
    });
}

function range(lowEnd, highEnd) {
    var arr = [];
    while(lowEnd < highEnd){
        arr.push(lowEnd++);
    }
    return arr;
}

function getraceresults(options) {
    var year = options.year;
    var link = options.link;
    console.log("***** FETCHING DATA FROM YEAR "+year+"****** "+link);
    casper.thenOpen(link);
    casper.waitForSelector('select[name="RaceRange"]');

    casper.then(function loopthrough() {
        var numpages = casper.evaluate(function getnumpages() {
            return document.querySelector('select[name="RaceRange"]').length;
        });
        thenEcho("Getting "+(numpages-1)+" pages");
        casper.eachThen(range(1,numpages), function forloop(response) {
//document.querySelector('img[alt="Later Runners"]')
            var i = response.data
            thenEcho('page '+i);
            casper.thenEvaluate(function(index) {
                document.querySelector('select[name="RaceRange"]').selectedIndex = index;
                document.querySelector('form[name="race"]').submit();
            }, i);
            if (i===1) {getheader(year);}
            addtolinks(year, i);
            casper.wait(interpage_wait);
            //thenEcho('going back');
            casper.thenOpen(link);
            casper.waitForSelector('select[name="RaceRange"]');
        });
        thenEcho('********** Finished with year '+year+' at '+link);
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

function writeheaders(year, links) {
    var data = links.map(function(row) {return 'race\tyear\t'+row.join('\t')}).join('\n')+'\n';
    fs.write(race+'-'+year+'.csv', data, 'a'); // 'a'ppend data to file
}

function writelinks(year, links) {
    var data = links.map(function(row) {return race+'\t'+year+'\t'+row.join('\t')}).join('\n')+'\n';
    fs.write(race+'-'+year+'.csv', data, 'a'); // 'a'ppend data to file
}

/*if (fs.exists(file)) {
    fs.remove(file);
}*/

casper.run();
