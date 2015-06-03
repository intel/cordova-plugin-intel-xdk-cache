intel.xdk.cache
===============

For persistent caching of data between application sessions.

Description
-----------

This object is intended to provide local storage for data to speed up
applications. It can be used as in conjunction with, or as an alternative to the
HTML5 local database. Its methods provide features similar to browser cookies
and file caching.

For cookies, the «intention is that you would use [setCookie](#setcookie) to
save string data in name-value pairs. Cookies persist between application
sessions. Data values may be retrieved using the [getCookie](#getcookie) command
or from the [getCookieList](#getcookielist) command as soon as the
`intel.xdk.device.ready` event is fired.

The media cache commands are meant to provide quicker access to files such as
videos and images. Adding files to the media cache will expedite access to them
when the application runs. These are files that are cached across sessions and
are not in your application bundle. See the section on events below for more
information about events fired from the cache section of intel.xdk.

### Methods

-   [addToMediaCache](#addtomediacache) — This command will get a file from the
    Internet and cache it locally on the device.
-   [addToMediaCacheExt](#addtomediacacheext) — This command will get a file
    from the Internet and cache it locally on the device.
-   [clearAllCookies](#clearallcookies) — This method will clear all data stored
    using the [setCookie](#setcookie) method.
-   [clearMediaCache](#clearmediacache) — This command will remove all files
    from the local cache on the device.
-   [getCookie](#getcookie) — This method will retrieve the value of a cookie
    previously saved using the [setCookie](#setcookie) command.
-   [getCookieList](#getcookielist) — This method will return an array
    containing the names of all the previously saved cookies using the
    [setCookie](#setcookie) command.
-   [getMediaCacheList](#getmediacachelist) — This method will get an array
    containing all the names of all the previously cached files.
-   [getMediaCacheLocalURL](#getmediacachelocalurl) — This method will return an
    url that you can use to access a cached media file.
-   [removeCookie](#removecookie) — This method will clear data previously saved
    using the [setCookie](#setcookie) method.
-   [removeFromMediaCache](#removefrommediacache) — This command will remove a
    file from the local cache on the device.
-   [setCookie](#setcookie) — Call this method to set a chunk of data that will
    persist from session to session.

### Events

-   [intel.xdk.cache.media.add](#mediaadd) — Fires when data is cached
-   [intel.xdk.cache.media.clear](#mediaclear) — Fired once all files are
    removed from the local file cache
-   [intel.xdk.cache.media.remove](#mediaremove) — Fired when data is removed
    from the cache
-   [intel.xdk.cache.media.update](#mediaupdate) — Fired repeatedly to track
    caching progress

Methods
-------

### addToMediaCache

This command will get a file from the Internet and cache it locally on the
device.

```javascript
intel.xdk.cache.addToMediaCache(url);
```

#### Description

This command will get a file from the Internet and cache it locally on the
device. It can then be referenced in a special directory named `_mediacache` off
the root of the bundle. Once this command is run, the
[intel.xdk.cache.media.add](#mediaadd) event is fired. If there is already a
file cached with that name it is overwritten.

#### Available Platforms

-   Apple iOS
-   Google Android
-   Microsoft Windows 8 - BETA
-   Microsoft Windows Phone 8 - BETA

#### Parameters

-   **url:** The url of the file to cache.

#### Events

-   **intel.xdk.cache.media.add:** This event is fired once this command is run.
    It will return an event object that contains the URL of the remote file
    cached.

#### Example

```javascript
intel.xdk.cache.addToMediaCache(urlToCache);

function cacheUpdated(e)
{
    alert(e.url + " cached successfully");
}
document.addEventListener("intel.xdk.cache.media.add", cacheUpdated, false);
```

### addToMediaCacheExt

This command will get a file from the Internet and cache it locally on the
device.

``` {.prettyprint}
intel.xdk.cache.addToMediaCacheExt(url,id);
```

#### Description

This command will get a file from the Internet and cache it locally on the
device. It can then be referenced in a special directory named `_mediacache` off
the root of the bundle. As this method is executed, the
[intel.xdk.cache.media.update](#mediaupdate) event is fired repeatedly to track
the progress of the file caching. If there is already a file cached with that
name it is overwritten. As the file is cached by this method, a unique id is
returned in order to identify their origin. This command will replace the
depreciated command [addToMediaCache](#addtomediacache).

#### Available Platforms

-   Apple iOS
-   Google Android
-   Microsoft Windows 8 - BETA
-   Microsoft Windows Phone 8 - BETA

#### Parameters

-   **url:** The url of the file to cache.
-   **id:** A unique identifier for the cache request.

#### Events

-   **[intel.xdk.cache.media.update](#mediaupdate):** This event is fired as
    this method runs. It will return an event object that contains several
    parameters. The first parameter is the URL of the remote file cached. The
    second is the unique ID assigned when the command was called. The third is
    the current number of bytes downloaded and cached so far, and the final
    parameter is the total number of bytes in the file.
-   **[intel.xdk.cache.media.add](#mediaadd):** This event is fired once the
    file is successfully cached.

#### Example

```javascript
intel.xdk.cache.addToMediaCacheExt(urlToCache,uniqueID);

function cacheUpdated(evt)
{
    var outString = "";
    outString += "current bytes downloaded: " + evt.current;
    outString += " total bytes in download: " + evt.total;
    var percentage = evt.current/evt.total;
    outString += " percentage downloaded: " + percentage + "%";
    outString += " the unique id is: " + evt.id ;
    outString += "the URL is: " + evt.url;
    alert(outString);
}

function cacheComplete(evt)
{
  var outString = "";
  outString += "The procedure succeeded (" + evt.success + ") ";
        outString += " the unique id is: " + evt.id ;
        outString += "the URL is: " + evt.url;
        alert(outString);
}

document.addEventListener("intel.xdk.cache.media.update", cacheUpdated, false);
document.addEventListener("intel.xdk.cache.media.add", cacheComplete, false);
```

-   This command will get a file from the Internet and cache it locally on the
    device.

### clearAllCookies

This method will clear all data stored using the [setCookie](#setcookie) method.

```javascript
intel.xdk.cache.clearAllCookies();
```

#### Description

This method will clear all data stored using the [setCookie](#setcookie) method.

#### Available Platforms

-   Apple iOS
-   Google Android
-   Microsoft Windows 8 - BETA
-   Microsoft Windows Phone 8 - BETA

#### Example

```javascript
intel.xdk.cache.clearAllCookies();
```

### clearMediaCache

This command will remove all files from the local cache on the device.

```javascript
intel.xdk.cache.clearMediaCache();
```

#### Description

This command will remove all files from the local cache on the device. Once this
command is run the [intel.xdk.cache.media.clear](#mediaclear) event is fired.

#### Available Platforms

-   Apple iOS
-   Google Android
-   Microsoft Windows 8 - BETA
-   Microsoft Windows Phone 8 - BETA

#### Events

-   **[intel.xdk.cache.media.clear](#mediaclear):** This event is fired once
all files are removed from the local cahce of the device.

#### Example

```javascript
intel.xdk.cache.clearMediaCache();

function cacheCleared()
{
    alert("cache cleared successfully");
}
```

### getCookie

This method will retrieve the value of a cookie previously saved using the
[setCookie](#setcookie) command.

```javascript
intel.xdk.cache.getCookie(name);
```

#### Description

This method will get the value of a cookie previously saved using the
[setCookie](#setcookie) command. If no such cookie exists, the value returned
will be `undefined`.

#### Available Platforms

-   Apple iOS
-   Google Android
-   Microsoft Windows 8 - BETA
-   Microsoft Windows Phone 8 - BETA

#### Parameters

**name:** The unique name for the data to retrieve.

#### Example

```javascript
var value = intel.xdk.cache.getCookie("userid");
```

### getCookieList

This method will return an array containing the names of all the previously
saved cookies using the [setCookie](#setcookie) command.

```javascript
var dataArray = intel.xdk.cache.getCookieList();
```

#### Description

This method will return an array containing all the names of all the previously
saved cookies using the [setCookie](#setcookie) command. These names can then be
used in calls to [getCookie](#getcookie).

#### Available Platforms

-   Apple iOS
-   Google Android
-   Microsoft Windows 8 - BETA
-   Microsoft Windows Phone 8 - BETA

#### Returns

**dataArray:** An array of all the unique names of previously saved data.

#### Example

```javascript
var cookiesArray = intel.xdk.cache.getCookieList();
for (var x=0; x < cookiesArray.length; x++)
{
  alert(cookiesArray[x]+":"+intel.xdk.cache.getCookie(cookiesArray[x]));
}

```

### getMediaCacheList

This method will get an array containing all the names of all the previously
cached files.

```javascript
var cacheArray = intel.xdk.cache.getMediaCacheList();
```

#### Description

This method will get an array containing all the names of all the previously
cached files using the [addToMediaCache](#addtomediacache) command. These names
can then be used in calls to getMediaCacheLocalURL.

#### Available Platforms

-   Apple iOS
-   Google Android
-   Microsoft Windows 8 - BETA
-   Microsoft Windows Phone 8 - BETA

#### Returns

**cacheArray:** An array of URLs that have been cached on the device using the
addToMediaCache method.

#### Example

```javascript
var cacheArray = intel.xdk.cache.getMediaCacheList();
for (var x=0; x < cacheArray.length; x++)
{
  alert( cacheArray[x] + "  " +
    intel.xdk.cache.getMediaCacheLocalURL(cacheArray[x]) );
}
```

### getMediaCacheLocalURL

This method will return an url that you can use to access a cached media file.

```javascript
var localURL = intel.xdk.cache.getMediaCacheLocalURL(url);
```

#### Description

This method will return an url that you can use to access the cached media file.
If the requested URL is not cached, the value returned will be `undefined`.

#### Available Platforms

-   Apple iOS
-   Google Android
-   Microsoft Windows 8 - BETA
-   Microsoft Windows Phone 8 - BETA

#### Parameters

-   **url:** The remote URL of the file that was cached.

#### Returns

-   **localURL:** The local URL of the cached file on the device itself.

#### Example

```javascript
var localurl =
    intel.xdk.cache.getMediaCacheLocalURL("http://myweb.com/image/logo.gif");

```

### removeCookie

This method will clear data previously saved using the [setCookie](#setcookie)
method.

```javascript
intel.xdk.cache.removeCookie(name);
```

#### Available Platforms

-   Apple iOS
-   Google Android
-   Microsoft Windows 8 - BETA
-   Microsoft Windows Phone 8 - BETA

#### Parameters

**name:** The unique name of the data to remove.

#### Example

```javascript
intel.xdk.cache.removeCookie("userid");
```

### removeFromMediaCache

This command will remove a file from the local cache on the device.

```javascript
intel.xdk.cache.removeFromMediaCache(url)
```

#### Description

This command will remove a file from the local cache on the device. Once this
command is run the [intel.xdk.cache.media.remove](#mediaremove) event is fired.

#### Available Platforms

-   Apple iOS
-   Google Android
-   Microsoft Windows 8 - BETA
-   Microsoft Windows Phone 8 - BETA

#### Parameters

-   **url:** The url of the file to remove from the local cache.

#### Events

-   **[intel.xdk.cache.media.remove](#mediaremove):** This event is fired once
a cached file has been successfully removed. It will return an event object that
contains the URL of the original URL of the removed file.

#### Example

```javascript
intel.xdk.cache.removeFromMediaCache(urlToRemove);

function cacheUpdated(e)
{
        alert(e.url + " removed successfully");
}
document.addEventListener("intel.xdk.cache.media.remove", cacheUpdated, false);
```

### setCookie

Call this method to set a chunk of data that will persist from session to
session.

```javascript
intel.xdk.cache.setCookie(name,value,expirationDays);
```

#### Description

Call this method to set a chunk of data that will persist from session to
session. The data is automatically purged once the expiration date lapses. The
data can be retrieved using the getCookie command.

Please note that cookie names may not include periods.

#### Available Platforms

-   Apple iOS
-   Google Android
-   Microsoft Windows 8 - BETA
-   Microsoft Windows Phone 8 - BETA

#### Parameters

-   **name:** A unique name for the data to save. The name parameter may not
    contain periods or underscores.
-   **value:** The data to save. The data will be saved as a string. An
    undefined variable will be saved as an empty string.
-   **expirationDays:** The number of days until the data is automatically
    removed from the device. Pass a -1 to make sure the application never
    automatically expires data. Pass a 0 to make the cookie a "session cookie"
    that is removed once the application is closed.

#### Example
```javascript
function saveInfo() {
    //add a cookie
    var name = prompt('Enter information name:');
    var value = prompt('Enter information value:');
    var daysTillExpiry = prompt('Days until cookie expires (-1 for never):');
    try
    {
        if (name.indexOf('.')== -1)
        {
            intel.xdk.cache.setCookie(name,value,daysTillExpiry);
        }
        else
        {
            alert('cookie names may not include a period');
        }
    }
    catch(e)
    {
        alert("error in saveInfo: " + e.message);
    }
}

```

Events
------

### media.add

Fires when data is cached

#### Description

This event fires once a file is added to the local file cache using the
[intel.xdk.cache.addToMediaCache](#addtomediacache) command. The url property on
the event object will contain the URL of the remote file cached.

### media.clear

Fired once all files are removed from the local file cache

#### Description

This event fires once all files are removed from the local file cache using the
[intel.xdk.cache.clearMediaCache](#clearmediacache) command.

### media.remove

Fired when data is removed from the cache

#### Description

This event fires once a file is removed from the local file cache using the
[intel.xdk.cache.removeFromMediaCache](#removefrommediacache) command.

### media.update

Fired repeatedly to track caching progress

#### Description

This event is fired repeatedly as the
[intel.xdk.cache.addToMediaCacheExt](#addtomediacacheext) method runs. It will
return an event object that contains several parameters. The first parameter is
the URL of the remote file cached. The second is the unique ID assigned when the
command was called. The third is the current number of bytes downloaded and
cached so far, and the final parameter is the total number of bytes in the file.
