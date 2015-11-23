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

package com.intel.xdk.cache;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.lang.reflect.Method;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Arrays;
import java.util.Calendar;
import java.util.Date;
import java.util.GregorianCalendar;
import java.util.Iterator;
import java.util.Map;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaInterface;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CordovaWebView;
import org.apache.http.HttpEntity;
import org.apache.http.HttpResponse;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.impl.client.DefaultHttpClient;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.Debug;
import android.util.Base64;
import android.util.Log;
import android.webkit.WebView;

public class Cache extends CordovaPlugin {
    private static final SimpleDateFormat sdf;
    private static final String tag = "IntelXDKCache";
    private final String DONOTEXPIRE = "never";
    private String cookies = null;
    private String cookiesExpires = null;

    private String cachedMediaDirectoryName = "_cachedMedia"; 
    private File cachedMediaDirectory = null; 
    private SharedPreferences mediaCache = null;
    private Activity activity = null;
    private int cachedMediaCounter = 0;
    
    static {
        sdf = new java.text.SimpleDateFormat("EEE, d MMM yyyy HH:mm:ss z");
    }
    
    public Cache(){
    }

    @Override
    public void initialize(CordovaInterface cordova, CordovaWebView webView) {
        super.initialize(cordova, webView);

        //get convenience reference to activity
        activity = cordova.getActivity();
        
        // activity.runOnUiThread(new Runnable() {
        //     public void run() {
        //         if(Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
        //          try {
        //              Method m = WebView.class.getMethod("setWebContentsDebuggingEnabled", boolean.class);
        //              m.invoke(WebView.class, true);
        //          } catch (Exception e) {
        //              // TODO Auto-generated catch block
        //              e.printStackTrace();
        //          }
        //          //WebView.setWebContentsDebuggingEnabled(true);
        //         }
        //     }
        // });
        
        
        //make shared prefs keys app specific
//        cookies = String.format("%s.cookies", webView.config.appName); 
//        cookiesExpires = String.format("%s.cookies-expires", webView.config.appName); 
//        cachedMediaMap =  String.format("%s.cached-media-map", webView.config.appName);
        cookies = String.format("%s.cookies", activity.getPackageName()); 
        cookiesExpires = String.format("%s.cookies-expires", activity.getPackageName()); 

        cachedMediaDirectory = activity.getDir(cachedMediaDirectoryName, 0);
        //testCookies();
        mediaCache = activity.getSharedPreferences(String.format("%s.cached-media-map", activity.getPackageName()), 0);
        
//        if(activity.configData!=null && !activity.configData.hasCaching) {
//            //flush cache if not authorized
//            resetPhysicalMediaCache();
//        }       
    }

    /**
     * Executes the request and returns PluginResult.
     *
     * @param action            The action to execute.
     * @param args              JSONArray of arguments for the plugin.
     * @param callbackContext   The callback context used when calling back into JavaScript.
     * @return                  True when the action was valid, false otherwise.
     */
    public boolean execute(String action, JSONArray args, CallbackContext callbackContext) throws JSONException {
        if (action.equals("getCacheInfo")) {
            JSONObject r = new JSONObject();
            r.put("cookies", new JSONObject(getCookies()));
            r.put("mediacache", new JSONObject(getMediaCache()));
            r.put("mediacache_dir", cachedMediaDirectory.getAbsolutePath());
            callbackContext.success(r);
        }
        else if (action.equals("setCookie")) {
            this.setCookie(args.getString(0), args.getString(1), args.getInt(2));
        }
        else if (action.equals("removeCookie")) {
            this.removeCookie(args.getString(0));
        }
        else if (action.equals("clearAllCookies")) {
            this.clearAllCookies();
        }
        else if (action.equals("addToMediaCache")) {
            this.addToMediaCache(args.getString(0), args.getString(1));
        }
        else if (action.equals("removeFromMediaCache")) {
            this.removeFromMediaCache(args.getString(0));
        }
        else if (action.equals("clearMediaCache")) {
            this.clearMediaCache();
        }
        else {
            return false;
        }

        return true;
    }

