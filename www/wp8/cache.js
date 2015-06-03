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


    var channel = require('cordova/channel'),
        utils = require('cordova/utils'),
        exec = require('cordova/exec');

    /**
     * Provides access to the various cache features on the device.
     */

    module.exports = {

        cookies: null,
        mediacache: null,
        mediacache_dir: null,

        getInfo: function (successCallback, errorCallback) {
            exec(successCallback, errorCallback, "IntelXDKCache", "getCacheInfo", []);
        },

        /**
         *
         */
        getCookie: function (name) {
            var cookie = undefined;
            try {
                //undelimit single quotes in value of cookie
                if (intel.xdk.cache.cookies[name].value.replace)
                    cookie = intel.xdk.cache.cookies[name].value.replace(/\\'/g, "'");
                else
                    cookie = intel.xdk.cache.cookies[name].value;

            } catch (e) { };
            return cookie;
        },

        /**
         *
         */
        getCookieList: function () {
            var cookies = [];
            for (cookie in intel.xdk.cache.cookies) {
                cookies.push(cookie);
            }
            return cookies;
        },

        /**
         *
         */
        setCookie: function (name, value, days) {
            //if expires <0, the cookie does not expire
            if (name == undefined || name.length == 0)
                throw (new Error("Error: intel.xdk.cache.setcookie, No cookie name specified."));
            if (name.indexOf('.') > -1)
                throw (new Error("Error: intel.xdk.cache.setcookie, No '.' allowed in cookie names."));
            var tester = "0123456789";
            if (tester.indexOf(name.charAt(0)) > -1)
                throw (new Error("Error: intel.xdk.cache.setcookie, No numbers as first character in cookie names."));

            if (typeof value == "undefined") {
                value = "";
            }

            //make sure value is a string
            value = String(value);

            intel.xdk.cache.cookies[name] = { "value": value };

            exec(null, null, "IntelXDKCache", "setCookie", [name, value, days]);
        },

        /**
         *
         */
        removeCookie: function (name) {
            if (intel.xdk.cache.cookies && intel.xdk.cache.cookies[name]) {
                delete intel.xdk.cache.cookies[name];
                exec(null, null, "IntelXDKCache", "removeCookie", [name]);
            }
        },

        /**
         *
         */
        clearAllCookies: function (url) {
            intel.xdk.cache.cookies = {};
            exec(null, null, "IntelXDKCache", "clearAllCookies", []);
        },

        /**
         *
         */
        getMediaCacheList: function () {
            var cache = [];
            for (url in this.mediacache) {
                cache.push(url);
            }
            return cache;
        },

        /**
         *
         */
        getMediaCacheLocalURL: function (url) {
            var localURL = this.mediacache[url];
            if (localURL) {
                if (navigator.userAgent.indexOf("MSIE") > -1) {
                    if (this.mediacache_dir.indexOf("C:") != -1)
                        localURL = this.mediacache_dir + '/' + localURL;
                    else
                        localURL = 'ms-appdata:///local/' + this.mediacache_dir + '/' + localURL;
                } else {
                    localURL = 'file:///' + this.mediacache_dir + '/' + localURL;
                }
                console.log(localURL);
            }
            return localURL;
        },

        //  /**
        //   *
        //   */
        //  getMediaCacheRelativePath: function(url) {
        //      console.log(' in getMediaCacheRelativePath');
        //      var localURL = undefined;
        //      //check if the url is cached
        //      for(var i=0;i<this.mediacache.length;i++) {
        //          if(url==this.mediacache[i][0]) {
        //              localURL = this.mediacache_dir+'/'+this.mediacache[i][1];
        //              console.log(localURL);
        //              break;
        //          }
        //      }
        //      return localURL;
        //  },

        /**
         *
         */
        clearMediaCache: function () {
            exec(null, null, "IntelXDKCache", "clearMediaCache", []);
        },

        /**
         *
         */
        addToMediaCache: function (url) {
            exec(null, null, "IntelXDKCache", "addToMediaCache", [url, ""]);
        },

        /**
         *
         */
        addToMediaCacheExt: function (url, id) {
            exec(null, null, "IntelXDKCache", "addToMediaCache", [url, id]);
        },

        /**
         *
         */
        removeFromMediaCache: function (url) {
            exec(null, null, "IntelXDKCache", "removeFromMediaCache", [url]);
        },

    }

    var me = module.exports;
    //cookies maintenance -- all client-side

    //mediacache maintenance

    document.addEventListener('intel.xdk.cache.internal.media.add', function (e) {
        me.mediacache[e.url] = e.filename;
    }, false);

    document.addEventListener('intel.xdk.cache.internal.media.remove', function (e) {
        delete me.mediacache[e.url];
    }, false);

    document.addEventListener('intel.xdk.cache.internal.media.clear', function (e) {
        me.mediacache = [];
    }, false);

    channel.createSticky('IntelXDKCache');
    channel.waitForInitialization('IntelXDKCache');
    channel.onCordovaReady.subscribe(function () {
        me.getInfo(function (info) {
            me.cookies = info.cookies;
            me.mediacache = info.mediacache;
            me.mediacache_dir = info.mediacache_dir;
            channel.IntelXDKCache.fire();
        }, function (e) {
            utils.alert("[ERROR] Error initializing Intel XDK Cache: " + e);
        });
    });



