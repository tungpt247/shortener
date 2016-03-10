var mongodb = require("mongodb");
var MongoClient = mongodb.MongoClient;
var fs = require("fs");
var logger = require('../logger.js')
var nouns = [];
var adjs = [];


function generateFiles() {
    nouns = fs.readFileSync('./modules/shortener/nouns.txt').toString().split("\n")
    adjs = fs.readFileSync('./modules/shortener/adjectives.txt').toString().split("\n")
    for (i=0; i<nouns.length; i++) {
        nouns[i] = nouns[i].replace("\r", "")
    }
    for (i=0; i<adjs.length; i++) {
        adjs[i] = adjs[i].replace("\r", "")
    }
    nouns = shuffle(nouns)
    adjs = shuffle(adjs)
}

function shuffle(array) {
  var currentIndex = array.length, temporaryValue, randomIndex;
  while (0 !== currentIndex) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }
  return array;
}

var l = "SHORT"
var dbURL = "mongodb://localhost/shortener"
var baseURL = "http://subr.pw/";

var URLCollection;
var UserCollection;

function init(callback) {
    MongoClient.connect(dbURL, function(err, db) {
        if (err) {
            logger.error(l, "Unable to connect to the MongoDB server. Error: " + err);
            throw new Error("Unable to connect to MongoDB");
            callback(false);
        } else {
            logger.log(l, "Connection established to " + dbURL);
            URLCollection = db.collection("url");
            UserCollection = db.collection("userData");

            URLCollection.createIndex({
                short: 1,
            }, {
                unique: true
            });
            callback(true);
        }
    });
}

function randomString(length, chars) {
    var mask = "";
    if (chars.indexOf("a") > -1) mask += "abcdefghijklmnopqrstuvwxyz";
    if (chars.indexOf("A") > -1) mask += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    if (chars.indexOf("#") > -1) mask += "0123456789";
    if (chars.indexOf("!") > -1) mask += '~`!@#$%^&*()_+-={}[]:";\"<>?,./|\\';
    var result = "";
    for (var i = length; i > 0; --i) {
        result += mask[Math.floor(Math.random() * mask.length)]
    }
    return result;
}

function mnemonicGenerator(url, callback) {
    if (nouns.length == 0 || adjs.length == 0) {
        generateFiles();
    } else {
        minimnemonic = adjs.pop() + "-" + nouns.pop()
        shorten(url, minimnemonic, function(blarg) {
            callback(blarg)
        })
    }
}

function shorten(url, customURL, callback) {
    var changed = false;
    if (customURL == null) {
        changed = true;
        customURL = randomString(6, "aA#");
    }
    URLCollection.find({
        long: url
    }).toArray(function(err, result) {
        if (err) {
            logger.error(l, err);
        } else if (result.length) {
            logger.warning(l, "Long Already Exists");
            if (!changed) {} else {}
            callback({
                status: true,
                short: baseURL + result[0].short
            });
        } else {
            if (customURL != null) {
                URLCollection.find({
                    short: customURL
                }).toArray(function(err, result) {
                    if (err) {
                        logger.error(l, err);
                    } else if (result.length) {
                        logger.warning(l, "customURL Already Exists");
                        callback({
                            status: false,
                            short: null
                        });
                    } else {
                        var data = {
                            short: customURL,
                            long: url
                        };
                        URLCollection.insert(data, function(err, result) {
                            if (err) {
                                logger.error(l, err);
                            } else {
                                fs.appendFile('./static/shortened.html', "<span style='font-family:monospace;'>" + baseURL + customURL + " | " + url + "</span><br />\n", function (err) {
                                    if (err) logger.error(l, err)
                                });
                                logger.log(l, "Added CustomURL to Database");
                                callback({
                                    status: true,
                                    short: baseURL + customURL
                                });
                            }
                        });
                    }
                });
            } else {
                logger.error(l, "CustomURL'ing went wrong...");
            }
        }
    });
}

function retrieve(shortURL, callback) {
    logger.log(l, "Retrieving: " + shortURL);
    URLCollection.find({
        short: shortURL
    }).toArray(function(err, result) {
        if (err) {
            logger.error(err);
        } else if (result.length) {
            callback({
                status: true,
                stats: result[0].long
            });
        } else {
            // No result!
            callback({
                status: false,
                stats: "https://subr.pw/"
            })
        }
    })
}

function getStats(shortURL, callback) {
    logger.log(l, "Getting stats for " + shortURL);
    logger.log(l, "userData.find({url:'" + shortURL + "'})");
    UserCollection.find({
        url: shortURL
    }).toArray(function(err, result) {
        if (err) {
            logger.error(l, err);
            callback({
                status: false
            })
        } else if (result.length) {
            callback({
                status: true,
                stats: result
            });
        } else {
            callback({
                status: false
            })
        }
    })
}

module.exports = {
    init: init,
    retrieve: retrieve,
    shorten: shorten,
    randomString: randomString,
    generateFiles: generateFiles,
    mnemonicGenerator: mnemonicGenerator
    //getStats: getStats
};