# CPM Macros and Scripts

**VSCode Extension**


### getMacros()
- Bu fonksiyon, ``config.json`` da belirtilen ``appnames`` göre makroları veritabanından alır ve dosyalara kaydeder. Her ``appname`` için bir javascript dosyası oluşturulur.
- Döndürülen Değer: Yok.

### getMacrosByAppName(appname)
- Bu fonksiyon, belirli bir ``appname`` göre makroları veritabanından alır ve dosyalara kaydeder. ``appname`` boş bırakılırsa Global makrolar gelir.
- Parametre: Makroların alınacağı ``appname``.
- Döndürülen Değer: Yok.

### set functions (Auto Save)
- Set fonksiyonları, bir dokümanı makro olarak kaydeder veya varsa günceller. Makro, veritabanında ilgili kullanıcı ve uygulama adı altında saklanır.
- Macros için yeni oluşturulan script ``btn`` ile başlarsa buton olarak kayıt edilir.
- Parametre: Kaydedilecek olan doküman.
- Döndürülen Değer: Yok.


### commands
"onCommand:extension.getMacros",
"onCommand:extension.getAllMacros",
"onCommand:extension.getMacrosByAppName",
"onCommand:extension.getScript",
"onCommand:extension.getAllScript",
"onCommand:extension.getScriptByAppName",
"onCommand:extension.getLibrary",
"onCommand:extension.getSearchScript",
"onCommand:extension.evrakTip",
"onCommand:extension.companies",
"onDidSaveTextDocument"

### install
```cmd
npm install
```

### package
```
npm install -g vsce
vsce package
```
