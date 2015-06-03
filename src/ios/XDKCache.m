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

#import "XDKCache.h"
#import "XDKCacheConnectionDelegate.h"

// "if(1)" turns OFF XDKog logging.
// "if(0)" turns ON XDKog logging.
#define XDKLog if(1); else NSLog

@interface XDKCache ()

//! Has the plugin been successfully initialized by a call to pluginInitialize?
@property (nonatomic)       BOOL                    ready;

//! A dictionary whose keys are cookie-name strings and whose values are dictionaries of
//! the form {"value":string, "expires":date}.
@property (nonatomic)       NSMutableDictionary*    cookieList;

//! The URL for the file that contains the cookie list.
@property (nonatomic)       NSURL*                  cookieListURL;

//! The URL for the media cache directory.
@property (nonatomic)       NSURL*                  mediaCacheURL;

//! A dictionary whose keys are remote URLs and whose values are the file names of their
//! downloaded copies in the media cache directory.
@property (nonatomic)      NSMutableDictionary*     mediaCacheIndex;

//! The URL for the file that contains the media cache index.
@property (nonatomic)       NSURL*                  mediaCacheIndexURL;

//! The file number to assign to the next file added to the media cache.
@property (nonatomic)       NSUInteger              nextMediaCacheFileNumber;

//! Dispatch queue for running the "save file" stage of media downloads
//! concurrently.
@property (nonatomic)       dispatch_queue_t        mediaFileSaveQueue;

@end

@implementation XDKCache

#pragma mark Utilities


//! Fire a JavaScript event.
//!
//! Generates a string of JavaScript code to create and dispatch an event.
//! @param eventName    The name of the event (not including the @c "intel.xdk." prefix).
//! @param success      The boolean value to assign to the @a success field in the
//!                     event object.
//! @param components   Each key/value pair in this dictionary will be incorporated.
//!                     (Note that the value must be a string which is the JavaScript
//!                     representation of the value - @c "true" for a boolean value,
//!                     @c "'Hello'" for a string, @c "20" for a number, etc.)
//!
//! @see fireEvent:success:components:internal:
//!
- (void) fireEvent:(NSString*)eventName
           success:(BOOL)success
        components:(NSDictionary*)components
{
    NSMutableString* eventComponents = [NSMutableString string];
    for (NSString *eachKey in components) {
        [eventComponents appendFormat:@"e.%@ = %@;", eachKey, components[eachKey]];
    }
    NSString* script = [NSString stringWithFormat:@"var e = document.createEvent('Events');"
                        "e.initEvent('intel.xdk.%@', true, true);"
                        "e.success = %@;"
                        "%@"
                        "document.dispatchEvent(e);",
                        eventName,
                        (success ? @"true" : @"false"),
                        eventComponents];
    XDKLog(@"%@", script);
    [self.commandDelegate evalJs:script];
}


//! Fire a JavaScript event and a related internal event.
//!
//! Use this method to fire an internal event before firing a client event. The internal
//! event is the same as the client event, with a modified name: Assuming that @a eventName
//! is @c "component.subcomponents.event", the internal event name is
//! @c "component.internal.subcomponents.event".
//!
//! Internal events are used to notify the plugin JavaScript to update its state before
//! sending the client event to a client code listener that may react by querying the
//! updated state.
//!
//! @note   It is only necessary to fire an internal event to inform the plugin Javascript that
//!         of some action that it needs to take. When no action is called for, the internal
//!         event should be suppressed. For example, a failure event (success = false) usually
//!         means that nothing actually happened, and that no plugin Javascript action is
//!         needed. This can conveniently be indicated by passing the same value to the
//!         @a success: and @a internal: parameters.
//!
//! @param eventName    The name of the client event (not including the @c "intel.xdk." prefix).
//! @param success      The boolean value to assign to the @a success field in the
//!                     event object.
//! @param components   Each key/value pair in this dictionary will be incorporated.
//!                     (Note that the value must be a string which is the JavaScript
//!                     representation of the value - @c "true" for a boolean value,
//!                     @c "'Hello'" for a string, @c "20" for a number, etc.)
//! @param internal     YES => fire both the internal event and the specified event.
//!                     NO => fire only the specified event.
//!
//! @see fireEvent:success:components:
//!
- (void) fireEvent:(NSString*)eventName
           success:(BOOL)success
        components:(NSDictionary*)components
          internal:(BOOL)internal
{
    if (internal) {
        NSArray* nameParts = [eventName componentsSeparatedByString:@"."];
        NSMutableArray* internalNameParts = [NSMutableArray arrayWithArray:nameParts];
        [internalNameParts insertObject:@"internal" atIndex:1];
        NSString* internalName = [internalNameParts componentsJoinedByString:@"."];
        [self fireEvent:internalName success:success components:components];
    }
    [self fireEvent:eventName success:success components:components];
}


