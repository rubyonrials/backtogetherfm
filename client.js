const livekit = require('livekit-client');

function handleTrackSubscribed(track, publication, participant) {
  if (track.kind === livekit.Track.Kind.Audio) {
    // attach it to a new HTMLAudioElement
    const element = track.attach();
    // element.setAttribute('
    element.muted = true;
    document.getElementById("page").appendChild(element);
  }
}

function handleTrackUnsubscribed(track, publication, participant) {
  // remove tracks from all attached elements
  track.detach();
}

function handleLocalTrackUnpublished(track, participant) {
  // when local tracks are ended, update UI to remove them from rendering
  track.detach();
}

function handleDisconnect() {
  console.log('disconnected from room');
}

const lkroom = new livekit.Room({
  adaptiveStream: true,
  dynacast: true
});

lkroom
  .on(livekit.RoomEvent.TrackSubscribed, handleTrackSubscribed)
  .on(livekit.RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed)
  .on(livekit.RoomEvent.Disconnected, handleDisconnect)
  .on(livekit.RoomEvent.LocalTrackUnpublished, handleLocalTrackUnpublished);

const channelColors = [null, '#dc322fba', '#429900ba', '#268bd2ba'];
const channelColorsTransparent = [null, '#dc322f42', '#45ff0042', '#268bd242'];
const channelDirectory = [null, 'red', 'green', 'blue'];
var channelTokens;
var currentChannel = Math.floor(Math.random() * 3) + 1;
var channelUp, channelDown, audio;

function pause() {
  document.getElementById("pause").style.display = 'none';
  document.getElementById("play").style.display = 'block';
  document.getElementById("sunburst").style.background = 'none';
  document.getElementById("sunburst2").style.background = 'none';

  lkroom.disconnect();
}

async function changeChannel(channel) {
  if (currentChannel !== channel) {
    lkroom.disconnect();
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

  await lkroom.connect('wss://a291-157-131-123-98.ngrok.io', channelTokens[channelDirectory[currentChannel]]);
  await lkroom.startAudio();
}

async function init() {
  const response = await fetch('https://3b9e-157-131-123-98.ngrok.io/issue-tokens',
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

  channelTokens = response;
  document.getElementById("loading").style.display = 'none';
  document.getElementById("play").style.display = 'block';

  await lkroom.connect('wss://a291-157-131-123-98.ngrok.io', channelTokens[channelDirectory[currentChannel]]);
  // await lkroom.connect('wss://a291-157-131-123-98.ngrok.io', channelTokens[channelDirectory[2]]);
  // await lkroom.connect('wss://a291-157-131-123-98.ngrok.io', channelTokens[channelDirectory[3]]);

  document.getElementById("play").addEventListener("click", () => changeChannel(currentChannel));
  document.getElementById("pause").addEventListener("click", pause);
  document.getElementById("channel-up").addEventListener("click", () => changeChannel(channelUp));
  document.getElementById("channel-down").addEventListener("click", () => changeChannel(channelDown));
}
init();
