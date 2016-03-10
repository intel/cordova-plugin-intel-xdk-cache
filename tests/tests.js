cordova.define("intel.xdk.cache.tests.tests", function(require, exports, module) {
/*
Copyright 2015 Intel Corporation

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file 
except in compliance with the License. You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the 
License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, 
either express or implied. See the License for the specific language governing permissions 
and limitations under the License
*/

/*global exports, describe, document, afterEach, beforeEach, intel, expect, it, xit*/
/*global console*/

exports.defineAutoTests = function () {
    describe('The intel.xdk.cache plugin', function () {

        // packagedCall(obj, "foo") returns a function f such that f(x, y, z) returns 
        // a parameterless function g such that g() calls obj.foo(x, y, z).
        // 
        var packagedCall = function (obj, method) {
            return function (/*args*/) {
                var args = arguments;
                return function () { obj[method].apply(obj, args); };
            };
        };

        var listeners   = [];

        var listen = function(event, listener) {
            document.addEventListener(event, listener);
            listeners.push([event, listener]);
        };

        var removeListeners = function() {
            listeners.forEach(function(listener){
                document.removeEventListener(listener[0], listener[1]);
            });
            
            listeners = [];
        };

        afterEach(function() {
            removeListeners();
            intel.xdk.cache.clearAllCookies();
        });

        describe('has cookies which', function() {
            var setCookie;
            
            beforeEach(function() { 
                setCookie = packagedCall(intel.xdk.cache, "setCookie"); 
            });

            it("can be set", function() {
                expect(intel.xdk.cache.setCookie).toBeDefined();
                expect(setCookie("a")).not.toThrow();
            });

            it("must have a name", function() {
                expect(setCookie()).toThrow();
            });

            it("must have a name which does not contain a period", function() {
                expect(setCookie("ab.cd")).toThrow();
            });

            it("must have a name which does not begin with a digit", function() {
                expect(setCookie("0abcd")).toThrow();
            });

            it("can be set and fetched", function() {
                intel.xdk.cache.setCookie("a", "101");
                expect(intel.xdk.cache.getCookie("a")).toBe("101");
                intel.xdk.cache.setCookie("b");
                expect(intel.xdk.cache.getCookie("b")).toBe("");            
            });

            it('can be changed', function() {
                intel.xdk.cache.setCookie("a", "101");
                expect(intel.xdk.cache.getCookie("a")).toBe("101");
                intel.xdk.cache.setCookie("a", "202");
                expect(intel.xdk.cache.getCookie("a")).toBe("202");
            });

            /**
             * Skipped test suite, intel.xdk.cache._offsetDate is undefined
             */
            describe('expire', function() {

                afterEach(function() {
                    intel.xdk.cache._offsetDate(0);
                });

                xit('never, by default', function(done) {
                    intel.xdk.cache.setCookie("a", "101");
                    expect(intel.xdk.cache.getCookie("a")).toBe("101");
                    intel.xdk.cache.getInfo(reloadedNow, getInfoFailed);

                    function reloadedNow() {
                        expect(intel.xdk.cache.getCookie("a")).toBe("101");
                        intel.xdk.cache._offsetDate(1);
                        intel.xdk.cache.getInfo(reloadedTomorrow, getInfoFailed);
                    }

                    function reloadedTomorrow() {
                        expect(intel.xdk.cache.getCookie("a")).toBe("101");
                        intel.xdk.cache._offsetDate(7);
                        intel.xdk.cache.getInfo(reloadedNextWeek, getInfoFailed);
                    }

                    function reloadedNextWeek() {
                        expect(intel.xdk.cache.getCookie("a")).toBe("101");
                        intel.xdk.cache._offsetDate(365);
                        intel.xdk.cache.getInfo(reloadedNextYear, getInfoFailed);
                    }

                    function reloadedNextYear() {
                        expect(intel.xdk.cache.getCookie("a")).toBe("101");
                        done();
                    }

                    function getInfoFailed() {
                        // Should not happen!
                        expect(true).toBe(false);
                        done();
                    }
                });

                xit('never, if days == -1', function(done) {
                    intel.xdk.cache.setCookie("a", "101", -1);
                    expect(intel.xdk.cache.getCookie("a")).toBe("101");
                    intel.xdk.cache.getInfo(reloadedNow, getInfoFailed);

                    function reloadedNow() {
                        expect(intel.xdk.cache.getCookie("a")).toBe("101");
                        intel.xdk.cache._offsetDate(1);
                        intel.xdk.cache.getInfo(reloadedTomorrow, getInfoFailed);
                    }

                    function reloadedTomorrow() {
                        expect(intel.xdk.cache.getCookie("a")).toBe("101");
                        intel.xdk.cache._offsetDate(7);
                        intel.xdk.cache.getInfo(reloadedNextWeek, getInfoFailed);
                    }

                    function reloadedNextWeek() {
                        expect(intel.xdk.cache.getCookie("a")).toBe("101");
                        intel.xdk.cache._offsetDate(365);
                        intel.xdk.cache.getInfo(reloadedNextYear, getInfoFailed);
                    }

                    function reloadedNextYear() {
                        expect(intel.xdk.cache.getCookie("a")).toBe("101");
                        done();
                    }

                    function getInfoFailed() {
                        // Should not happen!
                        expect(true).toBe(false);
                        done();
                    }
                });

                xit('on page reload, if days == 0', function(done) {
                    intel.xdk.cache.setCookie("a", "101", 0);
                    expect(intel.xdk.cache.getCookie("a")).toBe("101");
                    intel.xdk.cache.getInfo(reloadedNow, getInfoFailed);

                    function reloadedNow() {
                        expect(intel.xdk.cache.getCookie("a")).toBeUndefined();
                        intel.xdk.cache._offsetDate(1);
                        intel.xdk.cache.getInfo(reloadedTomorrow, getInfoFailed);
                    }

                    function reloadedTomorrow() {
                        expect(intel.xdk.cache.getCookie("a")).toBeUndefined();
                        done();
                    }

                    function getInfoFailed() {
                        // Should not happen!
                        expect(true).toBe(false);
                        done();
                    }
                });

                xit('after N days, if days == N', function(done) {
                    intel.xdk.cache.setCookie("a", "101", 365);
                    expect(intel.xdk.cache.getCookie("a")).toBe("101");
                    intel.xdk.cache.getInfo(reloadedNow, getInfoFailed);

                    function reloadedNow() {
                        expect(intel.xdk.cache.getCookie("a")).toBe("101");
                        intel.xdk.cache._offsetDate(1);
                        intel.xdk.cache.getInfo(reloadedTomorrow, getInfoFailed);
                    }

                    function reloadedTomorrow() {
                        expect(intel.xdk.cache.getCookie("a")).toBe("101");
                        intel.xdk.cache._offsetDate(7);
                        intel.xdk.cache.getInfo(reloadedNextWeek, getInfoFailed);
                    }

                    function reloadedNextWeek() {
                        expect(intel.xdk.cache.getCookie("a")).toBe("101");
                        intel.xdk.cache._offsetDate(365);
                        intel.xdk.cache.getInfo(reloadedNextYear, getInfoFailed);
                    }

                    function reloadedNextYear() {
                        expect(intel.xdk.cache.getCookie("a")).toBeUndefined();
                        done();
                    }

                    function getInfoFailed() {
                        // Should not happen!
                        expect(true).toBe(false);
                        done();
                    }
                });
            });

        });

        describe('has a cookie list which', function() {

            var cookies = [ ["Butcher", "Dead Beef"],
                            ["Baker", "Better Biscuit"],
                            ["Candlestick Maker", "Don't Ask!"] ];

            it('is an array of cookie name strings', function() {
                expect(intel.xdk.cache.getCookieList() instanceof Array).toBe(true);
            });

            it('can have cookies added to it', function() {
                var numCookies = intel.xdk.cache.getCookieList().length;
                for (var i = 0; i != cookies.length; ++i) {
                    intel.xdk.cache.setCookie("Cookie" + i);
                    expect(intel.xdk.cache.getCookieList().length).toBe(++numCookies);
                }
            });

            it('can be emptied', function() {
                var numCookies = intel.xdk.cache.getCookieList().length;
                for (var i = 0; i != 5; ++i) {
                    intel.xdk.cache.setCookie("Cookie" + i);
                    expect(intel.xdk.cache.getCookieList().length).toBe(++numCookies);
                }
                intel.xdk.cache.clearAllCookies();
                expect(intel.xdk.cache.getCookieList().length).toBe(0);
            });

            it('contains just the cookies that have been added to it', function() {
                intel.xdk.cache.clearAllCookies();
                for (var i = 0; i != cookies.length; ++i) {
                    intel.xdk.cache.setCookie(cookies[i][0], cookies[i][1]);
                    expect(intel.xdk.cache.getCookieList().length).toBe(i+1);
                    for (var j = 0; j != cookies.length; ++j) {
                        if (j <= i) {
                            expect(intel.xdk.cache.getCookie(cookies[j][0])).toBe(cookies[j][1]);
                        }
                        else {
                            expect(intel.xdk.cache.getCookie(cookies[j][0])).toBeUndefined();
                        }
                    }
                }
            });

            it('can have cookies removed from it', function() {
                intel.xdk.cache.clearAllCookies();
                
                for (var i = 0; i != cookies.length; ++i) {
                    intel.xdk.cache.setCookie(cookies[i][0], cookies[i][1]);
                    expect(intel.xdk.cache.getCookieList().length).toBe(i+1);
                }
                
                for (i = 0; i != cookies.length; ++i) {
                    intel.xdk.cache.removeCookie(cookies[i][0]);
                    expect(intel.xdk.cache.getCookieList().length).toBe(cookies.length-(i+1));
                    for (var j = 0; j != cookies.length; ++j) {
                        if (j <= i) {
                            expect(intel.xdk.cache.getCookie(cookies[j][0])).toBeUndefined();
                        }
                        else {
                            expect(intel.xdk.cache.getCookie(cookies[j][0])).toBe(cookies[j][1]);
                        }
                    }
                }
            });

            it('maintains state when the plugin data is reloaded', function(done) {
                // As far as the plugin is concerned, calling the getInfo() method is equivalent
                // to reloading the current page.
                intel.xdk.cache.clearAllCookies();
                for (var i = 0; i != cookies.length; ++i) {
                    intel.xdk.cache.setCookie(cookies[i][0], cookies[i][1]);
                    expect(intel.xdk.cache.getCookieList().length).toBe(i+1);
                    for (var j = 0; j != cookies.length; ++j) {
                        if (j <= i) {
                            expect(intel.xdk.cache.getCookie(cookies[j][0])).toBe(cookies[j][1]);
                        }
                        else {
                            expect(intel.xdk.cache.getCookie(cookies[j][0])).toBeUndefined();
                        }
                    }
                }

                intel.xdk.cache.getInfo(reloadedAfterAdd, getInfoFailed);

                function reloadedAfterAdd() {
                    intel.xdk.cache.removeCookie(cookies[0][0]);
                    intel.xdk.cache.getInfo(reloadedAfterRemove, getInfoFailed);
                }

                function reloadedAfterRemove() {
                    expect(intel.xdk.cache.getCookieList().length).toBe(cookies.length-1);
                    expect(intel.xdk.cache.getCookie(cookies[0][0])).toBeUndefined();
                    for (var j = 1; j != cookies.length; ++j) {
                        expect(intel.xdk.cache.getCookie(cookies[j][0])).toBe(cookies[j][1]);
                    }
                    intel.xdk.cache.clearAllCookies();
                    intel.xdk.cache.getInfo(reloadedAfterClear, getInfoFailed);
                }

                function reloadedAfterClear() {
                    expect(intel.xdk.cache.getCookieList().length).toBe(0);
                    done();
                }

                function getInfoFailed() {
                    // Should not happen!
                    expect(true).toBe(false);
                    done();
                }
            });
        });

    }); 
};

exports.defineManualTests = function (contentEl, createActionButton) {
    'use strict';
    
    function logMessage(message, color) {
        var log = document.getElementById('info'),
            logLine = document.createElement('div');
        
        if (color) {
            logLine.style.color = color;
        }
        
        logLine.innerHTML = message;
        log.appendChild(logLine);
    }

    function clearLog() {
        var log = document.getElementById('info');
        log.innerHTML = '';
    }
    
    function testNotImplemented(testName) {
        return function () {
            console.error(testName, 'test not implemented');
        };
    }
    
    function init() {
        document.addEventListener('intel.xdk.cache.media.add', handleCacheEvent, false);
        document.addEventListener('intel.xdk.cache.media.update', handleCacheEvent, false);
        document.addEventListener('intel.xdk.cache.media.clear', handleCacheEvent, false);
        document.addEventListener('intel.xdk.cache.media.remove', handleCacheEvent, false);
    }
    
    /**
     * intel.xdk.cache.media.add    (e.url, e.success (true/false))
     * intel.xdk.cache.media.add    (e.url, e.id, e.success (true/false))
     * intel.xdk.cache.media.update (e.id, e.current, e.total)
     * intel.xdk.cache.media.clear
     * intel.xdk.cache.media.remove (e.url, e.success (true/false))
     */
    function handleCacheEvent(e) {
        console.log('event:',e.type);
        
        if( e.type === 'intel.xdk.cache.media.add' && e.hasOwnProperty('id') ) {
            console.log('add:',e.success?'succeeded':'failed','id:',e.id,'(' + e.url + ')');
        } else if( e.type === 'intel.xdk.cache.media.add' ) {
            console.log('add:',e.success?'succeeded':'failed','(' + e.url + ')');
        } else if(e.type === 'intel.xdk.cache.media.update') {
            var pct = Math.floor((e.current/e.total) * 100);
            console.log('updated - id:',e.id,'(' + pct + '%)'); 
        } else if(e.type=='intel.xdk.cache.media.clear') {
            /** TODO: define action */
        } else if(e.type=='intel.xdk.cache.media.remove') {
            console.log('remove ',e.success?'succeeded':'failed','(' + e.url + ')');
        }
    }
    
    /** object to hold properties and configs */
    var TestSuite = {};
    TestSuite.testImg = 'http://farm6.staticflickr.com/5152/5843119198_941a9f78a2_o.jpg';
    TestSuite.testImg2 = 'http://www.w3.org/html/logo/downloads/HTML5_Logo_512.png';
    TestSuite.testImgInterval = -1;
    
    TestSuite.$markup = '' +
        '<fieldset>' +
            '<legend>Cookies tests</legend>' +
            
            '<h3>Cookies parameters</h3>' +
              '<h4>Cookie Name</h4>' +
              '<input id="cookieNameInput" type="text" class="topcoat-text-input" value="" placeholder="cookie name"><br>' +
              '<h4>Cookie Value</h4>' +
              '<input id="cookieValueInput" type="text" class="topcoat-text-input" value="" placeholder="cookie value"><br>' +

            '<h3>Set Cookie</h3>' +
            '<div id="buttonSetCookie"></div>' +
            'Expected result: should set a cookie with the given name and value' +

            '<h3>Get Cookie</h3>' +
            '<div id="buttonGetCookie"></div>' +
            'Expected result: should get cookie with the given name' +

            '<h3>Remove Cookie</h3>' +
            '<div id="buttonRemoveCookie"></div>' +
            'Expected result: should remove cookie with the given name' +

            '<h3>Get Cookie List</h3>' +
            '<div id="buttonGetCookieList"></div>' +
            'Expected result: should display cookie list' +

            '<h3>Clear All Cookies</h3>' +
            '<div id="buttonClearAllCookies"></div>' +
            'Expected result: should clear all cookies' +
        '</fieldset>' +
        
        '<fieldset>' +
            '<legend>Media Cache tests</legend>' +
      
            '<select id="mediaSelect" class="topcoat-select">' +
                '<option value="http://farm6.staticflickr.com/5152/5843119198_941a9f78a2_o.jpg">Image A</option>' +
                '<option value="http://www.w3.org/html/logo/downloads/HTML5_Logo_512.png">Image B</option>' +
            '</select>' +
      
            '<h3>Add to Media Cache</h3>' +
            '<div id="buttonAddToMediaCache"></div>' +
            'Expected result: should add selected media to media cache' +

            '<h3>Add to Media Cache Ext</h3>' +
            '<div id="buttonAddToMediaCacheExt"></div>' +
            'Expected result: should add selected media to media cache ext' +

            '<h3>Add to Media Cache Ext with Basic Auth</h3>' +
            '<div id="buttonAddToMediaCacheExtBasicAuth"></div>' +
            'Expected result: should add password protected media to media cache ext' +

            '<h3>Remove From Media Cache</h3>' +
            '<div id="buttonRemoveFromMediaCache"></div>' +
            'Expected result: should remove selected media from media cache' +

            '<h3>Get Media Cache Local URL</h3>' +
            '<div id="buttonGetMediaCacheLocalURL"></div>' +
            'Expected result: should print selected media local url' +
      
            '<h3>Clear Media Cache</h3>' +
            '<div id="buttonClearMediaCache"></div>' +
            'Expected result: should clear media cache' +

            '<h3>Get Media Cache List</h3>' +
            '<div id="buttonGetMediaCacheList"></div>' +
            'Expected result: should print media cache list' +
        '</fieldset>';
        
    contentEl.innerHTML = '<div id="info"></div>' + TestSuite.$markup;
    
    createActionButton('setCookie', function () {
        console.log('executing', 'intel.xdk.cache.setCookie');
        var name = document.getElementById('cookieNameInput').value;
        var value = document.getElementById('cookieValueInput').value;
        intel.xdk.cache.setCookie(name, value, -1);
        console.log('cookie name:',name,'- cookie value:', value);
    }, 'buttonSetCookie');
  
    createActionButton('getCookie', function () {
        console.log('executing', 'intel.xdk.cache.getCookie');
        var name = document.getElementById('cookieNameInput').value;
        console.log('cookie name:',name,'- cookie value:', intel.xdk.cache.getCookie(name));
    }, 'buttonGetCookie');
    
    createActionButton('removeCookie', function () {
        console.log('executing', 'intel.xdk.cache.removeCookie');
        var name = document.getElementById('cookieNameInput').value;
        intel.xdk.cache.removeCookie(name);
    }, 'buttonRemoveCookie');
    
    createActionButton('getCookieList()', function () {
        console.log('executing', 'intel.xdk.cache.getCookieList');
        console.log(intel.xdk.cache.getCookieList());
    }, 'buttonGetCookieList');
    
    createActionButton('clearAllCookies()', function () {
        console.log('executing', 'intel.xdk.cache.clearAllCookies');
        intel.xdk.cache.clearAllCookies();
    }, 'buttonClearAllCookies');
    
    createActionButton('addToMediaCache()', function() {
        console.log('executing', 'intel.xdk.cache.addToMediaCache');
        var image = document.getElementById('mediaSelect').value;
        intel.xdk.cache.addToMediaCache(image);
    }, 'buttonAddToMediaCache');
    
    createActionButton('addToMediaCacheExt()', function() {
        console.log('executing', 'intel.xdk.cache.addToMediaCacheExt');
        var image = document.getElementById('mediaSelect').value;
        intel.xdk.cache.addToMediaCacheExt(image, 1);
    }, 'buttonAddToMediaCacheExt');
    
    createActionButton('addToMediaCacheExtBasicAuth()', function() {
        console.log('executing', 'intel.xdk.cache.addToMediaCacheExt with basic auth');
        var json = 'http://user1:passwd1@httpbin.org/basic-auth/user1/passwd1';
        intel.xdk.cache.addToMediaCacheExt(json, 2);
    }, 'buttonAddToMediaCacheExtBasicAuth');

    createActionButton('getMediaCacheLocalURL()', function() {
        console.log('executing', 'intel.xdk.cache.getMediaCacheLocalURL');
        var image = document.getElementById('mediaSelect').value;
        console.log('url:',intel.xdk.cache.getMediaCacheLocalURL(image));
    }, 'buttonGetMediaCacheLocalURL');
  
    createActionButton('removeFromMediaCache()',function () {
        console.log('executing', 'intel.xdk.cache.removeFromMediaCache');
        var image = document.getElementById('mediaSelect').value;
        intel.xdk.cache.removeFromMediaCache(image);
    },'buttonRemoveFromMediaCache');
    
    createActionButton('clearMediaCache()', function () {
        console.log('executing', 'intel.xdk.cache.clearMediaCache');
        intel.xdk.cache.clearMediaCache();
    }, 'buttonClearMediaCache');
    
    createActionButton('getMediaCacheList()', function() {
        console.log('executing', 'intel.xdk.cache.getMediaCacheList');
        console.log('list:',intel.xdk.cache.getMediaCacheList());
    }, 'buttonGetMediaCacheList');
  
    document.addEventListener('deviceready', init, false);
};
});