//! Reset the plugin to its initial state.
//!
//! Called to return the plugin properties to a known state if an error occurs during
//! plugin initialization.
//!
- (void) reset
{
    self.ready = NO;
    self.cookieList = nil;
    self.cookieListURL = nil;
    self.mediaCacheURL = nil;
    self.mediaCacheIndex = nil;
    self.mediaCacheIndexURL = nil;
    self.mediaFileSaveQueue = 0;
}


//! @brief Delete the contents of a specified directory.
//! @note Actually deletes and recreates the photos directory, which is the quickest and
//! easiest way of deleting its contents.
//! @return YES if successful, NO if some error occurred.
//!
- (BOOL) eraseDirectory:(NSURL*) directory
{
    NSFileManager* fm = [NSFileManager defaultManager];
    
    return ([fm removeItemAtURL:directory
                          error:nil] &&
            [fm createDirectoryAtURL:directory
         withIntermediateDirectories:NO
                          attributes:nil
                               error:nil]);
}


#pragma mark - Cookie manipulation

//! Write the cookies list out to the cookies file.
//!
- (void) writeCookies
{
    [self.cookieList writeToURL:self.cookieListURL atomically:YES];
}


//! Read the cookies list from the cookies file, filtering out expired cookies.
//!
- (void) readCookies
{
    NSDictionary* cookies = [NSDictionary dictionaryWithContentsOfURL:self.cookieListURL];
    if (!cookies) cookies = [NSDictionary dictionary];
    self.cookieList = [NSMutableDictionary dictionary];
    for (NSString* key in cookies) {
        NSDate* expires = cookies[key][@"expires"];
        if ([[NSDate date] compare:expires] == NSOrderedAscending) {
            self.cookieList[key] = cookies[key];
        }
    }
}


//! Return a copy of the cookie list diectionary without the date elements in the
//! cookie value dictionaries.
- (NSDictionary*) cookieListForJS
{
    NSMutableDictionary* cookiesForJS = [NSMutableDictionary dictionary];
    for (NSString* key in self.cookieList) {
        cookiesForJS[key] = @{@"value":self.cookieList[key][@"value"]};
    }
    return cookiesForJS;
}


#pragma mark - Media cache manipulation

//! Delete a specified file in the media cache directory.
//! @param  fileName    The name of a file in the media cache directory.
//! @return YES if the file did not exist or was successfully deleted, NO if it exists and
//!         could not be deleted.
//!
- (BOOL) deleteMediaCacheFile:(NSString*)fileName
{
    if (! fileName || fileName.length == 0) return NO;
    NSString* filePath = [[self.mediaCacheURL URLByAppendingPathComponent:fileName] path];
    NSFileManager* fm = [NSFileManager defaultManager];
    return (! [fm fileExistsAtPath:filePath] || [fm removeItemAtPath:filePath error:nil]);
}


//! Write the media cache index to the media cache index file.
//! @return YES if successful, NO if some error occurred.
//!
- (BOOL) writeMediaCacheIndex
{
    return [self.mediaCacheIndex writeToURL:self.mediaCacheIndexURL atomically:YES];
}