    //--------------------------------------------------------------------------
    // LOCAL METHODS
    //--------------------------------------------------------------------------    
    
    private String getCookies() {
        Map<String, ?> valueMap = activity.getSharedPreferences(cookies, 0).getAll();
        SharedPreferences.Editor valueEditor = activity.getSharedPreferences(cookies, 0).edit();
        Map<String, ?> expiresMap = activity.getSharedPreferences(cookiesExpires, 0).getAll();
        SharedPreferences.Editor expiresEditor = activity.getSharedPreferences(cookiesExpires, 0).edit();
        
        StringBuffer cookies = new StringBuffer("{");
        Iterator<String> keys = valueMap.keySet().iterator();
        while(keys.hasNext()){
            String key = keys.next();
            String value = (String) valueMap.get(key);
            String expires = (String) expiresMap.get(key);
            Date expiresDate = null, now = new Date();
            if(!expires.equals(DONOTEXPIRE)) {
                try {
                    expiresDate = sdf.parse(expires);
                } catch (ParseException e) {
                    e.printStackTrace();
                }
            }
            if(expiresDate==null || expiresDate.after(now)){
                value = value.replaceAll("'", "\\\\'");
                cookies.append(key+":{value:'"+value+"'}");
                if(keys.hasNext()) {cookies.append(", ");}
            } else {
                //coookie is expired - remove it from prefs
                valueEditor.remove(key);
                expiresEditor.remove(key);
            }
        }
        valueEditor.commit();
        expiresEditor.commit();
        cookies.append("}");
        if(Debug.isDebuggerConnected()) Log.i(tag, "intel.xdk.cookies: " + cookies.toString());
        return cookies.toString();
    }
    
    public void setCookie(String cookieName, String cookieValue, int expires) {
        setCookie(cookieName, cookieValue, expires, false);
    }
    
    private void setCookie(String cookieName, String cookieValue, int expires, boolean setExpired) {
        //set value
        SharedPreferences settings = activity.getSharedPreferences(cookies, 0);
        SharedPreferences.Editor editor = settings.edit();
        editor.putString(cookieName, cookieValue);
        editor.commit();
        //set expires
        settings = activity.getSharedPreferences(cookiesExpires, 0);
        editor = settings.edit();
        if(setExpired || expires>=0) {
            GregorianCalendar now = new GregorianCalendar();
            now.add(Calendar.DATE, expires);
            editor.putString(cookieName, sdf.format(now.getTime()));
        } else {
            editor.putString(cookieName, DONOTEXPIRE);
        }
        editor.commit();
    }
    
    public void removeCookie(String cookieName){
        SharedPreferences.Editor valueEditor = activity.getSharedPreferences(cookies, 0).edit();
        SharedPreferences.Editor expiresEditor = activity.getSharedPreferences(cookiesExpires, 0).edit();
        valueEditor.remove(cookieName);
        expiresEditor.remove(cookieName);
        valueEditor.commit();
        expiresEditor.commit();
    }
    
    public void clearAllCookies() {
        SharedPreferences.Editor valueEditor = activity.getSharedPreferences(cookies, 0).edit();
        SharedPreferences.Editor expiresEditor = activity.getSharedPreferences(cookiesExpires, 0).edit();
        valueEditor.clear();
        expiresEditor.clear();      
        valueEditor.commit();
        expiresEditor.commit();     
    }

    /*
    private void testCookies() {
        clearAllCookies();
        getCookies(false);
        setCookie("expired1", "expired1", 0, true);
        setCookie("expired2", "expired2", -1, true);
        setCookie("new1", "new1", 1, true);
        setCookie("new2", "new2", 1, true);
        setCookie("never1", "never", 0, false);
        getCookies(false);
        clearCookie("new2");
        getCookies(false);
        clearAllCookies();
        getCookies(false);
    }
    //*/
    
