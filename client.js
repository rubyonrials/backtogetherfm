const livekit = require('livekit-client');

function handleTrackSubscribed(track, publication, participant) {
  if (track.kind === livekit.Track.Kind.Video || track.kind === livekit.Track.Kind.Audio) {
    // attach it to a new HTMLVideoElement or HTMLAudioElement
    const element = track.attach();
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

const response = await fetch('localhost:8080/issue-tokens', {
    method: 'GET' });

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
const channelTokens = [null, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2NzM0ODY3NzIsImlzcyI6ImRldmtleSIsIm5hbWUiOiJtb2JpbGUiLCJuYmYiOjE2NzM0MDAzNzIsInN1YiI6Im1vYmlsZSIsInZpZGVvIjp7InJvb20iOiJyZWQiLCJyb29tSm9pbiI6dHJ1ZX19.1_iBdk9fQttl-aM69UVt_ccj3eSAGk4qgWuyC_CtXM4', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2NzM0OTEzODMsImlzcyI6ImRldmtleSIsIm5hbWUiOiJtb2JpbGUiLCJuYmYiOjE2NzM0MDQ5ODMsInN1YiI6Im1vYmlsZSIsInZpZGVvIjp7InJvb20iOiJncmVlbiIsInJvb21Kb2luIjp0cnVlfX0.CoL5TIiI9Q_JuOmYUdBPI5NIIAj43DlPtzVl23B-XWU', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2NzM0OTEzMzYsImlzcyI6ImRldmtleSIsIm5hbWUiOiJtb2JpbGUiLCJuYmYiOjE2NzM0MDQ5MzYsInN1YiI6Im1vYmlsZSIsInZpZGVvIjp7InJvb20iOiJibHVlIiwicm9vbUpvaW4iOnRydWV9fQ.B_SNLYiwKxUal9yNa2uYcPgQNcx_ObPpLSwIMzCGLKo'];
// i think the server needs to generate these tokens on the fly, one per user, per room
var currentChannel = Math.floor(Math.random() * 3) + 1;
var channelUp, channelDown, audio;

function pause() {
  document.getElementById("pause").style.display = 'none';
  document.getElementById("play").style.display = 'block';
  document.getElementById("sunburst").style.background = 'none';
  document.getElementById("sunburst2").style.background = 'none';

  lkroom.disconnect();
}

function changeChannel(channel) {
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

  lkroom.connect('ws://localhost:7880', channelTokens[currentChannel]);
}

document.getElementById("play").addEventListener("click", () => changeChannel(currentChannel));
document.getElementById("pause").addEventListener("click", pause);
document.getElementById("channel-up").addEventListener("click", () => changeChannel(channelUp));
document.getElementById("channel-down").addEventListener("click", () => changeChannel(channelDown));