//! Read the media cache index from the media cache index file, filtering out expired cookies.
//!
- (void) readMediaCacheIndex
{
    // Read the index file.
    NSDictionary* mci = [NSDictionary dictionaryWithContentsOfURL:self.mediaCacheIndexURL];
    if (!mci) mci = [NSDictionary dictionary];
    
    // Get the set of files in the cache directory.
    NSFileManager* fm = [NSFileManager defaultManager];
    NSArray* files = [fm contentsOfDirectoryAtURL:self.mediaCacheURL
                       includingPropertiesForKeys:nil
                                          options:0
                                            error:nil];
    // Strip the cache file URLs down to just the bare file names.
    files = [files valueForKey:@"lastPathComponent"];
    // Collect them in a set.
    NSSet* fileSet = [NSSet setWithArray:files];

    // Set the nextMediaCacheFileNumber property to one higher than the largest number used in
    // any existing media cache file name.
    NSError* err;
    NSRegularExpression* regex =
    [NSRegularExpression regularExpressionWithPattern:@"(?<=^file_)\\d+"
                                              options:0
                                                error:&err];
    self.nextMediaCacheFileNumber = 1;
    if (err) {
        XDKLog(@"%@", err);
    }
    else {
        for (NSString* file in fileSet) {
            NSRange nr = [regex rangeOfFirstMatchInString:file
                                                  options:0
                                                    range:NSMakeRange(0, [file length])];
            if (nr.location != NSNotFound) {
                NSInteger filenum = [[file substringWithRange:nr] integerValue];
                if (filenum > self.nextMediaCacheFileNumber) {
                    self.nextMediaCacheFileNumber = filenum + 1;
                }
            }
        }
    }
    
    // Filter out index entries whose files don't exist.
    self.mediaCacheIndex = [NSMutableDictionary dictionary];
    for (NSString* url in mci) {
        NSString* fileName = mci[url];
        if ([fileSet member:fileName]) {
            self.mediaCacheIndex[url] = fileName;
        }
    }
    
    // Delete media cache files that aren't in the index.
    NSSet* indexedFiles = [NSSet setWithArray:[self.mediaCacheIndex allValues]];
    for (NSString* fileName in fileSet) {
        if (! [indexedFiles member:fileName]) {
            [self deleteMediaCacheFile:fileName];
        }
    }
}


#pragma mark - Download to media cache

- (void) reportDownload:(NSString*)url success:(BOOL)success
{
    [self fireEvent:@"cache.media.add"
            success:success
         components:@{@"url":[NSString stringWithFormat:@"'%@'", url]}];
}

- (void) downloadFromURL:(NSString*)urlString
                  withID:(NSString*)idString
{
    NSURL* url = [NSURL URLWithString:urlString];
    NSURLRequest* request = [NSURLRequest requestWithURL:url
                                             cachePolicy:NSURLRequestReloadIgnoringLocalAndRemoteCacheData
                                         timeoutInterval:60.0];
    NSString* fileName = [[NSString stringWithFormat:@"file_%03lu",
                           (unsigned long)self.nextMediaCacheFileNumber++]
                          stringByAppendingPathExtension:[url pathExtension]];
    NSString* filePath = [[self.mediaCacheURL
                      URLByAppendingPathComponent:fileName isDirectory:NO] path];
    XDKCacheConnectionDelegate* delegate = [[XDKCacheConnectionDelegate alloc]
                                            initWithFile:filePath
                                            success:^{
                                                self.mediaCacheIndex[urlString] = fileName;
                                                [self writeMediaCacheIndex];
                                                [self fireEvent:@"cache.internal.media.add"
                                                        success:YES
                                                     components:@{@"url": [NSString stringWithFormat:@"'%@'",
                                                                           urlString],
                                                                  @"filename": [NSString stringWithFormat:@"'%@'",
                                                                                fileName]}];
                                                [self reportDownload:urlString success:YES];
                                            }
                                            failure:^{
                                                [self reportDownload:urlString success:NO];
                                            }
                                            progress:^(long long length, long long received){
                                                [self fireEvent:@"cache.media.update"
                                                        success:YES
                                                     components:@{@"id": [NSString stringWithFormat:@"'%@'",
                                                                           idString],
                                                                  @"current": [NSString stringWithFormat:@"'%lld'",
                                                                                received],
                                                                  @"total": [NSString stringWithFormat:@"%lld", length]}];
                                            }];
    if (![NSURLConnection connectionWithRequest:request delegate:delegate]) {
        [self reportDownload:urlString success:NO];
    }
}


