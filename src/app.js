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
	socket.room = socket.id;
	if (!roomData[socket.room]) roomData[socket.room] = { video: null };
	socket.emit('currentRoom', socket.room);

	socket.on('joinRoom', room => {
		if (io.sockets.adapter.rooms.has(room)) socket.join(room);
		else return socket.emit('error', { error: 'Room does not exist' });
		socket.room = room;

		if (!roomData[socket.room]) roomData[socket.room] = { video: null };

		const video = roomData[socket.room].video;
		if (video) socket.emit('roomVideo', video);
		socket.emit('currentRoom', socket.room);
	});

	socket.on('updateVideo', video => {
		if (!video) return socket.emit('error', { error: 'No Video' });

		const videoURL = new URL(video);
		const videoId = videoURL.searchParams.get('v');
		if (!videoId) return socket.emit('error', { error: 'Invalid Video' });

		axios.get(`http://img.youtube.com/vi/${encodeURIComponent(videoId)}/0.jpg`).then(res => {
			roomData[socket.room].video = videoId;
			io.to(socket.room).emit('roomVideo', roomData[socket.room].video);
		}).catch(() => socket.emit('error', { error: 'Invalid Video' }));
	});

	socket.on('stateChange', data => {
		let updatedData = data;

		// Converts all states to play/pause
		switch (data.state) {
			case PlayerState.UNSTARTED:
				updatedData = { ...updatedData, time: 0, state: PlayerState.PAUSED };
				break;
			case PlayerState.BUFFERING || PlayerState.ENDED:
				updatedData = { ...updatedData, state: PlayerState.PAUSED };
		}

		socket.to(socket.room).emit('updateState', updatedData);
	});
});

app.use(express.static(path.resolve('src/public/')));

httpServer.listen(8080);