    private String getFilenameWithURL(String url) {
        //increment counter and associate with filename with url
        
        //get filename extension from url
        String extension = "";
        int lastSlashInUrl = url.lastIndexOf('/');
        int lastDotAfterLastSlashInUrl = url.indexOf('.', lastSlashInUrl);
        if(lastSlashInUrl != -1 && lastDotAfterLastSlashInUrl != -1) {
            extension = url.substring(lastDotAfterLastSlashInUrl);
        }
        
        //move file to new location - handle collisions
        String newFileName = null;
        File newFile;
        do {
            newFileName = (cachedMediaCounter++) + extension;
            newFile = new File(cachedMediaDirectory, newFileName);
        } while(newFile.exists());
        
        //return filename with same extension as url
        return newFileName;
    }   

    //this gets called at startup time, so init stuff happens in here
    private String getMediaCache() {
        File[] physicalMediaCache = cachedMediaDirectory.listFiles();
        if(physicalMediaCache!=null) if(Debug.isDebuggerConnected()) Log.i(tag, "****physical media cache****: "+ Arrays.asList(physicalMediaCache));
        
        Map<String, ?> valueMap = mediaCache.getAll();

        //TODO: should verify that list is in synch with filesystem here
        
        //inject js
        StringBuffer mediaJS = new StringBuffer("{");
        Iterator<String> keys = valueMap.keySet().iterator();
        while(keys.hasNext()){
            if(mediaJS.length()!=1) mediaJS.append(", ");
            String key = keys.next();
            mediaJS.append("\""+key+"\":");
            String value = (String) valueMap.get(key);
            mediaJS.append("\""+value+"\"");
        }
        mediaJS.append("}");

        if(Debug.isDebuggerConnected()) Log.i(tag, "intel.xdk.mediacache: " + mediaJS.toString());
        return mediaJS.toString();
    }

    public static boolean deleteDirectory(File path) {
        if (path.exists()) {
            File[] files = path.listFiles();
            for (int i = 0; i < files.length; i++) {
                if (files[i].isDirectory()) {
                    deleteDirectory(files[i]);
                } else {
                    files[i].delete();
                }
            }
        }
        return (path.delete());
    }
    
    private void resetPhysicalMediaCache(){
        //delete the media cache directory
        if(cachedMediaDirectory.exists()) {
            deleteDirectory(cachedMediaDirectory);//what if it cant be deleted?
        }
        //create an empty directory
        cachedMediaDirectory = activity.getDir(cachedMediaDirectoryName, 0);

        SharedPreferences.Editor editor = mediaCache.edit();
        editor.clear();
        editor.commit();
    }
    
    public void clearMediaCache() {
//        if(webView.config!=null && !webView.config.hasCaching) return;
        resetPhysicalMediaCache();
        //update js object and fire private and public events
        String js = "javascript:var _e = document.createEvent('Events');_e.initEvent('intel.xdk.cache.internal.media.clear',true,true);document.dispatchEvent(_e);" +
                "var e = document.createEvent('Events');e.initEvent('intel.xdk.cache.media.clear',true,true);document.dispatchEvent(e);";
        if(Debug.isDebuggerConnected()) Log.i(tag, js);
        injectJS(js);
    }
    public void removeFromMediaCache(String url) {
//        if(webView.config!=null && !webView.config.hasCaching) return;
        String path = mediaCache.getString(url, "");
        String js;
        boolean success = false;
        
        //try to delete the file
        if(!"".equals(path)) {
            boolean removed = new File(cachedMediaDirectory, path).delete();
            if(removed) {
                //update the prefs
                SharedPreferences.Editor editor = mediaCache.edit();
                editor.remove(url);
                editor.commit();

                success = true;
            } 
        }

        //update js object and fire private and public events
        if(success) {
            js = "javascript:var _e = document.createEvent('Events');_e.initEvent('intel.xdk.cache.internal.media.remove',true,true);_e.success=true;_e.url=\"" + url + "\";document.dispatchEvent(_e);" +
                    "var e = document.createEvent('Events');e.initEvent('intel.xdk.cache.media.remove',true,true);e.success=true;e.url=e.url=\"" + url + "\";document.dispatchEvent(e);";
        } else {
            js = "javascript:var e = document.createEvent('Events');e.initEvent('intel.xdk.cache.media.remove',true,true);e.success=false;e.url=e.url=\"" + url + "\";document.dispatchEvent(e);";
        }
        
        //update js object and fire an event
        if(Debug.isDebuggerConnected()) Log.i(tag, js);
        injectJS(js);
    }   

