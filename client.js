// Multiple issues right now.
// 1. phone can't connect to webrtc server for some reason, even after stashing all changes from last time it was working
// 2. if any channel doesn't have any tracks on it, livekitCache breaks
// 3. occassionally parcel's auto-reload keeps playing a track even though it shouldn't (could be specific to parcel)
// 4. i should really transition to a deployed environment to get rid of ngrok issues...
const livekit = require('livekit-client');
import NoSleep from 'nosleep.js';
var noSleep = new NoSleep();

const tokenServerURI = 'https://3b9e-157-131-123-98.ngrok.io';
const webrtcURI = 'wss://backtogetherfm.livekit.cloud';

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

const channelColors = ['#ffb100ba', '#dc322fba', '#429900ba', '#268bd2ba'];
const channelColorsTransparent = ['#ffb10042', '#dc322f42', '#45ff0042', '#268bd242'];
const channelDirectory = ['yellow', 'red', 'green', 'blue'];
var currentChannel = Math.floor(Math.random() * 3) + 1;
// var currentChannel = 0;
var channelUp, channelDown;

var livekitCache = {
  'red': {
    'track': null,
    'publication': null,
  },
  'blue': {
    'track': null,
    'publication': null,
  },
  'green': {
    'track': null,
    'publication': null,
  }
}

function removeExistingAudio() {
  const existingAudio = document.getElementById('livekit-audio');
  if (existingAudio) { existingAudio.remove() };
}

function pauseCurrentAudio() {
  removeExistingAudio();
  // document.getElementById('debug').innerHTML = JSON.stringify(livekitCache);
  channelCache = livekitCache[channelDirectory[currentChannel]];
  channelCache['publication'].setEnabled(false);
  noSleep.disable();
}

function playAudio(track) {
  removeExistingAudio();
  const newChannelAudio = track.attach();
  newChannelAudio.setAttribute('id', 'livekit-audio');
  newChannelAudio.setAttribute('title', 'BackTogether.FM');
  newChannelAudio.removeAttribute('autoplay');
  document.body.appendChild(newChannelAudio);
}

function handleTrackSubscribed(channel, track, publication, participant) {
  if (track.kind !== livekit.Track.Kind.Audio) return;

  livekitCache[channel]['track'] = track;
  livekitCache[channel]['publication'] = publication;

  if (channel === channelDirectory[currentChannel]) {
    // If track is published to current channel, remove and attach (livekit will recyle the audio element)
    playAudio(track);
  } else {
    // if track is NOT in the current channel, add it to the cache of channel-track(s) to play, and set publication.setEnabled(false).
    // when changing the channel, subscribe to the latest channel-track, and publication.setEnabled(true)
    publication.setEnabled(false);
  }
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

function playCurrentChannel() {
  // document.getElementById('debug').innerHTML = JSON.stringify(livekitCache);
  channelCache = livekitCache[channelDirectory[currentChannel]];
  // Need to handle the case where one or more channels is not publishing audio!

  channelCache['publication'].setEnabled(true);
  playAudio(channelCache['track']);
  noSleep.enable();
}

function pause() {
  document.getElementById("pause").style.display = 'none';
  document.getElementById("play").style.display = 'block';
  document.getElementById("sunburst").style.background = 'none';
  document.getElementById("sunburst2").style.background = 'none';

  pauseCurrentAudio();
}

async function changeChannel(channel) {
  if (currentChannel !== channel) {
    pauseCurrentAudio();
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

function throwError(error, customMessage) {
  const fullErrorMessage = `${customMessage}\n\n ${error}`;
  document.getElementById("loading").innerHTML = fullErrorMessage;
  document.getElementById("loading").style.color = 'red';
  document.getElementById("loading").classList.remove('blinking');
  throw new Error(fullErrorMessage);
}

async function init() {
  const response = await fetch(`${tokenServerURI}/issue-tokens`,
    {
      method: 'GET',
      headers: new Headers({ "ngrok-skip-browser-warning": "69420" })
    }
  )
    .then(response => response.json())
    .catch(error => throwError(error, 'Connection failed (code 1).'));

  const redConnect = redChannel.connect(webrtcURI, response['red']);
  const blueConnect = blueChannel.connect(webrtcURI, response['blue']);
  const greenConnect =  greenChannel.connect(webrtcURI, response['green']);
  await Promise.all([redConnect, blueConnect, greenConnect])
    .catch(error => throwError(error, 'Connection failed (code 2).'));

  document.getElementById("loading").style.display = 'none';
  document.getElementById("play").style.display = 'block';
  document.getElementById("play").addEventListener("click", () => changeChannel(currentChannel));
  document.getElementById("pause").addEventListener("click", pause);
  document.getElementById("channel-up").addEventListener("click", () => changeChannel(channelUp));
  document.getElementById("channel-down").addEventListener("click", () => changeChannel(channelDown));

  if(currentChannel === 0) {
    document.getElementById("channel-down").style.display = 'none';
    document.getElementById("channel-up").style.display = 'none';
    document.getElementById("live-marker").style.display = 'initial';
  }
}
init();
