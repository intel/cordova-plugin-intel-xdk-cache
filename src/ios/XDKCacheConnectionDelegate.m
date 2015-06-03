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

#import "XDKCacheConnectionDelegate.h"

@interface XDKCacheConnectionDelegate ()

//! Block to call when download completes successfully.
@property (copy) void (^successCallback)();

//! Block to call when download completes unsuccessfully.
@property (copy) void (^failureCallback)();

//! Block to call from time to time to report download progress.
@property (copy) void (^progressCallback)(long long length, long long received);

//! Report progress on the next connection:didReceiveData: call after this time.
@property (nonatomic) NSDate* nextUpdate;

//! Total expected number of bytes to download.
@property (nonatomic) long long bytesExpected;

//! Number of bytes downloaded so far.
@property (nonatomic) long long bytesReceived;

//! File URL for file to write the data to.
@property (nonatomic) NSString* filePath;

//! File to write the data to.
@property (nonatomic) NSFileHandle* fileHandle;

@end

@implementation XDKCacheConnectionDelegate

- (instancetype) initWithFile:(NSString*)filePath
                      success:(void(^)())successCallback
                      failure:(void(^)())failureCallback
                     progress:(void(^)(long long length, long long received))progressCallback
{
    self = [super init];
    if (self) {
        self.filePath = filePath;
        self.successCallback = successCallback;
        self.failureCallback = failureCallback;
        self.progressCallback = progressCallback;
        self.nextUpdate = [NSDate dateWithTimeIntervalSinceNow:0.2];
    }
    return self;
}


- (void)connection:(NSURLConnection *)connection didReceiveResponse:(NSURLResponse *)response
{
	self.bytesExpected = response.expectedContentLength;
	if( [response isKindOfClass:[NSHTTPURLResponse class]]) {
		NSHTTPURLResponse *httpResponse = (NSHTTPURLResponse *)response;
        if ([httpResponse statusCode] < 200 && [httpResponse statusCode] > 299) {
            [connection cancel];
            self.failureCallback();
        }
	}
}


- (void)connection:(NSURLConnection *)connection didReceiveData:(NSData *)data
{
	if (self.fileHandle == nil) {
		[[NSFileManager defaultManager] createFileAtPath:self.filePath contents:nil attributes:nil];
		self.fileHandle = [NSFileHandle fileHandleForUpdatingAtPath:self.filePath];
		[self.fileHandle seekToEndOfFile];
	}

	[self.fileHandle writeData:data];
	self.bytesReceived += [data length];

    if ([[NSDate date] compare:self.nextUpdate] == NSOrderedDescending) {
        self.progressCallback(self.bytesExpected, self.bytesReceived);
		self.nextUpdate = [NSDate dateWithTimeIntervalSinceNow:1.0];
	}
}


- (void)connection:(NSURLConnection *)connection didFailWithError:(NSError *)error
{
	[self.fileHandle closeFile];
    [[NSFileManager defaultManager] removeItemAtPath:self.filePath error:nil];
    self.failureCallback();
}


- (void)connectionDidFinishLoading:(NSURLConnection *)connection
{
	[self.fileHandle closeFile];
    self.successCallback();
}

@end
