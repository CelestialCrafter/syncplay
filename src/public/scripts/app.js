/* eslint-disable require-jsdoc */
/* eslint-disable no-undef */

let player;
let recentlyUpdated = false;
const socket = io(window.location.origin);

const videoInput = document.getElementById('videoInput');
const roomInput = document.getElementById('roomInput');
const submitVideo = document.getElementById('submitVideo');
const submitRoom = document.getElementById('submitRoom');
const shareRoom = document.getElementById('shareRoom');
const roomId = document.getElementById('roomId');
const currentRoomId = document.getElementById('currentRoomId');
let currentRoom = '';

// eslint-disable-next-line no-unused-vars
function onYouTubeIframeAPIReady() {
	submitRoom.addEventListener('click', event => socket.emit('joinRoom', roomInput.value));
	submitVideo.addEventListener('click', event => {
		if (currentRoom !== socket.id) return M.toast({ html: `<span class="red-text">Error: Not Leader</span>` });
		socket.emit('updateVideo', videoInput.value);
	});

	socket.on('roomVideo', videoId => {
		player?.destroy();

		player = new YT.Player('player', {
			width: window.innerWidth / 2 - 30,
			height: window.innerHeight / 2,
			videoId,
			playerVars: {
				'playsinline': 1
			},
			events: {
				'onReady': onPlayerReady,
				'onStateChange': onPlayerStateChange
			}
		});

		M.toast({ html: 'Changed Video!' });
	});
}

const onPlayerReady = event => {
	player.playVideo();

	socket.emit('getState');

	socket.on('updateState', data => {
		console.log('state updated')
		const time = player.getCurrentTime();

		if (time !== data.time) player.seekTo(data.time, true);
		if (data.state === YT.PlayerState.PLAYING) player.playVideo();
		else player.pauseVideo();

		recentlyUpdated = true;
		setTimeout(() => recentlyUpdated = false, 1000);
	});
};

const onPlayerStateChange = event => {
	if (currentRoom !== socket.id) return;
	if (recentlyUpdated) return;

	socket.emit('stateChange', {
		state: event.data,
		time: player.getCurrentTime()
	});

	recentlyUpdated = true;
	setTimeout(() => recentlyUpdated = false, 100);
};

socket.onAny(console.log);

socket.on('error', data => M.toast({ html: `<span class="red-text">Error: ${data.error}</span>` }));
socket.on('connect', () => {
	M.toast({ html: 'Connected to server!' });
	shareRoom.addEventListener('click', event => {
		M.toast({ html: 'Copied to clipboard!' });
		navigator.clipboard.writeText(`${window.location.origin}/#${currentRoom}`);
	});

	roomId.innerText = socket.id;
	if (window.location.hash) {
		M.toast({ html: 'Detected room hash! Joining room.' });
		socket.emit('joinRoom', window.location.hash.substring(1));
	}
});
socket.on('disconnect', () => M.toast({ html: '<span class="yellow-text">Disconnected from server</span>' }));
socket.on('currentRoom', room => {
	player?.destroy();
	currentRoom = room;
	currentRoomId.innerText = room;
	socket.id === room ? null : M.toast({ html: 'Joined Room!' });
});
socket.on('defaultRoom', room => {
	currentRoom = room;
	currentRoomId.innerText = room;
});