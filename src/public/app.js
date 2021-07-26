/* eslint-disable no-undef */

let player;
let recentlyUpdated = false;
let prevState = -1;
let prevTime = 0;
const socket = io(window.location.origin);

const videoInput = document.getElementById('videoInput');
const roomInput = document.getElementById('roomInput');
const submitVideo = document.getElementById('submitVideo');
const submitRoom = document.getElementById('submitRoom');
const roomId = document.getElementById('roomId');
const currentRoomId = document.getElementById('currentRoomId');

function onYouTubeIframeAPIReady() {
	submitRoom.addEventListener('click', event => socket.emit('joinRoom', roomInput.value));
	submitVideo.addEventListener('click', event => socket.emit('updateVideo', videoInput.value));

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

		M.toast({ html: '<span class="green-text">Changed Video!</span>' });
	});
}

const onPlayerReady = event => {
	player.playVideo();

	socket.on('updateState', data => {
		const state = player.getPlayerState();
		const time = player.getCurrentTime();

		// Make the video smoother
		if (time !== data.time) player.seekTo(data.time, true);
		if (data.state === YT.PlayerState.PLAYING) player.playVideo();
		else player.pauseVideo();

		recentlyUpdated = true;
		setTimeout(() => recentlyUpdated = false, 100);
	});
};

const onPlayerStateChange = event => {
	const time = player.getCurrentTime();

	// Prevent the state from spam updating
	if (recentlyUpdated) return;
	if (event.data === prevState) return;
	// Only update if skipped ahead atleast 1 second
	if (!(time - prevTime > 1 && time - prevTime < 1)) return;

	socket.emit('stateChange', {
		state: event.data,
		time
	});
};

socket.on('error', data => M.toast({ html: `<span class="red-text">Error: ${data.error}</span>` }));
socket.on('connect', () => {
	M.toast({ html: '<span class="green-text">Connected to server!</span>' });
	roomId.innerText = socket.id;
});
socket.on('disconnect', () => M.toast({ html: '<span class="yellow-text">Disconnected from server</span>' }));
socket.on('currentRoom', room => {
	socket.id === room ? currentRoomId.innerText = 'Your Room' : currentRoomId.innerText = room;
	M.toast({ html: '<span class="green-text">Joined Room!</span>' });
});