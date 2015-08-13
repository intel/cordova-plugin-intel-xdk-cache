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


    // This try/catch is temporary to maintain backwards compatibility. Will be removed and changed to just 
    // require('cordova/exec/proxy') at unknown date/time.
    var commandProxy;
    try {
        commandProxy = require('cordova/windows8/commandProxy');
    } catch (e) {
        commandProxy = require('cordova/exec/proxy');
    }

    module.exports = {
        cachedMediaDirectoryName: "_cachedMedia",
        cachedMediaExtension: "ms-appdata:///local/",
        cookieFileName: "_cookies",
        mediaCacheFileName: "_mediaCache",
        DONOTEXPIRE: "never",
        intelCookies: [],
        intelMediaCache: [],

        getCacheInfo: function (successCallback, errorCallback, params) {
            var me = module.exports;

            me.GetCookiesAsync().then(
                function () {
                    var tmpCookies = [];

                    me.intelCookies.forEach(
                        function (cookie) {
                            tmpCookies[cookie.key] = { "value": cookie.value };
                        }
                    );

                    me.GetMediaCacheAsync().then(
                        function() {
                            var tmpMediaCache = [];

                            me.intelMediaCache.forEach(
                                function (mediaCache) {
                                    tmpMediaCache[mediaCache[0]] = mediaCache[1];
                                }
                            );

                            var info = {};
                            info.cookies = tmpCookies;
                            info.mediacache = tmpMediaCache;
                            info.mediacache_dir = me.cachedMediaDirectoryName.replace(me.cachedMediaExtension, "");
                            successCallback(info);
                        });
                });

        },

        setCookie: function (successCallback, errorCallback, params) {
            var me = module.exports;

            try
            {
                if (typeof(params[0]) == "undefined" || typeof(params[1]) == "undefined" || typeof(params[2]) == "undefined")
                {
                    /*var ev = document.createEvent('Events');
                    ev.initEvent('intel.xdk.cache.media.add',true,true);
                    ev.success=false;
                    ev.filename='';
                    ev.message='Wrong number of parameters';
                    document.dispatchEvent(ev);*/
                    me.createAndDispatchEvent("intel.xdk.cache.media.add",
                        {
                            success: false,
                            filename: "",
                            message: "Wrong number of parameters"
                        });
                    return;
                }

                var key = params[0];
                var value = params[1];
                var days = params[2];

                var currTime = new Date();
                var tempDate = new Date();

                if (days == null)
                    days = "0";
                if (days == "0")
                    return;
                else if (days == "-1")
                    days = me.DONOTEXPIRE;
                else
                {
                    currTime = new Date(tempDate.setDate(tempDate.getDate() + days));
                }

                var tmp = new IntelCookie();
                tmp.key = key;
                tmp.value = value;
                tmp.expires = currTime.toString();

                var found = false;
                me.intelCookies.forEach(
                    function (cookie) {
                        if (cookie.key == key) {
                            cookie.value = tmp.value;
                            cookie.expires = tmp.expires;
                            found = true;
                        }
                    });

                if (!found) {
                    me.intelCookies.push(tmp);
                }
                me.WriteCookiesAsync();
            }
            catch (ex)
            {
                if (Logger)
                    Logger.WriteLogMessageAsync("Error::SetCookie - " + ex.StackTrace);
            }
        },

        removeCookie: function (successCallback, errorCallback, params) {
            var me = module.exports;

            try
            {
                if (typeof(params[0]) == "undefined")
                {
                    /*var ev = document.createEvent('Events');
                    ev.initEvent('intel.xdk.cache.media.add',true,true);
                    ev.success=false;
                    ev.filename='';
                    ev.message='Wrong number of parameters';
                    document.dispatchEvent(ev);*/
                    me.createAndDispatchEvent("intel.xdk.cache.media.add",
                        {
                            success: false,
                            filename: "",
                            message: "Wrong number of parameters"
                        });
                    return;
                }

                var key = params[0];

                var found = false;
                me.intelCookies.forEach(
                    function (cookie) {
                        if (cookie.key == key) {
                            found = true;
                            me.intelCookies.splice(me.intelCookies.indexOf(cookie), 1);
                        }
                    });

                if (found) {
                }

                me.WriteCookiesAsync();
            }
            catch (ex)
            {
                Logger.WriteLogMessageAsync("Error::RemoveCookie - " + ex.StackTrace);
            }
        },

        clearAllCookies: function (successCallback, errorCallback, params) {
            var me = module.exports;

            me.intelCookies = [];
            me.WriteCookiesAsync();
        },

        clearMediaCache: function (successCallback, errorCallback, params) {
            var applicationData = Windows.Storage.ApplicationData.current;
            var localFolder = applicationData.localFolder;

            var me = module.exports;

            localFolder.createFolderAsync(me.cachedMediaDirectoryName.replace(me.cachedMediaExtension, ""), Windows.Storage.CreationCollisionOption.openIfExists).then(
                function (dataFolder) {
                    dataFolder.getFilesAsync().then(
                        function (files) {
                            files.forEach(function (file) {
                                file.deleteAsync();
                            });

                            me.intelMediaCache = [];

                            /*var e = document.createEvent('Events');
                            e.initEvent('intel.xdk.cache.internal.media.clear',true,true);
                            document.dispatchEvent(e);*/
                            me.createAndDispatchEvent("intel.xdk.cache.internal.media.clear");

                            /*e = document.createEvent('Events');
                            e.initEvent('intel.xdk.cache.media.clear',true,true);
                            document.dispatchEvent(e);*/
                            me.createAndDispatchEvent("intel.xdk.cache.media.clear");
                        }
                    );
                }
            );
        },

        addToMediaCache: function (successCallback, errorCallback, params) {
            var me = module.exports;

            var url = params[0];
            var id = params[1];

            try
            {
                WinJS.xhr({
                    url: url,
                    responseType: "blob"
                }).done(
                    function completed(result) {
                        if (result.status === 200) {
                            var arrayResponse = result.response;

                            me.SaveMediaCacheAsync(arrayResponse, url).then(
                                function () {
                                    var found = false;
                                    me.intelMediaCache.forEach(
                                        function (mediaCache) {
                                            if (mediaCache[0] == url) {
                                                found = true;
                                            }
                                        });

                                    if (!found) {
                                        me.intelMediaCache.push([url, me.getLocalFilename(url)]);

                                        // don't fire this one if it isn't a new cache item
                                        /*var e = document.createEvent('Events');
                                        e.initEvent('intel.xdk.cache.internal.media.add', true, true);
                                        e.success = true;
                                        e.url = url;
                                        e.filename = me.getLocalFilename(url);
                                        e.id = id;
                                        document.dispatchEvent(e);*/
                                        me.createAndDispatchEvent("intel.xdk.cache.internal.media.add",
                                            {
                                                success: true,
                                                url: url,
                                                filename: me.getLocalFilename(url),
                                                id: id
                                            });
                                   }

                                    me.WriteMediaCacheAsync();

                                    if (typeof(id) != "undefined")
                                    {
                                        /*e = document.createEvent('Events');
                                        e.initEvent('intel.xdk.cache.media.add',true,true);
                                        e.success = true;
                                        e.url = url;
                                        e.id = id;
                                        document.dispatchEvent(e);*/
                                        me.createAndDispatchEvent("intel.xdk.cache.media.add",
                                            {
                                                success: true,
                                                url: url,
                                                id: id
                                            });
                                    }
                                    else
                                    {
                                        //intel.xdk.mediacache.push(url);
                                        /*var e = document.createEvent('Events');
                                        e.initEvent('intel.xdk.cache.media.add', true, true);
                                        e.success = true; e.url = '" + url + "';
                                        document.dispatchEvent(e);*/
                                        me.createAndDispatchEvent("intel.xdk.cache.media.add",
                                            {
                                                success: true,
                                                url: url
                                            });
                                    }

                                },
                                function (err) {
                                    /*var e = document.createEvent('Events');
                                    e.initEvent('intel.xdk.cache.media.add',true,true);
                                    e.success = false;
                                    e.id = id;
                                    e.response='';
                                    e.extras = {};
                                    e.error = err;
                                    document.dispatchEvent(e);*/
                                    me.createAndDispatchEvent("intel.xdk.cache.media.add",
                                        {
                                            success: false,
                                            id: id,
                                            response: "",
                                            extras: {},
                                            error: err
                                        });
                                }
                            );
                        }
                    }
                );
            }
            catch (ex)
            {
                //callback(null, ex);
            }
        },

        removeFromMediaCache: function (successCallback, errorCallback, params) {
            if (params.length != 1)
                return;

            var url = params[0];

            var success = true;

            var applicationData = Windows.Storage.ApplicationData.current;
            var localFolder = applicationData.localFolder;

            var me = module.exports;

            localFolder.createFolderAsync(me.cachedMediaDirectoryName.replace(me.cachedMediaExtension, ""), Windows.Storage.CreationCollisionOption.openIfExists).then(
                function (dataFolder) {
                    dataFolder.getFilesAsync().then(
                        function (files) {
                            files.forEach(function (file) {
                                if (me.getLocalFilename(url) == file.name) {
                                    file.deleteAsync();

                                    me.intelMediaCache.splice(me.intelMediaCache.indexOf(file), 1);
                                }
                            });

                            /*var e = document.createEvent('Events');
                            e.initEvent('intel.xdk.cache.internal.media.remove', true, true);
                            e.success = true;
                            e.url = url;
                            e.filename = me.getLocalFilename(url);
                            document.dispatchEvent(e);*/
                            me.createAndDispatchEvent("intel.xdk.cache.internal.media.remove",
                                {
                                    success: true,
                                    url: url,
                                    filename: me.getLocalFilename(url)
                                });


                            /*e = document.createEvent('Events');
                            e.initEvent('intel.xdk.cache.media.remove',true,true);
                            e.success=true;
                            e.url=url;
                            document.dispatchEvent(e);*/
                            me.createAndDispatchEvent("intel.xdk.cache.media.remove",
                                {
                                    success: true,
                                    url: url
                                });
                        }
                    );
                }
            );
        },

        
        GetCookiesAsync: function () {
            return new WinJS.Promise(function (comp, err, prog) {
                try {
                    var me = module.exports;

                    // replace picture location to pull picture from local folder.
                    if (!me.cachedMediaDirectoryName || me.cachedMediaDirectoryName.indexOf("ms-appdata") == -1) {
                        me.cachedMediaDirectoryName = me.cachedMediaExtension + me.cachedMediaDirectoryName;
                    }

                    var applicationData = Windows.Storage.ApplicationData.current;
                    var localFolder = applicationData.localFolder;


                    //StorageFolder storageFolder = await StorageHelper.GetStorageFolder(Path.Combine(base.Webview.BaseDirectory(), Constants.Directory.CACHE));
                    //StorageFile cookies = await storageFolder.CreateFileAsync("_cookies", CreationCollisionOption.OpenIfExists);

                    localFolder.createFolderAsync(me.cachedMediaDirectoryName.replace(me.cachedMediaExtension, ""), Windows.Storage.CreationCollisionOption.openIfExists).then(
                        function (dataFolder) {
                            dataFolder.createFileAsync(me.cookieFileName, Windows.Storage.CreationCollisionOption.openIfExists).done(
                                   function (dataFile) {

                                       dataFile.openAsync(Windows.Storage.FileAccessMode.read).then(
                                           function (stream) {
                                               var size = stream.size;
                                               if (size == 0) {
                                                   me.intelCookies = [];
                                                   comp();
                                               }
                                               else {
                                                   var inputStream = stream.getInputStreamAt(0);
                                                   var reader = new Windows.Storage.Streams.DataReader(inputStream);

                                                   reader.loadAsync(size).then(function () {
                                                       var contents = reader.readString(size);
                                                       me.intelCookies = JSON.parse(contents);
                                                       comp();
                                                   });
                                               }
                                           });
                                       //windows.Storage.FileIO.ReadTextAsync(cookies);
                                       //ser = new DataContractJsonSerializer(typeof(List<IntelCookie>));
                                       //using (var ms = new MemoryStream(Encoding.Unicode.GetBytes(readFile)))
                                       //{
                                       //    if (ms.Length > 0)
                                       //        this.intelCookies = (List<IntelCookie>)ser.ReadObject(ms);
                                       //}
                                   });

                        });

                }
                catch (ex) {
                    Logger.WriteLogMessageAsync("Error::GetCookiesAsync - " + ex.StackTrace);
                    err(ex);
                }

                return true;
            });
        },

        WriteCookiesAsync: function () {
            var me = module.exports;
            var applicationData = Windows.Storage.ApplicationData.current;
            var localFolder = applicationData.localFolder;

            try
            {
                localFolder.createFolderAsync(me.cachedMediaDirectoryName.replace(me.cachedMediaExtension, ""), Windows.Storage.CreationCollisionOption.openIfExists).then(
                    function (dataFolder) {
                        dataFolder.createFileAsync(me.cookieFileName, Windows.Storage.CreationCollisionOption.replaceExisting).done(
                            function (dataFile) {
                                dataFile.openAsync(Windows.Storage.FileAccessMode.readWrite).then(
                                    function (stream) {
                                        var outputStream = stream.getOutputStreamAt(dataFile.size);
                                        var writer = new Windows.Storage.Streams.DataWriter(outputStream);

                                        writer.writeString(JSON.stringify(me.intelCookies));
                                        writer.storeAsync().then(function () {
                                            outputStream.flushAsync().then(function () {
                                                stream.close();
                                                writer.close();
                                            });
                                        });

                                    });
                            });

                    });

            }
                catch (ex)
            {
                    Logger.WriteLogMessageAsync("Error::WriteCookiesAsync - " + ex.StackTrace);
            }
        },

        GetMediaCacheAsync: function () {
            return new WinJS.Promise(function (comp, err, prog) {
                try {
                    var me = module.exports;

                    // replace picture location to pull picture from local folder.
                    if (!me.cachedMediaDirectoryName || me.cachedMediaDirectoryName.indexOf("ms-appdata") == -1) {
                        me.cachedMediaDirectoryName = me.cachedMediaExtension + me.cachedMediaDirectoryName;
                    }

                    var applicationData = Windows.Storage.ApplicationData.current;
                    var localFolder = applicationData.localFolder;

                    localFolder.createFolderAsync(me.cachedMediaDirectoryName.replace(me.cachedMediaExtension, ""), Windows.Storage.CreationCollisionOption.openIfExists).then(
                        function (dataFolder) {
                            dataFolder.createFileAsync(me.mediaCacheFileName, Windows.Storage.CreationCollisionOption.openIfExists).done(
                                   function (dataFile) {

                                       dataFile.openAsync(Windows.Storage.FileAccessMode.read).then(
                                           function (stream) {
                                               var size = stream.size;
                                               if (size == 0) {
                                                   me.intelMediaCache = [];
                                                   comp();
                                               }
                                               else {
                                                   var inputStream = stream.getInputStreamAt(0);
                                                   var reader = new Windows.Storage.Streams.DataReader(inputStream);

                                                   reader.loadAsync(size).then(function () {
                                                       var contents = reader.readString(size);
                                                       me.intelMediaCache = JSON.parse(contents);
                                                       comp();
                                                   });
                                               }
                                           });
                                   });

                        });

                }
                catch (ex) {
                    Logger.WriteLogMessageAsync("Error::GetCookiesAsync - " + ex.StackTrace);
                    err(ex);
                }

                return true;
            });
        },

        WriteMediaCacheAsync: function () {
            var me = module.exports;
            var applicationData = Windows.Storage.ApplicationData.current;
            var localFolder = applicationData.localFolder;

            try {
                localFolder.createFolderAsync(me.cachedMediaDirectoryName.replace(me.cachedMediaExtension, ""), Windows.Storage.CreationCollisionOption.openIfExists).then(
                    function (dataFolder) {
                        dataFolder.createFileAsync(me.mediaCacheFileName, Windows.Storage.CreationCollisionOption.replaceExisting).done(
                            function (dataFile) {
                                dataFile.openAsync(Windows.Storage.FileAccessMode.readWrite).then(
                                    function (stream) {
                                        var outputStream = stream.getOutputStreamAt(dataFile.size);
                                        var writer = new Windows.Storage.Streams.DataWriter(outputStream);

                                        writer.writeString(JSON.stringify(me.intelMediaCache));
                                        writer.storeAsync().then(function () {
                                            outputStream.flushAsync().then(function () {
                                                stream.close();
                                                writer.close();
                                            });
                                        });

                                    });
                            });

                    });

            }
            catch (ex) {
                Logger.WriteLogMessageAsync("Error::WriteCookiesAsync - " + ex.StackTrace);
            }
        },

        SaveMediaCacheAsync: function (array, url) {
            var me = module.exports;
            var applicationData = Windows.Storage.ApplicationData.current;
            var localFolder = applicationData.localFolder;

            return new WinJS.Promise(function (comp, err, prog) {
                try {
                    localFolder.createFolderAsync(me.cachedMediaDirectoryName.replace(me.cachedMediaExtension, ""), Windows.Storage.CreationCollisionOption.openIfExists).then(
                        function (dataFolder) {
                            dataFolder.createFileAsync(me.getLocalFilename(url), Windows.Storage.CreationCollisionOption.replaceExisting).done(
                                function (dataFile) {
                                    dataFile.openAsync(Windows.Storage.FileAccessMode.readWrite).then(
                                        function (stream) {
                                            return Windows.Storage.Streams.RandomAccessStream.copyAsync(array.msDetachStream(), stream).then(
                                                function () {
                                                    return stream.flushAsync().then(function () {
                                                        stream.close();
                                                        array.msClose();
                                                        comp();
                                                    });
                                                });
                                        });
                                });

                        });

                }
                catch (ex) {
                    err(ex);
                }
            });

        },

        getLocalFilename: function(url)
        {
            return url.substring(url.lastIndexOf('/') + 1);
        },

        createAndDispatchEvent: function (name, properties) {
            var e = document.createEvent('Events');
            e.initEvent(name, true, true);
            if (typeof properties === 'object') {
                for (key in properties) {
                    e[key] = properties[key];
                }
            }
            document.dispatchEvent(e);
        }

    };

    var IntelCookie = WinJS.Class.define(
        function(key, value, expires){
            this.key = key;
            this.value = value;
            this.expires = expires;
        },
        {
            key: "",
            value: "",
            expires: ""
        },
        {}
    );

    commandProxy.add('IntelXDKCache', module.exports);

