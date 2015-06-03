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

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.IO.IsolatedStorage;
using System.Linq;
using System.Net;
using System.Runtime.Serialization;
using System.Text;
using System.Threading.Tasks;
using Windows.Storage;
using Windows.Storage.Streams;
using WPCordovaClassLib.Cordova;
using WPCordovaClassLib.Cordova.Commands;
using WPCordovaClassLib.CordovaLib;

namespace Cordova.Extension.Commands
{
    public class IntelXDKCache : BaseCommand
    {
        //[DataContract]
        //public class IntelCookie
        //{
        //    [DataMember(Name = "key")]
        //    public string key { get; set; }
        //    [DataMember(Name = "value")]
        //    public string value { get; set; }
        //    [DataMember(Name = "expires")]
        //    public string expires { get; set; }
        //}

        #region Private Members
        private const string COOKIEJAR = "IntelCookieJar";
        private readonly object _sync = new object();

        private Dictionary<string, Cookie> intelCookies = new Dictionary<string, Cookie>();
        private Dictionary<string, string> intelMediaCache = new Dictionary<string, string>();

        private const string MEDIACACHE = "_mediacache";
        private const string CACHEFILE = "cacheFile.txt";

        private bool isDownloading = false;
        private string downloadUrl = "";
        private string downloadId = "";
        #endregion

        #region Constructor
        /// <summary>
        /// IntelCache Constructor
        /// </summary>
        public IntelXDKCache()
        { }
        #endregion

