const livekit = require('livekit-client');
const tokenServerURI = 'https://3b9e-157-131-123-98.ngrok.io';
const webrtcURI = 'wss://a291-157-131-123-98.ngrok.io';

const redChannel = new livekit.Room({ adaptiveStream: true, dynacast: true });
const blueChannel = new livekit.Room({ adaptiveStream: true, dynacast: true });
const greenChannel = new livekit.Room({ adaptiveStream: true, dynacast: true });
redChannel
  .on(livekit.RoomEvent.TrackSubscribed, (track, publication, participant) => handleTrackSubscribed('red', track, publication, participant))
  .on(livekit.RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed)
  .on(livekit.RoomEvent.Disconnected, handleDisconnect)
  .on(livekit.RoomEvent.LocalTrackUnpublished, handleLocalTrackUnpublished);
blueChannel
  .on(livekit.RoomEvent.TrackSubscribed, (track, publication, participant) => handleTrackSubscribed('blue', track, publication, participant))
  .on(livekit.RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed)
  .on(livekit.RoomEvent.Disconnected, handleDisconnect)
  .on(livekit.RoomEvent.LocalTrackUnpublished, handleLocalTrackUnpublished);
greenChannel
  .on(livekit.RoomEvent.TrackSubscribed, (track, publication, participant) => handleTrackSubscribed('green', track, publication, participant))
  .on(livekit.RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed)
  .on(livekit.RoomEvent.Disconnected, handleDisconnect)
  .on(livekit.RoomEvent.LocalTrackUnpublished, handleLocalTrackUnpublished);

const channelColors = [null, '#dc322fba', '#429900ba', '#268bd2ba'];
const channelColorsTransparent = [null, '#dc322f42', '#45ff0042', '#268bd242'];
const channelDirectory = [null, 'red', 'green', 'blue'];
var currentChannel = Math.floor(Math.random() * 3) + 1;
var channelUp, channelDown, audio;

function handleTrackSubscribed(channel, track, publication, participant) {
  if (track.kind !== livekit.Track.Kind.Audio) return;

  const existingChannelAudio = document.getElementById(`${channel}Audio`);
  if (existingChannelAudio) {
    document.getElementById("page").removeChild(existingChannelAudio);
  }

  const newChannelAudio = track.attach();
  newChannelAudio.setAttribute('id', `${channel}Audio`);
  if (channel !== channelDirectory[currentChannel]) {
    newChannelAudio.muted = true;
  }
  document.getElementById("page").appendChild(newChannelAudio);
}

function handleTrackUnsubscribed(track, publication, participant) {
  track.detach();
}

function handleLocalTrackUnpublished(track, participant) {
  track.detach();
}

function handleDisconnect() {
  console.log('disconnected from room');
}

function muteCurrentChannel() {
  const currentChannelAudio = document.getElementById(`${channelDirectory[currentChannel]}Audio`)
  currentChannelAudio.muted = true;
  currentChannelAudio.pause();
}

async function playCurrentChannel() {
  if (currentChannel == 1) {
    await redChannel.startAudio();
  } else if (currentChannel == 2) {
    await greenChannel.startAudio();
  } else {
    await blueChannel.startAudio();
  }
}

function pause() {
  document.getElementById("pause").style.display = 'none';
  document.getElementById("play").style.display = 'block';
  document.getElementById("sunburst").style.background = 'none';
  document.getElementById("sunburst2").style.background = 'none';

  muteCurrentChannel();
}

async function changeChannel(channel) {
  if (currentChannel !== channel) {
    muteCurrentChannel();
    currentChannel = channel;
  }

  if (currentChannel == 1) {
    channelUp = 2;
    channelDown = 3;
  } else if (currentChannel == 2) {
    channelUp = 3;
    channelDown = 1;
  } else {
    channelUp = 1;
    channelDown = 2;
  }

  document.getElementById("channel-up").style.color = channelColors[channelUp];
  document.getElementById("channel-down").style.color = channelColors[channelDown];
  document.getElementById("page").style.background = `radial-gradient(circle at center, #f7f3ea 25%, ${channelColors[currentChannel]} 81%)`;
  document.getElementById("sunburst").style.background = `repeating-conic-gradient( #ababab 0deg, ${channelColorsTransparent[currentChannel]} 1deg, #ababab 2deg, #ababab00 3deg)`;
  document.getElementById("sunburst2").style.background = `repeating-conic-gradient(#ababab00 0deg, ${channelDirectory[currentChannel]} 3deg)`;

  document.getElementById("play").style.display = 'none';
  document.getElementById("pause").style.display = 'block';
  document.getElementById("channel-up").style.visibility = 'visible';
  document.getElementById("channel-down").style.visibility = 'visible';

  playCurrentChannel();
}

async function init() {
  const response = await fetch(`${tokenServerURI}/issue-tokens`,
    {
      method: 'GET',
      headers: new Headers({ "ngrok-skip-browser-warning": "69420" })
    }
  )
    .then(response => response.json())
    .catch(error => {
      document.getElementById("loading").innerHTML = 'Connection failed.';
      document.getElementById("loading").style.color = 'red';
      throw new Error('BackTogether.FM encountered an error. Please contact Matt.')
    });

  const redConnect = redChannel.connect(webrtcURI, response['red']);
  const blueConnect = blueChannel.connect(webrtcURI, response['blue']);
  const greenConnect =  greenChannel.connect(webrtcURI, response['green']);
  await Promise.all([redConnect, blueConnect, greenConnect]);

  document.getElementById("loading").style.display = 'none';
  document.getElementById("play").style.display = 'block';
  document.getElementById("play").addEventListener("click", () => changeChannel(currentChannel));
  document.getElementById("pause").addEventListener("click", pause);
  document.getElementById("channel-up").addEventListener("click", () => changeChannel(channelUp));
  document.getElementById("channel-down").addEventListener("click", () => changeChannel(channelDown));
}
init();
