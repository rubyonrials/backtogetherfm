// 1. Rewrite the UI to be declaritive (create-react-app, maybe next.js? ask daws)
// 2. Handle tracks stopping, one or more channels being unavailable for broadcast.
// 3. Deploy client + server to production environment
// 4. Consider having "rooms" be long-lived / created by the server rather than the client on-join.
// 5. Consider saving JWT as cookie for individual participants to aid Livekit Cloud analytics (i.e. don't need to reissue an auth token every time your refresh... could be needless complication tho)
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
  .on(livekit.RoomEvent.TrackUnsubscribed, (track, publication, participant) => handleTrackUnsubscribed('red', track, publication, participant))
  .on(livekit.RoomEvent.Disconnected, handleDisconnect)
  .on(livekit.RoomEvent.LocalTrackUnpublished, handleLocalTrackUnpublished);
blueChannel
  .on(livekit.RoomEvent.TrackSubscribed, (track, publication, participant) => handleTrackSubscribed('blue', track, publication, participant))
  .on(livekit.RoomEvent.TrackUnsubscribed, (track, publication, participant) => handleTrackUnsubscribed('blue', track, publication, participant))
  .on(livekit.RoomEvent.Disconnected, handleDisconnect)
  .on(livekit.RoomEvent.LocalTrackUnpublished, handleLocalTrackUnpublished);
greenChannel
  .on(livekit.RoomEvent.TrackSubscribed, (track, publication, participant) => handleTrackSubscribed('green', track, publication, participant))
  .on(livekit.RoomEvent.TrackUnsubscribed, (track, publication, participant) => handleTrackUnsubscribed('green', track, publication, participant))
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
  // Removing the HTML5 <audio> element allows LiveKit to recycle
  // the element. When recycled, iOS doesn't require further user
  // interaction for subsequent audio playback.
  // This does not necessarily stop the audio from playing, strangely.
  const existingAudio = document.getElementById('livekit-audio');
  if (existingAudio) { existingAudio.remove() };
}

function pauseCurrentAudio() {
  removeExistingAudio();
  // document.getElementById('debug').innerHTML = JSON.stringify(livekitCache);
  channelCache = livekitCache[channelDirectory[currentChannel]];
  if (channelCache['publication']) channelCache['publication'].setEnabled(false);
  noSleep.disable();
}

function playAudio(track) {
  removeExistingAudio();
  const newChannelAudio = track.attach();
  newChannelAudio.setAttribute('id', 'livekit-audio');
  newChannelAudio.setAttribute('title', 'BackTogether.FM'); // Lock screen text
  newChannelAudio.removeAttribute('autoplay');
  document.body.appendChild(newChannelAudio);
}

function handleTrackSubscribed(channel, track, publication, participant) {
  if (track.kind !== livekit.Track.Kind.Audio) return;

  livekitCache[channel]['track'] = track;
  livekitCache[channel]['publication'] = publication;

  if (channel === channelDirectory[currentChannel]) {
    // If track is published to current channel, remove and attach (livekit will recyle the audio element)
    // Only play the audio if something is currently playing (existing audio, i think). if we're paused, don't do anything
    const existingAudio = document.getElementById('livekit-audio');
    if (existingAudio) {
      playAudio(track);
    } else {
      // Add back the play button
      publication.setEnabled(false);
      document.getElementById("loading").style.display = 'none';
      document.getElementById("play").style.display = 'block';
    }
  } else {
    // if track is NOT in the current channel, add it to the cache of channel-track(s) to play, and set publication.setEnabled(false).
    // when changing the channel, subscribe to the latest channel-track, and publication.setEnabled(true)
    publication.setEnabled(false);
  }
}

function handleTrackUnsubscribed(channel, track, publication, participant) {
  if (track.kind !== livekit.Track.Kind.Audio) return;

  livekitCache[channel]['track'] = null;
  livekitCache[channel]['publication'] = null;

  track.detach();

  if (channel === channelDirectory[currentChannel]) {
    pause();
    // Remove the play button
    document.getElementById("loading").innerHTML = 'Channel broadcast ended.';
    document.getElementById("loading").classList.add('blinking');
    document.getElementById("loading").style.display = 'block';
    document.getElementById("play").style.display = 'none';
  }
  console.log('UNSUBSCRIBED');
}

function handleLocalTrackUnpublished(track, participant) {
  track.detach();
  console.log('UNPUBLISHED');
}

function handleDisconnect() {
  console.log('disconnected from room');
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

  channelCache = livekitCache[channelDirectory[currentChannel]];
  channelCache['publication'].setEnabled(true);
  playAudio(channelCache['track']);
  noSleep.enable();
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
  document.getElementById("radio-controls").style.display = 'flex';

  if(currentChannel === 0) {
    document.getElementById("channel-down").style.display = 'none';
    document.getElementById("channel-up").style.display = 'none';
    document.getElementById("live-marker").style.display = 'initial';
  }
}
init();
