import JSZip from "./jszip/dist/jszip.js";

var zip = new JSZip();
zip.file("Hello.txt", "Hello World\n", {base64: true});
zip.generateAsync({type:"string"})
.then(function(content) {
    // see FileSaver.js
    writeTextFile("example.zip", content);
});