- (void) downloadFromURL:(NSString*)urlString
{
    NSURL* url = [NSURL URLWithString:urlString];
    NSURLRequest* request = [NSURLRequest requestWithURL:url
                                             cachePolicy:NSURLRequestReloadIgnoringLocalAndRemoteCacheData
                                         timeoutInterval:60.0];
    // Do the downloading on a global concurrent queue -- multiple downloads can happen at once.
    dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
        // Try the download up to three times.
        for (int try = 0; try != 3; ++try) {
            NSHTTPURLResponse* response;
            NSData* data = [NSURLConnection sendSynchronousRequest:request
                                                 returningResponse:&response
                                                             error:nil];
            if (data && [response statusCode] >= 200 && [response statusCode] <= 299)
            {
                // If we've succesfully downloaded the data, then save it to a file on a private
                // sequential queue. I.e., only one save can happen at a time.
                dispatch_async(self.mediaFileSaveQueue, ^{
                    NSString* fileName = [[NSString stringWithFormat:@"file_%03lu",
                                           (unsigned long)self.nextMediaCacheFileNumber++]
                                          stringByAppendingPathExtension:[url pathExtension]];
                    NSURL* fileURL = [self.mediaCacheURL
                                   URLByAppendingPathComponent:fileName isDirectory:NO];
                    BOOL ok = [data writeToURL:fileURL atomically:YES];
                    if (ok) {
                        self.mediaCacheIndex[urlString] = fileName;
                        [self writeMediaCacheIndex];
                        [self fireEvent:@"cache.internal.media.add"
                                success:YES
                             components:@{@"url": [NSString stringWithFormat:@"'%@'", urlString],
                                          @"filename": [NSString stringWithFormat:@"'%@'", fileName]}];
                    }
                    [self reportDownload:urlString success:ok];
                });
                // Having dispatched the file save operation, we're done here.
                return;
            }
        }
        // Three strikes and you're out.
        [self reportDownload:urlString success:NO];
    });
}

#pragma mark - CDVPlugin

- (void)pluginInitialize
{
    [super pluginInitialize];
    
    // Find or create the plugin data directories.
    
    NSFileManager* fm = [NSFileManager defaultManager];
    NSURL* documents = [fm URLForDirectory:NSDocumentDirectory
                                  inDomain:NSUserDomainMask
                         appropriateForURL:nil
                                    create:YES
                                     error:nil];
    if (! documents) {
        [self reset];
        return;
    }
    
    // Find or create the cache plugin subdirectory.
    
    NSURL* root = [documents URLByAppendingPathComponent:@"intel.xdk.cache"
                                             isDirectory:YES];
    if (! [fm fileExistsAtPath:[root path]] &&
        ! [fm createDirectoryAtURL:root
       withIntermediateDirectories:NO
                        attributes:nil
                             error:nil])
    {
        [self reset];
        return;
    }
    
    self.cookieListURL = [root URLByAppendingPathComponent:@"intel.xdk.cache.cookies.plist"
                                               isDirectory:NO];
    
    self.mediaCacheIndexURL = [root URLByAppendingPathComponent:@"intel.xdk.cache.mediacache.plist"
                                                    isDirectory:NO];
    
    // Find or create the media cache subdirectory.
    
    self.mediaCacheURL = [root URLByAppendingPathComponent:@"intel.xdk.cache"
                                               isDirectory:YES];
    if (! [fm fileExistsAtPath:[self.mediaCacheURL path]] &&
        ! [fm createDirectoryAtURL:self.mediaCacheURL
       withIntermediateDirectories:NO
                        attributes:nil
                             error:nil])
    {
        [self reset];
        return;
    }
    
    // Create a serial dispatch queue for running the "save file" stage of media downloads.
    // (Downloads can run concurrently, but actually saving the downloaded files in the
    // media cache directory concurrently could result in data races, particularly on the
    // nmediaCache and extMediaCacheFileNumber properties.)
    
    self.mediaFileSaveQueue = dispatch_queue_create("intel.xdk.cache.mediaFileSaveQueue",
                                                    DISPATCH_QUEUE_SERIAL);
    
    self.ready = YES;
}