        public void getCacheInfo(string parameters)
        {
            string info = "{\"cookies\":{";
            bool first = true;

            this.GetCookies();

            List<string> _cookies = new List<string>();
            foreach (KeyValuePair<string, Cookie> cookie in this.intelCookies)
            {
                if (cookie.Key != "demoFeed")
                {
                    if (!first)
                        info += ",";

                    info += "\"" + cookie.Key + "\":{\"value\":\"" + cookie.Value.Value + "\"}";
                    first = false;
                }
            }
            info += "}";

            string mediaCache = "{";

            //InjectJS(js);
            //DispatchCommandResult(new PluginResult(PluginResult.Status.OK, js));

            first = true;

            this.GetMediaCache();
            List<string> _mediaCache = new List<string>();
            foreach (KeyValuePair<string, string> vals in intelMediaCache)
            {
                if (!first)
                    mediaCache += ",";

                mediaCache += "\"" + vals.Value + "\":\"" + Path.GetFileName(vals.Value) + "\"";
                first = false;
            };
            mediaCache += "}";

            info += ", \"mediacache\":" + mediaCache + "";

            StorageFolder local = Windows.Storage.ApplicationData.Current.LocalFolder;
            string path = Path.Combine(local.Path, MEDIACACHE).Replace(@"\", @"\\");
            info += ", \"mediacache_dir\":\"" + path + "\"}";
            //InjectJS(js);
            DispatchCommandResult(new PluginResult(PluginResult.Status.OK, info));

            // Hack alert: needed to clean up the OnCustomScript object in BaseCommand.
            InvokeCustomScript(new ScriptCallback("eval", new string[] { "var temp = {};" }), true);

            //js = "javascript: var e = document.createEvent('Events');e.initEvent('appMobi.construct.initalize',true,true);e.id='cache';document.dispatchEvent(e);";
            ////InjectJS(js);
            //DispatchCommandResult(new PluginResult(PluginResult.Status.OK, js));
        }

        #region appmobi.js Handlers
        #region cookies
        public void setCookie(string parameters)
        {
            string[] args = WPCordovaClassLib.Cordova.JSON.JsonHelper.Deserialize<string[]>(parameters);

            if (args.Length < 3)
            {
                string js = (string.Format("javascript:var ev = document.createEvent('Events');" +
                        "ev.initEvent('intel.xdk.cache.picture.add',true,true);ev.success=false;" +
                        "ev.filename='{0}';ev.message='{1}';document.dispatchEvent(ev);", "", "Wrong number of parameters"));
                DispatchCommandResult(new PluginResult(PluginResult.Status.OK, js));
                return;
            }

            string name = args[0];
            string val = args[1];
            string days = args[2];

            IsolatedStorageSettings userSettings = IsolatedStorageSettings.ApplicationSettings;
            Cookie tmpCookie;

            Dictionary<string, Cookie> cookieJar;
            if (!userSettings.Contains(COOKIEJAR))
            {
                cookieJar = new Dictionary<string, Cookie>();
                userSettings[COOKIEJAR] = cookieJar;
            }

            cookieJar = (Dictionary<string, Cookie>)userSettings[COOKIEJAR];
            if (!cookieJar.Keys.Contains(name))
            {
                tmpCookie = new Cookie(name, val);
                tmpCookie.Expires = DateTime.Now.AddDays(int.Parse(days));

                cookieJar.Add(name, tmpCookie);
                userSettings[COOKIEJAR] = cookieJar;
            }
            else
            {
                var cookie = cookieJar[name];
                cookie.Value = val;
                cookie.Expires = DateTime.Now.AddDays(int.Parse(days));
            }

            lock (_sync)
            {
                IsolatedStorageSettings.ApplicationSettings.Save();
            }
        }

        public void removeCookie(string parameters)
        {
            string[] args = WPCordovaClassLib.Cordova.JSON.JsonHelper.Deserialize<string[]>(parameters);

            if (args.Length < 1)
            {
                string js = (string.Format("javascript:var ev = document.createEvent('Events');" +
                        "ev.initEvent('intel.xdk.cache.picture.add',true,true);ev.success=false;" +
                        "ev.filename='{0}';ev.message='{1}';document.dispatchEvent(ev);", "", "Wrong number of parameters"));
                DispatchCommandResult(new PluginResult(PluginResult.Status.OK, js));
                return;
            }

            string cookieName = args[0];

            IsolatedStorageSettings userSettings = IsolatedStorageSettings.ApplicationSettings;
            if (userSettings.Contains(COOKIEJAR))
            {
                Dictionary<string, Cookie> cookieJar = (Dictionary<string, Cookie>)userSettings[COOKIEJAR];

                if (cookieJar.Keys.Contains(cookieName))
                {
                    cookieJar.Remove(cookieName);
                    userSettings[COOKIEJAR] = cookieJar;
                }
            }

            lock (_sync)
            {
                IsolatedStorageSettings.ApplicationSettings.Save();
            }
        }

        public void clearAllCookies(string parameters)
        {
            IsolatedStorageSettings userSettings = IsolatedStorageSettings.ApplicationSettings;
            Dictionary<string, Cookie> tempDict = (Dictionary<string, Cookie>)userSettings[COOKIEJAR];
            tempDict.Clear();
            userSettings[COOKIEJAR] = tempDict;

            lock (_sync)
            {
                IsolatedStorageSettings.ApplicationSettings.Save();
            }
        }
        #endregion

        #region mediacache
        public void addToMediaCache(string parameters)
        {
            string[] args = WPCordovaClassLib.Cordova.JSON.JsonHelper.Deserialize<string[]>(parameters);

            if (isDownloading)
            {
						
                string js =(string.Format("javascript:var ev = document.createEvent('Events');" +
                        "ev.initEvent('intel.xdk.cache.media.update',true,true);ev.success=false;" +
                        "ev.filename='{0}';ev.message='{1}';document.dispatchEvent(ev);", "", "Already downloading a file. "));
                //DispatchCommandResult(new PluginResult(PluginResult.Status.OK, js));
                InvokeCustomScript(new ScriptCallback("eval", new string[] { js }), true);

                return;
            }

            isDownloading = true;

            if (args.Length < 3)
            {
                string js = (string.Format("javascript:var ev = document.createEvent('Events');" +
                        "ev.initEvent('intel.xdk.cache.media.add',true,true);ev.success=false;" +
                        "ev.filename='{0}';ev.message='{1}';document.dispatchEvent(ev);", "", "Wrong number of parameters"));
                //DispatchCommandResult(new PluginResult(PluginResult.Status.OK, js));
                InvokeCustomScript(new ScriptCallback("eval", new string[] { js }), true); 
                return;
            }

            string url = HttpUtility.UrlDecode(args[0]);
            string id = args[1];

            downloadUrl = url;
            downloadId = id;

            WebClient client = new WebClient();
            client.OpenReadCompleted += new OpenReadCompletedEventHandler(client_OpenReadCompleted);
            client.OpenReadAsync(new Uri(url));
        }

        public void removeFromMediaCache(string parameters)
        {
            string[] args = WPCordovaClassLib.Cordova.JSON.JsonHelper.Deserialize<string[]>(parameters);

            string js = "";

            if (args.Length < 2)
            {
                js = (string.Format("javascript:var ev = document.createEvent('Events');" +
                        "ev.initEvent('intel.xdk.cache.media.remove',true,true);ev.success=false;" +
                        "ev.filename='{0}';ev.message='{1}';document.dispatchEvent(ev);", "", "Wrong number of parameters"));
                DispatchCommandResult(new PluginResult(PluginResult.Status.OK, js));
                return;
            }

            string url = HttpUtility.UrlDecode(args[0]);
            string[] urlPieces = url.Split('/');

            if (RemoveMediacacheFile(urlPieces[urlPieces.Length - 1]))
            {
                js = "javascript:var i = 0; while (i < AppMobi.mediacache.length) { if (AppMobi.mediacache[i] == '" + url + "') { AppMobi.mediacache.splice(i, 1); } else { i++; }};var e = document.createEvent('Events');e.initEvent('intel.xdk.cache.media.remove',true,true);e.success=true;e.url='" + url + "';document.dispatchEvent(e);";
            }
            else
            {
                js = "javascript:var e = document.createEvent('Events');e.initEvent('intel.xdk.cache.media.remove',true,true);e.success=false;e.url='" + url + "';document.dispatchEvent(e);";
            }

            //InjectJS(js);
            DispatchCommandResult(new PluginResult(PluginResult.Status.OK, js));
        }

        public void clearMediaCache(string parameters)
        {
            string js = "";

            using (var isolatedStorage = IsolatedStorageFile.GetUserStoreForApplication())
            {
                StorageFolder local = Windows.Storage.ApplicationData.Current.LocalFolder;

                isolatedStorage.DeleteFile(Path.Combine(local.Path, MEDIACACHE, CACHEFILE));

                using (StreamWriter writer = new StreamWriter(new IsolatedStorageFileStream(Path.Combine(local.Path, MEDIACACHE, CACHEFILE), FileMode.OpenOrCreate, isolatedStorage)))
                {
                    writer.WriteLine(js);
                    writer.Close();
                }
            }

            if (RemoveAllMediacacheFiles()) {
                js = "var e = document.createEvent('Events');e.initEvent('intel.xdk.cache.internal.media.clear',true,true);document.dispatchEvent(e);e = document.createEvent('Events');e.initEvent('intel.xdk.cache.media.clear',true,true);document.dispatchEvent(e);";
            } else {
                js = "javascript:var e = document.createEvent('Events');e.initEvent('intel.xdk.cache.media.clear',true,true);e.success=false;document.dispatchEvent(e);";
            }
            //InjectJS(js);
            InvokeCustomScript(new ScriptCallback("eval", new string[] { js }), true);
        }
        #endregion
        #endregion

        #region Private Methods
        public void GetCookies()
        {
            //string response = "";
            IsolatedStorageSettings userSettings = IsolatedStorageSettings.ApplicationSettings;
            if (!userSettings.Contains(COOKIEJAR))
            {
                Dictionary<string, Cookie> cc = new Dictionary<string, Cookie>();
                userSettings[COOKIEJAR] = cc;
                lock (_sync)
                {
                    IsolatedStorageSettings.ApplicationSettings.Save();
                }
            }
            else
            {
                //Dictionary<string, Cookie> cc = (Dictionary<string, Cookie>)userSettings[COOKIEJAR];
                //foreach (KeyValuePair<string, Cookie> cookie in cc)
                //{
                //    if (!cookie.Value.Expired)
                //        response += "AppMobi.cookies[\"" + cookie.Value.Name + "\"] = { \"value\": " + cookie.Value.Value + "\"};";
                //}
                intelCookies = (Dictionary<string, Cookie>)userSettings[COOKIEJAR];
            }

            //InjectJS(response);
        }

        public void GetMediaCache()
        {
            IsolatedStorageFileStream cacheFile;

            try
            {
                using (var isolatedStorage = IsolatedStorageFile.GetUserStoreForApplication())
                {
                    StorageFolder local = Windows.Storage.ApplicationData.Current.LocalFolder;

                    if (!isolatedStorage.DirectoryExists(Path.Combine(local.Path, MEDIACACHE)))
                    {
                        isolatedStorage.CreateDirectory(Path.Combine(local.Path, MEDIACACHE));
                    }

                    string result = "";

                    using (var stream = new IsolatedStorageFileStream(Path.Combine(local.Path, MEDIACACHE, CACHEFILE), FileMode.OpenOrCreate, FileAccess.ReadWrite, FileShare.None, isolatedStorage))
                    {
                        using (var fileReader = new StreamReader(stream))
                        {
                            result = fileReader.ReadToEnd();
                        }
                    }

                    string[] files = result.Replace("\r\n", string.Empty).Split(',');
                    foreach (string file in files)
                    {
                        if (file.Length > 0)
                            intelMediaCache.Add(Path.GetFileName(file), file);
                    }

                    //Debug.WriteLine("INFO: Writing data for " + cacheFile.Name + " and length = " + cacheFile.Length);
                    //using (var writer = new BinaryWriter(cacheFile))
                    //{
                    //    writer.Write(data);
                    //}

                    //string[] fileNames = isolatedStorage.GetFileNames(Path.Combine(base.Webview.appConfigData.appDirectory.Replace("/", "\\"), MEDIACACHE) + "\\*");
                    //foreach (string fileName in fileNames)
                    //{
                    //    intelMediaCache.Add(fileName, fileName);
                    //}

                }
            }
            catch (Exception)
            {
                IsolatedStorageFile isoStorage = IsolatedStorageFile.GetUserStoreForApplication();
                StorageFolder local = Windows.Storage.ApplicationData.Current.LocalFolder;

                cacheFile = isoStorage.OpenFile(Path.Combine(Path.Combine(local.Path, MEDIACACHE), CACHEFILE), FileMode.OpenOrCreate, FileAccess.ReadWrite, FileShare.None);
            }
        }

        private void client_OpenReadCompleted(object sender, OpenReadCompletedEventArgs e)
        {
            try
            {
                string js = "";
                string fileName = Path.GetFileName(downloadUrl);

                StorageFolder local = Windows.Storage.ApplicationData.Current.LocalFolder;

                using (var isolatedStorage = IsolatedStorageFile.GetUserStoreForApplication())
                {
                    if (!isolatedStorage.DirectoryExists(Path.Combine(local.Path, MEDIACACHE)))
                        isolatedStorage.CreateDirectory(Path.Combine(local.Path, MEDIACACHE));

                    if (isolatedStorage.FileExists(Path.Combine(local.Path, MEDIACACHE, fileName)))
                        isolatedStorage.DeleteFile(Path.Combine(local.Path, MEDIACACHE, fileName));

                    using (var fileStream = isolatedStorage.CreateFile(Path.Combine(local.Path, MEDIACACHE, fileName)))
                    {
                        byte[] buffer = new byte[1024];
                        while (e.Result.Read(buffer, 0, buffer.Length) > 0)
                        {
                            fileStream.Write(buffer, 0, buffer.Length);
                        }
                    }

                    string result = "";
                    using (var stream = new IsolatedStorageFileStream(Path.Combine(local.Path, MEDIACACHE, CACHEFILE), FileMode.OpenOrCreate, FileAccess.ReadWrite, FileShare.None, isolatedStorage))
                    {
                        using (var fileReader = new StreamReader(stream))
                        {
                            result = fileReader.ReadToEnd();
                        }
                    }

                    using (StreamWriter writer = new StreamWriter(new IsolatedStorageFileStream(Path.Combine(local.Path, MEDIACACHE, CACHEFILE), FileMode.OpenOrCreate, isolatedStorage)))
                    {
                        if (result.Length > 0)
                            result += ",";

                        writer.WriteLine(result + downloadUrl);
                        writer.Close();
                    }
                }


                js = "var e = document.createEvent('Events');" +
                    "e.initEvent('intel.xdk.cache.internal.media.add',true,true);e.success=true;" +
                    "e.filename='" + fileName + "';" +
                    "e.url='" + downloadUrl + "';document.dispatchEvent(e);";

                if (downloadId.Length > 0)
                {
                    js += "e = document.createEvent('Events');" +
                        "e.initEvent('intel.xdk.cache.media.add',true,true);e.success=true;" +
                        "e.filename='" + fileName + "';" +
                        "e.url='" + downloadUrl + "';e.id='" + downloadId + "';document.dispatchEvent(e);";
                }
                else
                {
                    js += "e = document.createEvent('Events');" +
                        "e.initEvent('intel.xdk.cache.media.add',true,true);e.success=true;" +
                        "e.filename='" + fileName + "';" +
                        "e.url='" + downloadUrl + "';document.dispatchEvent(e);";
                }

                //InjectJS(js);
                InvokeCustomScript(new ScriptCallback("eval", new string[] { js }), true);

                isDownloading = false;
                downloadUrl = "";
                downloadId = "";
            }
            catch (Exception ex)
            {
                string js = "javascript:var e = document.createEvent('Events');" +
                   "e.initEvent('intel.xdk.cache.media.add',true,true);e.success=false;" +
                   "e.url='" + downloadUrl + "';document.dispatchEvent(e);";
                //InjectJS(js);
                DispatchCommandResult(new PluginResult(PluginResult.Status.OK, js));

                isDownloading = false;
                downloadUrl = "";
                downloadId = "";
            }
        }

        public async void writeToMediaCache(byte[] array, string url)
        {
            StorageFolder local = Windows.Storage.ApplicationData.Current.LocalFolder;

            StorageFolder storageFolder = await GetStorageFolder(Path.Combine(local.Path, MEDIACACHE));
            IReadOnlyList<StorageFile> files = await storageFolder.GetFilesAsync();

            foreach (var file in files)
            {
                
            }
        }

        private string getLocalFilename(string url)
        {
            string path = Path.GetFileName(url);
            return url.Substring(url.LastIndexOf('/') + 1);
        }
        #endregion

        public static async Task<StorageFolder> GetStorageFolder(string path)
        {
            StorageFolder local = Windows.Storage.ApplicationData.Current.LocalFolder;

            //path = path.Replace(local.Path + "\\", "");
            StorageFolder storageFolder = await StorageFolder.GetFolderFromPathAsync(path);

            return storageFolder;
        }

        public bool RemoveMediacacheFile(string fileName)
        {
            bool status = true;

            using (var isolatedStorage = IsolatedStorageFile.GetUserStoreForApplication())
            {
                if (!isolatedStorage.DirectoryExists(MEDIACACHE))
                    isolatedStorage.CreateDirectory(MEDIACACHE);

                if (isolatedStorage.FileExists(MEDIACACHE + "\\" + fileName))
                    isolatedStorage.DeleteFile(MEDIACACHE + "\\" + fileName);
            }

            return status;
        }

        public bool RemoveAllMediacacheFiles()
        {
            try
            {
                using (var isolatedStorage = IsolatedStorageFile.GetUserStoreForApplication())
                {
                    if (isolatedStorage.DirectoryExists(MEDIACACHE))
                    {
                        foreach (var file in isolatedStorage.GetFileNames(Path.Combine(MEDIACACHE, "*.*")))
                        {
                            isolatedStorage.DeleteFile(Path.Combine(Path.Combine(MEDIACACHE, file)));
                        }
                    }
                }
            }
            catch (Exception)
            {
                //throw;
                return false;
            }

            return true;
        }
    }
}
