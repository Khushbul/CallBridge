const fs = require('fs');

let str = fs.readFileSync('decompiled_base/res/values/strings.xml', 'utf8');
str = str.replace('<string name="app_name">Callbreak</string>', '<string name="app_name">CallBridge</string>');
str = str.replace('<string name="godot_project_name_string">Callbreak</string>', '<string name="godot_project_name_string">CallBridge</string>');
fs.writeFileSync('decompiled_base/res/values/strings.xml', str, 'utf8');

console.log('✅ strings.xml successfully updated to CallBridge!');