    public void addToMediaCache(final String url, final String id){
//        if(webView.config!=null && !webView.config.hasCaching) return;
        new Thread("IntelXDKCache:addToMediaCache") {
            @Override
            public void run() {
                downloadToMediaCache(url, id);
            }
        }.start();
        
    }

    interface DownloadProgressEmitter {
        public void emit(long current, long length);
    }
    
    //called by addToMediaCache to run in worker thread
    private void downloadToMediaCache(String url, final String id) {
        

        //get the filename
        String filename = getFilenameWithURL(url);
        
        //create the file to write data into
        // File mediaPath = new File(cachedMediaDirectory, getFilenameWithURL(url));
        // CacheHandler will create the file for us
        
        //*
        //download the file: allow for up to 3 retries
        
        int retries = 3;
        boolean success = false;
        while(!success && retries>0) {
            //check if the request succeeded, if so, write out data and increment offset
            success = (id!=null && id.length()>0) ?
                CacheHandler.get(url, activity.getApplicationContext(), filename, cachedMediaDirectory, new DownloadProgressEmitter() {
                    public void emit(long current, long length) {
                        String js = "javascript: var e = document.createEvent('Events');e.initEvent('intel.xdk.cache.media.update',true,true);e.success=true;e.id='" + id + "';e.current=" + current + ";e.total=" + length + ";document.dispatchEvent(e);";
                        if(Debug.isDebuggerConnected()) Log.i(tag, js);
                        injectJS(js);                       
                    }                   
                }):
                CacheHandler.get(url, activity.getApplicationContext(), filename, cachedMediaDirectory);
            if(success) {
            } else {
                //handle error
                //NSLog(@"error -- code: %d, localizedDescription: %@", [error code], [error localizedDescription]);
                //[self finishedDownloadToMediaCache:url toPath:nil withFlag:NO];
            }
            retries--;
        }
        
        //finishedDownloadToMediaCache(url, mediaPath.getAbsolutePath(), success, id);
        finishedDownloadToMediaCache(url, filename, success, id);
    }
    
    //called by downloadToMediaCache after completion
    //update mediaCache, intel.xdk.mediacache js object and fire events
    private void finishedDownloadToMediaCache(String url, String path, boolean didSucceed, String id) {
        String js;
        if(didSucceed) {
            //update the prefs
            SharedPreferences.Editor editor = mediaCache.edit();
            editor.putString(url, path);
            editor.commit();
            
            //update js object and fire private and public events
            js = "javascript:var _e = document.createEvent('Events');_e.initEvent('intel.xdk.cache.internal.media.add',true,true);_e.success=true;_e.url=\"" + url + "\",_e.filename=\"" + path + "\";document.dispatchEvent(_e);";
            if(id!=null && id.length()>0) {
                js += "var e = document.createEvent('Events');e.initEvent('intel.xdk.cache.media.add',true,true);e.success=true;e.url=\"" + url + "\";e.id='" + id + "';document.dispatchEvent(e);";
            } else {
                js += "var e = document.createEvent('Events');e.initEvent('intel.xdk.cache.media.add',true,true);e.success=true;e.url=\"" + url + "\";document.dispatchEvent(e);";
            }
        } else {
            //update js object and fire public event (private not needed for failure case)
            js = "javascript:";
            if(id!=null && id.length()>0) {
                js += "var e = document.createEvent('Events');e.initEvent('intel.xdk.cache.media.add',true,true);e.success=false;e.url=\"" + url + "\";e.id='" + id + "';document.dispatchEvent(e);";
            } else {
                js += "var e = document.createEvent('Events');e.initEvent('intel.xdk.cache.media.add',true,true);e.success=false;e.url=\"" + url + "\";document.dispatchEvent(e);";
            }
        }
        if(Debug.isDebuggerConnected()) Log.i(tag, js);
        injectJS(js);
    }
    
