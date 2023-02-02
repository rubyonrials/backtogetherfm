// 1. Deploy client + server to production environment
// 2. Consider having "rooms" be long-lived / created by the server rather than the client on-join.
// 3. Consider saving JWT as cookie for individual participants to aid Livekit Cloud analytics (i.e. don't need to reissue an auth token every time your refresh... could be needless complication tho)
const livekit = require('livekit-client');
import NoSleep from 'nosleep.js';
var noSleep = new NoSleep();

const TOKEN_SERVER_URI = 'https://3b9e-157-131-123-98.ngrok.io';
const WEBRTC_SERVER_URI = 'wss://backtogetherfm.livekit.cloud';
const RED = 'red';
const BLUE = 'blue';
const GREEN = 'green';

var currentChannel, channelBackward, channelForward;
var initializedRadioControls, userInitiatedPlayback = false;

const liveColorOpaque = '#ffb100ba';
const liveColorTransparent = '#ffb10042';
const channelDirectory = {
  red: {
    colorOpaque:'#dc322fba',
    colorTransparent:'#dc322f42',
    order: 1
  },
  green: {
    colorOpaque:'#429900ba',
    colorTransparent:'#45ff0042',
    order: 2
  },
  blue: {
    colorOpaque:'#268bd2ba',
    colorTransparent:'#268bd242',
    order: 3
  }
}

var livekitCache = {
  red: {
    track: null,
    publication: null,
  },
  blue: {
    track: null,
    publication: null,
  },
  green: {
    track: null,
    publication: null,
  }
}

getBroadcastingChannels = () => {
  return Object.keys(livekitCache).filter(channel => {
    return !!livekitCache[channel].track && !!livekitCache[channel].publication
  });
}

currentChannelIsPlaying = () => {
  if (!livekitCache[currentChannel].publication) return false;
  return !livekitCache[currentChannel].publication.disabled;
}

removeExistingAudio = () => {
  // Removing the HTML5 <audio> element allows LiveKit to recycle
  // the element. When recycled, iOS doesn't require further user
  // interaction for subsequent audio playback.
  // This does not necessarily stop the audio from playing, strangely.
  const existingAudio = document.getElementById('livekit-audio');
  if (existingAudio) { existingAudio.remove() };
}

stopAudioPlayback = () => {
  removeExistingAudio();
  channelCache = livekitCache[currentChannel];
  if (channelCache.publication) channelCache.publication.setEnabled(false);
  noSleep.disable();
}

startAudioPlayback = (track) => {
  if (!userInitiatedPlayback) userInitiatedPlayback = true;

  removeExistingAudio();
  const newChannelAudio = track.attach();
  newChannelAudio.setAttribute('id', 'livekit-audio');
  newChannelAudio.setAttribute('title', 'BackTogether.FM'); // Lock screen text
  newChannelAudio.removeAttribute('autoplay');
  document.body.appendChild(newChannelAudio);
}

handleTrackSubscribed = (channel, track, publication, participant) => {
  console.log('Livekit:handleTrackSubscribed');
  if (track.kind !== livekit.Track.Kind.Audio) return;

  livekitCache[channel].track = track;
  livekitCache[channel].publication = publication;

  var reinitialize = false;
  if (!currentChannel && initializedRadioControls) {
    currentChannel = channel;
    reinitialize = true;
  }

  const existingAudio = document.getElementById('livekit-audio');
  if (existingAudio && userInitiatedPlayback && channel === currentChannel) {
    startAudioPlayback(track);
  } else {
    publication.setEnabled(false);
  }

  updateRadioControls(reinitialize ? 'INITIALIZE' : null);
}

handleTrackUnsubscribed = (channel, track, publication, participant) => {
  console.log('Livekit:handleTrackUnsubscribed');
  if (track.kind !== livekit.Track.Kind.Audio) return;

  livekitCache[channel].track = null;
  livekitCache[channel].publication = null;

  track.detach();

  if (channel === currentChannel) {
    pause();
    displayLoading('IN_PROGRESS', 'Channel broadcast ended.');
  } else {
    updateRadioControls();
  }
}

handleLocalTrackUnpublished = (track, participant) => {
  console.log('Livekit:handleLocalTrackUnpublished');
  track.detach();
}

