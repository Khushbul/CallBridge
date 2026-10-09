const fs = require('fs');

let xml = fs.readFileSync('decompiled_base/AndroidManifest.xml', 'utf8');

// 1. Change package name to com.callbridge.game
xml = xml.split('io.teslatech.callbreak').join('com.callbridge.game');

// 2. Set launcher activity to CallBridgeActivity
xml = xml.replace('android:name="com.godot.game.GodotApp"', 'android:name="com.callbridge.game.CallBridgeActivity"');

// 3. Make screenOrientation="sensor" so it adapts seamlessly to any orientation (portrait or landscape)
xml = xml.replace('android:screenOrientation="userLandscape"', 'android:screenOrientation="sensor"');

// 4. Remove split attributes
xml = xml.replace(/android:requiredSplitTypes="[^"]*"/g, '');
xml = xml.replace(/android:splitTypes="[^"]*"/g, '');

// 5. Remove split meta-data tags
xml = xml.replace(/<meta-data\s+android:name="com\.android\.vending\.splits\.required"[^>]*\/>/g, '');
xml = xml.replace(/<meta-data\s+android:name="com\.android\.vending\.splits"[^>]*\/>/g, '');
xml = xml.replace(/<meta-data\s+android:name="com\.android\.vending\.derived\.apk\.id"[^>]*\/>/g, '');

// 6. Enforce extractNativeLibs="true"
xml = xml.replace('android:extractNativeLibs="false"', 'android:extractNativeLibs="true"');

// 7. Use standard Application class to prevent any third-party ad/godot crashes on startup
xml = xml.replace('android:name="com.godot.game.MainApplication"', 'android:name="android.app.Application"');

fs.writeFileSync('decompiled_base/AndroidManifest.xml', xml, 'utf8');
console.log('✅ AndroidManifest.xml successfully patched for CallBridge!');
