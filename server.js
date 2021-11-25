const app = require("./app");

const PORT = process.env.PORT || 8081;

//Listen to and log the port.
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