handleDisconnect = () => {
  console.log('Livekit:handleDisconnect');
}

const redChannel = new livekit.Room({ adaptiveStream: true, dynacast: true });
const blueChannel = new livekit.Room({ adaptiveStream: true, dynacast: true });
const greenChannel = new livekit.Room({ adaptiveStream: true, dynacast: true });
redChannel
  .on(livekit.RoomEvent.TrackSubscribed, (track, publication, participant) => handleTrackSubscribed(RED, track, publication, participant))
  .on(livekit.RoomEvent.TrackUnsubscribed, (track, publication, participant) => handleTrackUnsubscribed(RED, track, publication, participant))
  .on(livekit.RoomEvent.Disconnected, handleDisconnect)
  .on(livekit.RoomEvent.LocalTrackUnpublished, handleLocalTrackUnpublished);
blueChannel
  .on(livekit.RoomEvent.TrackSubscribed, (track, publication, participant) => handleTrackSubscribed(BLUE, track, publication, participant))
  .on(livekit.RoomEvent.TrackUnsubscribed, (track, publication, participant) => handleTrackUnsubscribed(BLUE, track, publication, participant))
  .on(livekit.RoomEvent.Disconnected, handleDisconnect)
  .on(livekit.RoomEvent.LocalTrackUnpublished, handleLocalTrackUnpublished);
greenChannel
  .on(livekit.RoomEvent.TrackSubscribed, (track, publication, participant) => handleTrackSubscribed(GREEN, track, publication, participant))
  .on(livekit.RoomEvent.TrackUnsubscribed, (track, publication, participant) => handleTrackUnsubscribed(GREEN, track, publication, participant))
  .on(livekit.RoomEvent.Disconnected, handleDisconnect)
  .on(livekit.RoomEvent.LocalTrackUnpublished, handleLocalTrackUnpublished);

pause = () => {
  stopAudioPlayback();
  updateRadioControls();
}

// channel: RED | BLUE | GREEN
playChannel = async (channel) => {
  if (currentChannel !== channel) {
    stopAudioPlayback();
    currentChannel = channel;
  }

  channelCache = livekitCache[currentChannel];
  channelCache.publication.setEnabled(true);
  updateRadioControls();
  startAudioPlayback(channelCache.track);
  noSleep.enable();
}

// type: 'NONE' | 'IN_PROGRESS' | 'ERROR' | 'WARNING'
// message: String
displayLoading = (type, message = null) => {
  if (type === 'NONE') {
    document.getElementById("loading").style.display = 'none';
    document.getElementById("loading").innerHTML = '';
  } else {
    document.getElementById("loading").style.display = 'block';
    document.getElementById("loading").innerHTML = message;
  }

  if (type === 'IN_PROGRESS') {
    document.getElementById("loading").classList.add('blinking');
  } else {
    document.getElementById("loading").classList.remove('blinking');
  }

  if (type === 'ERROR') {
    document.getElementById("loading").style.color = 'red';
  } else {
    document.getElementById("loading").style.color = 'initial';
  }
}

// error: Error
// customMessage: String
throwError = (error, customMessage) => {
  const fullErrorMessage = `${customMessage}\n\n ${error}`;
  displayLoading('ERROR', fullErrorMessage);
  throw new Error(fullErrorMessage);
}

connectToLivekit = async () => {
  const response = await fetch(`${TOKEN_SERVER_URI}/issue-tokens`,
    {
      method: 'GET',
      headers: new Headers({ "ngrok-skip-browser-warning": "69420" })
    }
  )
    .then(response => response.json())
    .catch(error => throwError(error, 'Connection failed (code 1).'));

  const redConnect = redChannel.connect(WEBRTC_SERVER_URI, response[RED]);
  const blueConnect = blueChannel.connect(WEBRTC_SERVER_URI, response[BLUE]);
  const greenConnect =  greenChannel.connect(WEBRTC_SERVER_URI, response[GREEN]);
  await Promise.all([redConnect, blueConnect, greenConnect])
    .catch(error => throwError(error, 'Connection failed (code 2).'));
}

