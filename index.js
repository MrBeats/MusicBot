// Imports
//import { log } from './logging.js';

const Discord = require("discord.js");
const { prefix, token } = require("./config.json");
const ytdl = require("ytdl-core");

const client = new Discord.Client();
client.login(token);
const queue = new Map();

client.once("ready", () => {
  console.log("Ready!");
  client.user.setActivity('!help', { type: 'WATCHING' })
});

client.once("reconnecting", () => {
  console.log("Reconnecting!");
});

client.once("disconnect", () => {
  console.log("Disconnect!");
});

client.on("message", async message => {
  if (message.author.bot) return;
  if (!message.content.startsWith(prefix)) return;

  const serverQueue = queue.get(message.guild.id);

  if (message.content.startsWith(`${prefix}play`)) {
    execute(message, serverQueue);
    return;
  } else if (message.content.startsWith(`${prefix}skip`)) {
    skip(message, serverQueue);
    return;
  } else if (message.content.startsWith(`${prefix}stop`)) {
    stop(message, serverQueue);
    return;
  } else if (message.content.startsWith(`${prefix}help`)) {
    message.channel.send(">>> Heyho!\nHier eine kleine Übersicht meiner Möglichkeiten:\n***!play <Youtube-Link>*** startet einfach die Wiedergabe oder fügt andere Songs der Wiedergabeliste hinzu\n***!pause*** pausiert die aktuelle Wiedergabe\n***!resume*** fuehrt die pausierte Wiedergabe fort\n***!skip*** überspringt einen Song\n***!stop*** beendet einfach die Wiedergabe und ich verlasse dich wieder\nViel Spaß:)")
    return;
  } else if (message.content.startsWith(`${prefix}pause`)) {
    pause(message, serverQueue);
    return;
  } else if (message.content.startsWith(`${prefix}resume`)) {
    resume(serverQueue);
    return;
  } else {
    message.channel.send("Du musst ein gültiges Kommando eingeben!");
  }
});

async function execute(message, serverQueue) {
  //console.log(message)
  const args = message.content.split(" ");
  //console.log(args.length)
  if (args.length === 1) {
    console.log('LOG!')
    return message.channel.send("Kein Youtube-Link angegeben!")
    }

  const voiceChannel = message.member.voice.channel;
  if (!voiceChannel)
    return message.channel.send(
      "Du musst in einem Sprachchannel sein, um Musik spielen zu können!"
    );
  const permissions = voiceChannel.permissionsFor(message.client.user);
  if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
    return message.channel.send(
      "Ich benötige die Berechtigung, dem Channel zu joinen und dort Musik zu spielen!"
    );
  }
  const songInfo = await ytdl.getInfo(args[1].toString());
  const song = {
    title: songInfo.title,
    url: songInfo.video_url
  };

  if (!serverQueue) {
    const queueContruct = {
      textChannel: message.channel,
      voiceChannel: voiceChannel,
      connection: null,
      songs: [],
      volume: 5,
      playing: true
    };

    queue.set(message.guild.id, queueContruct);

    queueContruct.songs.push(song);

    try {
      var connection = await voiceChannel.join();
      //console.log(connection)
      queueContruct.connection = connection;
      play(message.guild, queueContruct.songs[0]);
    } catch (err) {
      console.log(err.message);
      queue.delete(message.guild.id);
      return message.channel.send(err);
    }
  } else {
    serverQueue.songs.push(song);
    return message.channel.send(`${song.title} wurde der Wiedergabeliste hinzugefügt!`);
  }
}

function skip(message, serverQueue) {
  if (!message.member.voice.channel)
    return message.channel.send(
      "Du musst in einem Sprachchannel sein, um Musik überspringen zu können!"
    );
  if (!serverQueue)
    return message.channel.send("Die Wiedergabeliste ist leer!");
  serverQueue.connection.dispatcher.end();
}

function stop(message, serverQueue) {
  if (!message.member.voice.channel)
    return message.channel.send(
      "Du musst in einem Sprachchannel sein, um Musik stoppen zu können!"
    );
  serverQueue.songs = [];
  serverQueue.connection.dispatcher.end();
}

function pause(message, serverQueue){
  serverQueue.connection.dispatcher.pause();
}

function resume(serverQueue){
  serverQueue.connection.dispatcher.resume();
}

function play(guild, song) {
  const serverQueue = queue.get(guild.id);
  if (!song) {
    serverQueue.voiceChannel.leave();
    queue.delete(guild.id);
    return;
  }
  console.log(typeof song.url)
  console.log(song.url)
  const dispatcher = serverQueue.connection
    .play(ytdl(song.url))
    .on("finish", () => {
      serverQueue.songs.shift();
      play(guild, serverQueue.songs[0]);
    })
    .on("error", error => console.error(error));
  dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
  serverQueue.textChannel.send(`Starte mit der Wiedergabe von: **${song.title}**`);
}