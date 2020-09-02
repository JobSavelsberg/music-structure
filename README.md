# music-structure
A web application that connects with a user's spotify to show visualizations of the structure of music.

# Setup
### npm install
The project is separated into a **server** and **client**. 
Both of which are node packages. Make sure [npm](https://www.npmjs.com/) is installed and run the following bash commands:
```bash
cd client && npm install
cd server && npm install
```

### environment variables
In the root directory create a `.env` file. And add the following variables:

*Temporary*
```
NODE_ENV=development

SPOTIFY_CLIENT_ID=<specified on spotify api account>
SPOTIFY_CLIENT_SECRET=<specified on spotify api account>
SPOTIFY_REDIRECT=http://localhost:8080/callback

HOST_URL=http://localhost
SERVER_PORT=5000
```
