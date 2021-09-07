# music-structure
A web application that connects with a user's spotify to show visualizations of the structure of music.

The visualization consists of 6 separate modules each showing distinct musical concepts:
* A repetitive structure visualization, displaying a decomposition of the song into sections, grouped by their harmonic sequential similarity.
* A tempo graph, showing the change, or stability of a song’s tempo over time.
* A unique timbre visualization, showing both segmentation in terms of instrumentation, and gradual timbral changes.
* An event visualization, showing and characterizing moments of timbral anomalies across the song.
* A tonality visualization, showing the large-scale changes in musical key.
* A chord visualization, showing the small scale structure of chord progressions.

[More information](http://jobsavelsberg.com/musicstructure/)

[Research Paper](https://www.researchgate.net/publication/353829597_Visualizing_music_structure_using_Spotify_data)

![tool_image](http://jobsavelsberg.com/wp-content/uploads/2021/07/Tool-1536x1363.png "Tool")

# Setup
### npm install
The project is separated into a **server** and **client**.
Both of which are node packages. The **server** package.json is located at the root, and the **client** package.json is in the client directory. Make sure [npm](https://www.npmjs.com/) is installed and run the following bash commands:
```bash
npm install
cd client && npm install
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
PORT=5000
```

In the client directory also create a `.env` file and add the folloring variables:

```
NODE_ENV=development

SERVER_PORT=5000
VUE_APP_HOST_URL=http://localhost:${SERVER_PORT}
```
# Running the app
To run the app locally, open 2 terminals at the project root level, one will be the client, and one the server:

Terminal 1:
```
npm run client
```
Terminal 2:
```
npm run server
```
