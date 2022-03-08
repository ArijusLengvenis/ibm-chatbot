const fs = require("fs")

function updateHtml(html) {
    html = html.replace(/Module: app/g, "File: app.js")
    html = html.replace(/Module: updater/g, "File: updater.js")
    html = html.replace(/Module: uploader/g, "File: uploader.js")
    html = html.replace(/Module/g, "File")
    html = html.replace(
        /<span class="ancestors"><a href="module-app.html">app<\/a>\.<\/span>/g,
        ""
    )
    return html
}

let html = fs.readFileSync("out/code/index.html").toString()
html = html.replace(
    "<title>JSDoc: Home</title>",
    "<title>Code Documentation</title>"
)
html = updateHtml(html)
fs.writeFileSync("out/code/index.html", html)

html = fs.readFileSync("out/code/module-app.html").toString()
html = html.replace(
    "<title>JSDoc: Module: app</title>",
    "<title>Code Documentation - app.js</title>"
)
html = updateHtml(html)
fs.writeFileSync("out/code/module-app.html", html)

html = fs.readFileSync("out/code/module-updater.html").toString()
html = html.replace(
    "<title>JSDoc: Module: updater</title>",
    "<title>Code Documentation - updater.js</title>"
)
html = updateHtml(html)
fs.writeFileSync("out/code/module-updater.html", html)

html = fs.readFileSync("out/code/module-uploader.html").toString()
html = html.replace(
    "<title>JSDoc: Module: uploader</title>",
    "<title>Code Documentation - uploader.js</title>"
)
html = updateHtml(html)
fs.writeFileSync("out/code/module-uploader.html", html)

html = fs.readFileSync("out/code/module-app.APIResponse.html").toString()
html = html.replace(
    "<title>JSDoc: Class: APIResponse</title>",
    "<title>Code Documentation - APIResponse</title>"
)
html = updateHtml(html)
fs.writeFileSync("out/code/module-app.APIResponse.html", html)

html = fs.readFileSync("out/code/app.js.html").toString()
html = html.replace(
    "<title>JSDoc: Source: app.js</title>",
    "<title>Code Documentation - Source: app.js</title>"
)
html = updateHtml(html)
fs.writeFileSync("out/code/app.js.html", html)

html = fs.readFileSync("out/code/src_js_updater.js.html").toString()
html = html.replace(
    "<title>JSDoc: Source: src/js/updater.js</title>",
    "<title>Code Documentation - Source: updater.js</title>"
)
html = updateHtml(html)
fs.writeFileSync("out/code/src_js_updater.js.html", html)

html = fs.readFileSync("out/code/src_js_uploader.js.html").toString()
html = html.replace(
    "<title>JSDoc: Source: src/js/uploader.js</title>",
    "<title>Code Documentation - Source: uploader.js</title>"
)
html = updateHtml(html)
fs.writeFileSync("out/code/src_js_uploader.js.html", html)
