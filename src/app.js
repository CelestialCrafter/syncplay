const express = require('express');
const axios = require('axios');
const http = require('http');
const path = require('path');

const app = express();
const httpServer = http.createServer(app);

const io = require('socket.io')(httpServer);

const PlayerState = { UNSTARTED: -1, ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 };
const roomData = {};

io.on('connection', socket => {
	let room = socket.id;
	if (!roomData[room]) roomData[room] = { video: null, state: {} };
	socket.emit('defaultRoom', room);

	socket.on('joinRoom', roomToJoin => {
		if (io.sockets.adapter.rooms.has(roomToJoin)) socket.join(roomToJoin);
		else return socket.emit('error', { error: 'Room does not exist' });
		room = roomToJoin;

		if (!roomData[room]) roomData[room] = { video: null, state: {} };

		const video = roomData[room].video;
		if (video) socket.emit('roomVideo', video);
		socket.emit('currentRoom', room);
	});

	socket.on('updateVideo', video => {
		if (!video) return socket.emit('error', { error: 'No Video' });
		if (room !== socket.id) return socket.emit('error', { error: 'Not Leader' });

		const videoURL = new URL(video);
		const videoId = videoURL.searchParams.get('v');
		if (!videoId) return socket.emit('error', { error: 'Invalid Video' });

		axios.get(`http://img.youtube.com/vi/${encodeURIComponent(videoId)}/0.jpg`).then(res => {
			roomData[room].video = videoId;
			io.to(room).emit('roomVideo', roomData[room].video);
		}).catch(() => socket.emit('error', { error: 'Invalid Video' }));
	});

	socket.on('stateChange', data => {
		if (room !== socket.id) return socket.emit('error', { error: 'Not Leader' });
		let updatedData = data;
		roomData.state = data;

		// Converts all states to play/pause
		switch (data.state) {
		case PlayerState.UNSTARTED:
			updatedData = { ...updatedData, time: 0, state: PlayerState.PAUSED };
			break;
		case PlayerState.BUFFERING || PlayerState.ENDED:
			updatedData = { ...updatedData, state: PlayerState.PAUSED };
		}

		socket.to(room).emit('updateState', updatedData);
	});

	socket.on('getState', () => socket.emit('updateState', roomData[room]));
});

app.use(express.static(path.resolve('src/public/')));

app.get('/', (req, res) => res.sendFile(path.resolve('src/routes/index.html')));
app.get('/tutorial', (req, res) => res.sendFile(path.resolve('src/routes/tutorial.html')));

httpServer.listen(8080);