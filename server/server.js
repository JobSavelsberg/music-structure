const spotifyAPI = require("./routes/spotifyAPI");
const express = require('express');
const morgan = require('morgan');
const dotenv = require('dotenv');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const serveStatic = require('serve-static')

dotenv.config();
const app = express();

if(process.env.NODE_ENV === 'development'){
    app.use(morgan('dev'));
}

app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(bodyParser.json());

app.use(cors({
    origin: true,
    credentials: true
}))


app.use("/api/spotify", spotifyAPI);

const port = process.env.BACKEND_PORT || 5000;

app.listen(port, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${port}`);
})

if(process.env.NODE_ENV === 'production'){
    const clientApp = express();
    const clientPort = process.env.PORT || 8080;
    clientApp.use('/', serveStatic(path.join(__dirname, '../client/dist')));
    
    clientApp.listen(clientPort, () => {
        console.log(`Frontend running in ${process.env.NODE_ENV} mode on port ${clientPort}`);
    })
}