// type: 'INITIALIZE' | null
updateRadioControls = (type) => {
  if (!initializedRadioControls && type !== 'INITIALIZE') return;
  if (!initializedRadioControls) initializedRadioControls = true;

  const broadcastingChannels = getBroadcastingChannels();
  console.log(`livekitCache: ${JSON.stringify(livekitCache)}`);
  console.log(`broadcastingChannels: ${broadcastingChannels}`);
  if (!broadcastingChannels?.length) {
    document.getElementById("radio-controls").style.display = 'none';
    document.getElementById("sunburst").style.background = 'none';
    document.getElementById("sunburst2").style.background = 'none';
    document.getElementById("page").style.background = '#fff7dd';
    document.getElementById("live-marker").style.display = 'none';
    displayLoading('ERROR', 'No current broadcast. Wait for the next event!');
    return;
  }

  displayLoading('NONE');

  const otherBroadcastingChannels = broadcastingChannels.filter(channel => channel !== currentChannel);
  if (!otherBroadcastingChannels?.length) {
    channelBackward = null;
    channelForward = null;
  } else if (otherBroadcastingChannels.length === 1) {
    channelBackward = null;
    channelForward = otherBroadcastingChannels[0];
  } else {
    if (currentChannel === RED) {
      channelBackward = BLUE;
      channelForward = GREEN;
    } else if (currentChannel === GREEN) {
      channelBackward = RED;
      channelForward = BLUE;
    } else {
      channelBackward = GREEN;
      channelForward = RED;
    }
  }

  var currentColorOpaque = channelDirectory[currentChannel].colorOpaque;
  var currentColorTransparent = channelDirectory[currentChannel].colorTransparent;

  if (!channelBackward && !channelForward) {
    document.getElementById("live-marker").style.display = 'initial';
    currentColorOpaque = liveColorOpaque;
    currentColorTransparent = liveColorTransparent;
  } else {
    document.getElementById("live-marker").style.display = 'none';
  }

  if (channelBackward && type !== 'INITIALIZE') {
    document.getElementById("channel-backward").style.color = channelDirectory[channelBackward].colorOpaque;
    document.getElementById("channel-backward").style.visibility = 'visible';
  } else {
    document.getElementById("channel-backward").style.visibility = 'hidden';
  }

  if (channelForward && type !== 'INITIALIZE') {
    document.getElementById("channel-forward").style.color = channelDirectory[channelForward].colorOpaque;
    document.getElementById("channel-forward").style.visibility = 'visible';
  } else {
    document.getElementById("channel-forward").style.visibility = 'hidden';
  }

  if(currentChannelIsPlaying()) {
    document.getElementById("play").style.display = 'none';
    document.getElementById("pause").style.display = 'block';
    document.getElementById("page").style.background = `radial-gradient(circle at center, #f7f3ea 25%, ${currentColorOpaque} 81%)`;
    document.getElementById("sunburst").style.background = `repeating-conic-gradient( #ababab 0deg, ${currentColorTransparent} 1deg, #ababab 2deg, #ababab00 3deg)`;
    document.getElementById("sunburst2").style.background = `repeating-conic-gradient(#ababab00 0deg, ${currentChannel} 3deg)`;
  } else {
    if (broadcastingChannels.includes(currentChannel)) {
      document.getElementById("play").style.display = 'block';
    } else {
      document.getElementById("play").style.display = 'none';
    }
    document.getElementById("pause").style.display = 'none';
    document.getElementById("sunburst").style.background = 'none';
    document.getElementById("sunburst2").style.background = 'none';
  }

  document.getElementById("radio-controls").style.display = 'flex';
}

initialize = async () => {
  await connectToLivekit();

  document.getElementById("play").addEventListener("click", () => playChannel(currentChannel));
  document.getElementById("pause").addEventListener("click", pause);
  document.getElementById("channel-backward").addEventListener("click", () => playChannel(channelBackward));
  document.getElementById("channel-forward").addEventListener("click", () => playChannel(channelForward));

  // Give Livekit time to handleTrackSubscribed()
  await new Promise(r => setTimeout(r, 500));

  const broadcastingChannels = getBroadcastingChannels();
  currentChannel = broadcastingChannels[Math.floor(Math.random() * broadcastingChannels.length)];
  updateRadioControls('INITIALIZE');
}

initialize();
