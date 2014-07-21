// casperjs sample.js 'http://www.marathonguide.com/results/browse.cfm?MIDD=472131103' NYC

main_url = "http://www.marathonguide.com/";

var casper = require('casper').create({
    verbose: true,
    logLevel: "debug",
    onResourceRequested: function(c, requestData, networkRequest) {
        if (requestData.url.slice(0, main_url.length) !== main_url) {
            networkRequest.abort();
            //console.log("aborted iframe");
        }
},
});

var url = casper.cli.args[0]
var race = casper.cli.args[1]
var fs = require('fs');
var utils = require('utils');
//casper.options.waitTimeout = 2000000;
var interpage_wait = 300;

//require("utils").dump(casper.cli.args);

function getheader(year) {
    casper.waitForSelector("table[border='1']", function writeHeader() {
        // get headers
        var headers = casper.evaluate(function getHeaderData() {
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
    thenecho("adding links");
    casper.waitForSelector("table[border='1']", function writeTableData() {
        var links = casper.evaluate(function getRowData() {
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
    thenecho("done adding links");
}

function range(lowEnd, highEnd) {
    var arr = [];
    while(lowEnd < highEnd){
        arr.push(lowEnd++);
    }
    return arr;
}

function thenecho(s) {
    casper.then(function() {this.echo(s);});
}

function getraceresults(options) {
    var year = options.year;
    var link = options.link;
    console.log("***** FETCHING DATA FROM YEAR "+year+"****** "+link);
    casper.thenOpen(link);
    casper.waitForSelector('select[name="RaceRange"]');

    casper.then(function getnumpages() {
        var numpages = casper.evaluate(function getnumpages() {
            return document.querySelector('select[name="RaceRange"]').length;
        });
        thenecho("Getting "+numpages+" pages");
        casper.thenEvaluate(function getFirstPage(index) {
            document.querySelector('select[name="RaceRange"]').selectedIndex = index;
            document.querySelector('form[name="race"]').submit();
        }, 1);
        getheader(year);
        casper.eachThen(range(1,numpages), function forloop(response) {
            var i = response.data
            thenecho('page '+i);
            addtolinks(year, i);
            casper.then(function() {this.echo("donewaiting");});
            if(i < numpages-1) {
                /*
                casper.then( function gotoNextLink() {
                    thenecho("getting nextlink");
                    var nextlink = casper.evaluate(function getNextLink() {
                        return document.querySelector('a > img[alt="Later Runners"]').parentNode.href;
                    });
                    thenecho("Going to "+nextlink);
                    casper.thenOpen(nextlink);
                });
                */
                casper.then(function () {this.click('img[alt="Later Runners"]');});
                casper.wait(interpage_wait);
            }
        });
        thenecho('********** Finished with year '+year+' at '+link);
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
        //casper.then(function() {console.log("********************MOVING TO NEXT YEAR*************************");});
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
