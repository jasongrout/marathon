// casperjs sample.js 'http://www.marathonguide.com/results/browse.cfm?MIDD=472131103' NYC

main_url = "http://www.marathonguide.com/";

var casper = require('casper').create({
    verbose: true,
    //logLevel: "debug",
    onResourceRequested: function(c, requestData, networkRequest) {
        if (requestData.url.slice(0, main_url.length) !== main_url) {
            networkRequest.abort();
            //console.log("aborted iframe");
        }
},
});

var url = casper.cli.args[0]
var file = casper.cli.args[1]
var fs = require('fs');
var utils = require('utils');
//casper.options.waitTimeout = 2000000;
var interpage_wait = 300;

//require("utils").dump(casper.cli.args);

function addtolinks(year, index) {
    casper.thenEvaluate(function(index) {
        document.querySelector('select[name="RaceRange"]').selectedIndex = index;
        document.querySelector('form[name="race"]').submit();
    }, index);
    casper.waitForSelector("table[border='1']", function() {
        if (index===1) {
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
        }
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
        casper.echo("Getting "+numpages+" pages");
        casper.eachThen(range(1,numpages), function forloop(response) {
            var i = response.data
            casper.echo('page '+i);
            addtolinks(year, i);
            casper.wait(interpage_wait);
            //casper.echo('going back');
            casper.thenOpen(link);
            casper.waitForSelector('select[name="RaceRange"]');
        });
        casper.then(function() {casper.echo('********** Finished with year '+year+' at '+link)});
    });
};

casper.start(url, function() {
    var years = casper.evaluate(function() {
        return Array.prototype.map.call(document.querySelectorAll('a[href^="../results/browse.cfm?MIDD="]'), function(elt) {
            return {'year': elt.innerText, 'link': elt.href};
        });
    });

    casper.eachThen(years, function(response) {
        getraceresults(response.data);
        casper.then(function() {console.log("********************MOVING TO NEXT YEAR*************************");});
    });

});

function writeheaders(year, links) {
    var data = links.map(function(row) {return 'year'+'\t'+row.join('\t')}).join('\n')+'\n';
    fs.write(file+year+'.csv', data, 'a'); // 'a'ppend data to file
}


function writelinks(year, links) {
    var data = links.map(function(row) {return year+'\t'+row.join('\t')}).join('\n')+'\n';
    fs.write(file+year+'.csv', data, 'a'); // 'a'ppend data to file
}

if (fs.exists(file)) {
    fs.remove(file);
}
casper.run();