#pragma mark - Commands

- (void) getCacheInfo:(CDVInvokedUrlCommand*)command
{
    [self.commandDelegate runInBackground:^{
        CDVPluginResult* result;
        if (self.ready) {
            [self readCookies];
            [self readMediaCacheIndex];
            result = [CDVPluginResult
                      resultWithStatus:CDVCommandStatus_OK
                      messageAsDictionary:@{@"cookies":[self cookieListForJS],
                                            @"mediacache":self.mediaCacheIndex,
                                            @"mediacache_dir":[self.mediaCacheURL path]}];
        }
        else {
            result = [CDVPluginResult
                      resultWithStatus:CDVCommandStatus_ERROR
                      messageAsString:@"Plugin failed to initialize"];
        }
        [self.commandDelegate sendPluginResult:result callbackId:command.callbackId];
    }];
}

- (void) setCookie:(CDVInvokedUrlCommand*)command
{
    NSString* name = [command argumentAtIndex:0 withDefault:@"" andClass:[NSString class]];
    NSString* value = [command argumentAtIndex:1 withDefault:@"" andClass:[NSString class]];
    NSInteger days = [[command argumentAtIndex:2 withDefault:@(-1)] integerValue];
    
    if (name.length == 0) return;
    
    NSDate* expires = days < 0  ? [NSDate distantFuture]    // never expires
                    :             [NSDate dateWithTimeIntervalSinceNow:days * 24 * 60 * 60]
                    ;
    
    self.cookieList[name] = @{@"value":value, @"expires":expires};
    [self writeCookies];
}

- (void) removeCookie:(CDVInvokedUrlCommand*)command
{
    NSString* name = [command argumentAtIndex:0 withDefault:@"" andClass:[NSString class]];
    [self.cookieList removeObjectForKey:name];
    [self writeCookies];
}

- (void) clearAllCookies:(CDVInvokedUrlCommand*)command
{
    [self.cookieList removeAllObjects];
    [self writeCookies];
}

- (void) clearMediaCache:(CDVInvokedUrlCommand*)command
{
    BOOL ok = self.ready && [self eraseDirectory:self.mediaCacheURL];
    [self.mediaCacheIndex removeAllObjects];
    [self writeMediaCacheIndex];
    if (!ok) [self reset];
    
    [self fireEvent:@"cache.media.clear"
            success:ok
         components:nil
           internal:ok];
}

- (void) addToMediaCache:(CDVInvokedUrlCommand*)command
{
    NSString* url = [command argumentAtIndex:0 withDefault:@"" andClass:[NSString class]];
    if ([url length] == 0) {
        [self reportDownload:url success:NO];
        return;
    }
    
    NSString* downloadId = [command argumentAtIndex:1 withDefault:@""];
    if (! [downloadId isKindOfClass:[NSString class]]) {
        downloadId = [NSString stringWithFormat:@"%@", downloadId];
    }
    if ([downloadId length] == 0) {
        [self downloadFromURL:url];
    }
    else {
        [self downloadFromURL:url withID:downloadId];
    }
}

- (void) removeFromMediaCache:(CDVInvokedUrlCommand*)command
{
    NSString* url = [command argumentAtIndex:0 withDefault:@"" andClass:[NSString class]];
    BOOL ok = [self deleteMediaCacheFile:self.mediaCacheIndex[url]];
    if (ok) {
        [self.mediaCacheIndex removeObjectForKey:url];
        [self writeMediaCacheIndex];
    }
    [self fireEvent:@"cache.media.remove"
            success:ok
         components:@{@"url": [NSString stringWithFormat:@"'%@'", url]}
           internal:ok];
}

@end
