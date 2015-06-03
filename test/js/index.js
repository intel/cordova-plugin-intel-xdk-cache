/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

//try to make alerts work on windows and not-windows
if(typeof navigator.notification != "undefined") {
    alert = navigator.notification.alert;
}

var app = {
    testImg: 'http://farm6.staticflickr.com/5152/5843119198_941a9f78a2_o.jpg',
    testImg2: 'http://www.w3.org/html/logo/downloads/HTML5_Logo_512.png',
    testImgInterval: -1,
    // Application Constructor
    initialize: function() {
        this.bindEvents();
    },
    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
        document.addEventListener('intel.xdk.cache.media.add', this.handleCacheEvent, false);
        document.addEventListener('intel.xdk.cache.media.update', this.handleCacheEvent, false);
        document.addEventListener('intel.xdk.cache.media.clear', this.handleCacheEvent, false);
        document.addEventListener('intel.xdk.cache.media.remove', this.handleCacheEvent, false);
    },
    // deviceready Event Handler
    //
    // The scope of 'this' is the event. In order to call the 'receivedEvent'
    // function, we must explicity call 'app.receivedEvent(...);'
    onDeviceReady: function() {
        app.receivedEvent('deviceready');
    },
    // Update DOM on a Received Event
    receivedEvent: function(id) {
        var parentElement = document.getElementById(id);
        var listeningElement = parentElement.querySelector('.listening');
        var receivedElement = parentElement.querySelector('.received');

        listeningElement.setAttribute('style', 'display:none;');
        receivedElement.setAttribute('style', 'display:block;');

        console.log('Received Event: ' + id);
    },
    getCookie: function() {
        alert(intel.xdk.cache.getCookie('yum'));
    },
    removeCookie: function() {
        intel.xdk.cache.removeCookie('yum');alert('removed');
    },
    getCookieList: function() {
        alert(intel.xdk.cache.getCookieList().join());
    },
    clearAllCookies: function() {
        intel.xdk.cache.clearAllCookies();alert('cleared');
    },
    addToMediaCache: function() {
        intel.xdk.cache.addToMediaCache(this.testImg);
    },

    addToMediaCache2: function () {
        intel.xdk.cache.addToMediaCache(this.testImg2);
    },

    addToMediaCacheExt: function () {
        intel.xdk.cache.addToMediaCacheExt(this.testImg, 1);
    },
    removeFromMediaCache: function() {
        intel.xdk.cache.removeFromMediaCache(this.testImg);
    },
    clearMediaCache: function() {
        intel.xdk.cache.clearMediaCache();
    },
    getMediaCacheList: function() {
        alert(intel.xdk.cache.getMediaCacheList().join());
    },
    getMediaCacheLocalURL: function() {
        alert(intel.xdk.cache.getMediaCacheLocalURL(this.testImg));
    },
//    getMediaCacheRelativePath: function() {
//      alert(intel.xdk.cache.getMediaCacheRelativePath(this.testImg));
//    },
    addImage: function(e) {
        try{
            var testImg = new Image();
            testImg.id = 'testImg';
            testImg.onload = function() {
                //adjust img to be same height as screen, adjust width to be proportional
                //testImg.width = testImg.width * (window.innerHeight/testImg.height);
                //testImg.height = window.innerHeight;
                //testImg.setAttribute('style','position:absolute;left:0px;top:0px;');
//              this.testImgInterval = setInterval(function() {
//                  if((testImg.width+parseInt(testImg.style.left)-10)>window.innerWidth) {
//                      testImg.style.left = (parseInt(testImg.style.left)-10)+'px';
//                  } else {
//                      testImg.style.left = '0px';
//                  }
//                  console.log('testImg.style.left:'+testImg.style.left);
//              }, 100);
            }
            testImg.src = intel.xdk.cache.getMediaCacheLocalURL(e.url);
            log.appendChild(testImg);
        } catch(e){alert(e.message);}        
    },
    removeImage: function() {
        try{
            //stop timer that moves the image
            if(this.testImgInterval!=-1) {
                clearInterval(this.testImgInterval);
                this.testImgInterval = -1;
            }
            var testImg = document.getElementById('testImg');
            if(testImg!=null) {
                log.removeChild(testImg);
            }
        } catch(e){alert(e.message);}        
    },
    handleCacheEvent: function(e) {
        //console.log(e.type);
        var log = document.getElementById('log');
        
        /*
            intel.xdk.cache.media.add (e.url, e.success (true/false))
            intel.xdk.cache.media.add (e.url, e.id, e.success (true/false))
            intel.xdk.cache.media.update (e.id, e.current, e.total)
            intel.xdk.cache.media.clear
            intel.xdk.cache.media.remove (e.url, e.success (true/false))
        */
        var content = '';
        
        if(e.type=='intel.xdk.cache.media.add' && e.hasOwnProperty('id')) {
            if(e.success) {
                //try to remove in case it was already added
                app.removeImage();
                //now add
                app.addImage(e);
            }
            content = 'add ' + (e.success?'succeeded':'failed') + ' id:' + e.id + ' (' + e.url + ')';
        } else if(e.type=='intel.xdk.cache.media.add') {
            if(e.success) {
                //try to remove in case it was already added
                //app.removeImage();
                //now add
                app.addImage(e);
            }
            content += 'add ' + (e.success?'succeeded':'failed') + ' (' + e.url + ')';
        } else if(e.type=='intel.xdk.cache.media.update') {
            var pct = Math.floor((e.current/e.total) * 100)
            content = 'updated - id:' + e.id + '(' + pct + '%)'; 
        } else if(e.type=='intel.xdk.cache.media.clear') {
            content = 'cleared all';
            app.removeImage();
        } else if(e.type=='intel.xdk.cache.media.remove') {
            content = 'remove ' + (e.success?'succeeded':'failed') + ' (' + e.url + ')';
            if(e.success) {
                app.removeImage();
            }
        }       
        
                
        log.innerHTML = content + '<br><br>' + log.innerHTML;
    },
};
