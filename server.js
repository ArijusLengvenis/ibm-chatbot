const app = require("./app");
const { AutoUpdater } = require("./src/js/updater");

const PORT = process.env.PORT || 8081;

//Listen to and log the port.
app.listen(PORT, () => {
    console.log(`Server started on port ${PORT} (http://localhost:${PORT})`)
    // AutoUpdater();
});