var noSleep = new NoSleep();

const SERVER_URI = 'http://backtogetherfm-server-7ff91a13ede0.herokuapp.com';
// const SERVER_URI = 'http://localhost:9876';
const RED = 'red';
const BLUE = 'blue';
const GREEN = 'green';
const LIVE_COLOR_OPAQUE = '#ffb100ba';
const LIVE_COLOR_TRANSPARENT = '#ffb10042';
const AUDIO_PLAYER_ID = 'hls-audio';
const CHANNEL_DIRECTORY = {
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

var currentChannel, channelBackward, channelForward;
var initializedRadioControls, userInitiatedPlayback = false;

const getAudioPlayer = () => {
  return document.getElementById(AUDIO_PLAYER_ID);
}

const getStreamableChannels = async () => {
  const streamableChannels = await fetch(`${SERVER_URI}/getStreamableChannels`,
    {
      method: 'GET',
      headers: new Headers({ "ngrok-skip-browser-warning": "69420" })
    }
  )
    .then(response => response.json())
    .catch(error => throwError(error, 'Connection failed (code 1).'));
  return Object.keys(streamableChannels);
}

const currentChannelIsPlaying = () => {
  return !getAudioPlayer().paused;
}

const stopAudioPlayback = () => {
  const audioPlayer = getAudioPlayer();
  audioPlayer.pause();
  noSleep.disable();
}

// In this function, we promisify callback-based APIs needed for initializing.
// This allows us to wait until <audio> has actually started playing.
const startAudioPlayback = async () => {
  if (!userInitiatedPlayback) userInitiatedPlayback = true;
  // Is current channel broadcasting?
  const audioPlayer = getAudioPlayer();

  const streamFilename = await fetch(`${SERVER_URI}/stream/${currentChannel}`,
    {
      method: 'POST',
      headers: new Headers({ "ngrok-skip-browser-warning": "69420" })
    }
  )
    .then(response => response.text())
    .catch(error => throwError(error, 'Connection failed (code 1).'));
  const streamPath = `${SERVER_URI}/${streamFilename}`;

  if (Hls.isSupported()) {
    const initializeHlsJs = () => {
      return new Promise((resolve, reject) => {
        const hls = new Hls();
        hls.loadSource(streamPath);
        hls.attachMedia(audioPlayer);
        hls.on(Hls.Events.MANIFEST_PARSED, async () => {
          await audioPlayer.play();
          resolve();
        });
      });
    }

    await initializeHlsJs();
  } else if (audioPlayer.canPlayType('application/vnd.apple.mpegurl')) {
    const initializeNativeHls = () => {
      return new Promise((resolve, reject) => {
        audioPlayer.addEventListener('loadedmetadata', async () => {
          await audioPlayer.play();
          resolve();
        });
        audioPlayer.src = streamPath;
      });
    };

    await initializeNativeHls();
  } else {
    console.error('HLS.js is not supported in this browser.');
  }
}

// Called when new channel information is received from the broadcasting server
const subscribe = async (channel) => {
  console.log('subscribe');

  var reinitialize = false;
  if (!currentChannel && initializedRadioControls) {
    currentChannel = channel;
    reinitialize = true;
  }

  if (userInitiatedPlayback && channel === currentChannel) {
    await startAudioPlayback();
  }

  updateRadioControls(reinitialize ? 'INITIALIZE' : null);
}

const unsubscribe = async (channel) => {
  console.log('unsubscribe');

  if (channel === currentChannel) {
    pause();

    const streamableChannels = await getStreamableChannels();
    if (streamableChannels?.length) {
      // Otherwise, let the normal updateRadioControls() in pause() display the proper message.
      displayLoading('IN_PROGRESS', 'Channel broadcast ended.');
    } else {
      displayLoading('IN_PROGRESS', 'Broadcast ended. Wait for the next event!');
    }
  } else {
    updateRadioControls();
  }
}

const pause = () => {
  stopAudioPlayback();
  updateRadioControls();
}

// channel: RED | BLUE | GREEN
const playChannel = async (channel) => {
  if (currentChannel !== channel) {
    stopAudioPlayback();
    currentChannel = channel;
  }

  await startAudioPlayback();
  updateRadioControls();
  noSleep.enable();
}

// type: 'NONE' | 'IN_PROGRESS' | 'ERROR' | 'WARNING'
// message: String
const displayLoading = (type, message = null) => {
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
const throwError = (error, customMessage) => {
  const fullErrorMessage = `${customMessage}\n\n ${error}`;
  displayLoading('ERROR', fullErrorMessage);
  throw new Error(fullErrorMessage);
}

// type: 'INITIALIZE' | null
const updateRadioControls = async (type) => {
  if (!initializedRadioControls && type !== 'INITIALIZE') return;
  if (!initializedRadioControls) initializedRadioControls = true;

  const streamableChannels = await getStreamableChannels();
  console.log(`streamableChannels: ${streamableChannels}`);
  if (!streamableChannels?.length) {
    document.getElementById("radio-controls").style.display = 'none';
    document.getElementById("sunburst").style.background = 'none';
    document.getElementById("sunburst2").style.background = 'none';
    document.getElementById("page").style.background = '#fff7dd';
    displayLoading('ERROR', 'No current broadcast. Wait for the next event!');
    return;
  }

  displayLoading('NONE');

  const otherStreamableChannels = streamableChannels.filter(channel => channel !== currentChannel);
  if (!otherStreamableChannels?.length) {
    channelBackward = null;
    channelForward = null;
  } else if (otherStreamableChannels.length === 1) {
    channelBackward = null;
    channelForward = otherStreamableChannels[0];
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

  var currentColorOpaque = CHANNEL_DIRECTORY[currentChannel].colorOpaque;
  var currentColorTransparent = CHANNEL_DIRECTORY[currentChannel].colorTransparent;

  if (!channelBackward && !channelForward) {
    currentColorOpaque = LIVE_COLOR_OPAQUE;
    currentColorTransparent = LIVE_COLOR_TRANSPARENT;
  }

  if (channelBackward && type !== 'INITIALIZE') {
    document.getElementById("channel-backward").style.color = CHANNEL_DIRECTORY[channelBackward].colorOpaque;
    document.getElementById("channel-backward").style.visibility = 'visible';
  } else {
    document.getElementById("channel-backward").style.visibility = 'hidden';
  }

  if (channelForward && type !== 'INITIALIZE') {
    document.getElementById("channel-forward").style.color = CHANNEL_DIRECTORY[channelForward].colorOpaque;
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
    if (streamableChannels.includes(currentChannel)) {
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

const initialize = async () => {
  document.getElementById("play").addEventListener("click", () => playChannel(currentChannel));
  document.getElementById("pause").addEventListener("click", pause);
  document.getElementById("channel-backward").addEventListener("click", () => playChannel(channelBackward));
  document.getElementById("channel-forward").addEventListener("click", () => playChannel(channelForward));
  getAudioPlayer().addEventListener('ended', () => unsubscribe(currentChannel));

  const streamableChannels = await getStreamableChannels();
  currentChannel = streamableChannels[Math.floor(Math.random() * streamableChannels.length)];
  subscribe(currentChannel);
  updateRadioControls('INITIALIZE');
}

initialize();