    private void injectJS(final String js) {
        activity.runOnUiThread(new Runnable() {
            public void run() {
                webView.loadUrl(js);
            }
        });
    }
    
    static class CacheHandler {
        
        public static Boolean get(String url, Context context, String file, File dir)
        {
            return get(url, context, file, dir, null);
        }
        
        public static Boolean get(String url, Context context, String file, File dir, DownloadProgressEmitter emitter)
        {
            Boolean success = true;
            HttpEntity entity = CacheHandler.getHttpEntity(url);
            try {           
                CacheHandler.writeToDisk(entity, context, file, dir, url, emitter);
            } catch (Exception e) { 
                if(Debug.isDebuggerConnected()) {
                    Log.d(tag, e.getMessage(), e);
                }
                success = false; 
            }
            try {
                entity.consumeContent();
            } catch (Exception e) {
                if(Debug.isDebuggerConnected()) {
                    Log.d(tag, e.getMessage(), e);
                }
                success = false;
            }
            return success;
        }

        public static HttpEntity getHttpEntity(String url)
        /**
         * get the http entity at a given url
         */
        {
            HttpEntity entity=null;
            try {
                DefaultHttpClient httpclient = new DefaultHttpClient();
                HttpGet httpget = new HttpGet(url);
                //check for user info in url, do pre-emptive authentication if present
                if(httpget.getURI().getUserInfo()!=null) {
                    String[] creds = httpget.getURI().getUserInfo().split(":");
                    if(creds.length==2) httpget.setHeader("Authorization", "Basic " + Base64.encodeToString((creds[0]+":"+creds[1]).getBytes(), Base64.NO_WRAP));
                }
                HttpResponse response = httpclient.execute(httpget);
                int code = response.getStatusLine().getStatusCode() / 100;
                if( code == 2 ) entity = response.getEntity(); // only get the entity for 200 level codes
            } catch (Exception e) { 
                if(Debug.isDebuggerConnected()) {
                    Log.d(tag, e.getMessage(), e);
                }
                return null; }
            return entity;
        }

        public static void writeToDisk(HttpEntity entity, Context context, String file, File dir, String url, DownloadProgressEmitter emitter) throws Exception
        /**
         * writes a HTTP entity to the specified filename and location on disk
         */
        {
            long lastEmission = System.currentTimeMillis();
            long current = 0;
            InputStream in = entity.getContent();
            byte buff[] = new byte[1024*64];
            FileOutputStream out = null;
            if(dir==null){
                dir = context.getFilesDir();
            }
            
            File fileTemp = new File(dir, file);
            if(Debug.isDebuggerConnected()) {
                Log.d(tag, "mediacache writing " + url + " to: " + fileTemp.getAbsolutePath());
            }
            if(fileTemp.exists()) fileTemp.delete();
            boolean didSucceed = fileTemp.createNewFile();
            if(didSucceed) {
                out = new FileOutputStream(fileTemp);
                do {
                    int numread = in.read(buff);
                    if (numread <= 0)
                        break;
                    current+=numread;
                    out.write(buff, 0, numread);
                    //System.out.println(new String(buff));
                    if(emitter!=null) {
                        //limit emissions to 1/sec
                        long now = System.currentTimeMillis();
                        if((now-lastEmission)>999) {
                            emitter.emit(current, entity.getContentLength());
                            lastEmission = now;
                        }
                    }
                } while (true);
                out.flush();
                out.close();
            } else {
                System.out.println("fileTemp.createNewFile(); failed");
            }

        }
    }    
}