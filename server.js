//Below require just requires the .env file into the file. 
require("dotenv").config();
//Database configuration for the successfully execution.
const createDatabaseConnection = require('./config/db.config');
const express = require("express");
const app = express();
const morgan = require('morgan');


//Socket.io is used for real time communication between client and server.
const http = require('http');
const server = http.createServer(app);

// const io = new Server(server);

//Router of the end user. 
const userRoutes = require('./routes/user/user');
const adminRoutes = require('./routes/admin/superAdmin');

//Following 3 modules are multilingual modules.
const i18next = require('i18next')
const Backend = require('i18next-fs-backend')
const middleware = require('i18next-http-middleware')

//Below code is multilingual middleware setup.
i18next.use(Backend).use(middleware.LanguageDetector)
  .init({
    fallbackLng: 'en',
    backend: {
      loadPath: './locales/{{lng}}/translation.json'
    }
  }); 
  
const cors = require("cors");

//Port is getting defined here.
const port = process.env.PORT || 3000;

//cors specification.
let corsOptions = {
  origin: "*", 
  optionsSuccessStatus: 200,
}  

app.use(cors(corsOptions));

//below upload file is a base where we upload all our static images, files, and document.
//we can use 'public' instead of using 'uploads'.(Not necessary to use uploads or public just naming convention)
app.use('/uploads', express.static('uploads'));
//below middlewares are body parsers.
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
//below middleware is for the multilingual module.
app.use(middleware.handle(i18next));
app.use(morgan('dev'));

//Base routes for the end users.
// require('./middlewares/modules/socket/socket')(server);
userRoutes(app);
adminRoutes(app);



require('./middlewares/modules/socket/socket')(server); 



// Handle 404 (Not Found)
app.use((req, res) => {
  res.status(404).send({
    error: 'Page Not Found',
    message: 'The requested resource was not found'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(400).send({
    error: err.name || 'Internal Server Error',
    message: "Something went wrong",
    details: err.message || "Undefined"
  });
});

async function startServer() {
  try {
    // Start the server
    server.listen(3000, () => {
      console.log(`Server is running on port 3000`);
    });
    createDatabaseConnection();
  } catch (error) {
    console.error(error);
    process.exit(1); // Exit the process with an error code
  }
};

startServer();
