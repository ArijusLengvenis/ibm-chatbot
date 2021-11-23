const app = require('./app');

const PORT = process.env.PORT || 5000;

//Listen to and log the port.
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));