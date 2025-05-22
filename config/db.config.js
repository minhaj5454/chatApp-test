//This file only contains your mongodb url which connects you to your specific database.
// In that URL you specify your database name and database password as well.(Both are mandatory).
//Note:- If having difficulty connecting to the database, try raplacing "localhost" with "127.0.0.1" in the url.
const mongoose = require('mongoose');

module.exports = function createDatabaseConnection() {
  mongoose.connect(process.env.DB_URL, {
    useCreateIndex: true,
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
    readPreference: "secondaryPreferred",
    serverSelectionTimeoutMS: 10000,
  }).then(() => {
    console.log("Database connected");
  }).catch((e) => {
    console.log(`Database hasn't connected successfully. Check URL or Your internet connection`);
  });
};