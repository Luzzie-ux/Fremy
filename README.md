_This Project was made by Luzzie-ux (https://github.com/Luzzie-ux)_

# Fremy - the Discord.js Framework for making your Bots

The entire idea behind Fremy was to make Discord Bots easy
while also learning JavaScript/Typescript in the process

With it comes a simple way of starting your bot
without needing much work or experience with Js

It is reccomended that one has learned the fundamentals
when it comes to working with anything related to JavaScript.

The only requirements however is a .json file like the example below:

´´´json
{
"token": "your token goes here",
"intents": ["Guilds", "GuildMessages", "...", "etc"],
"clientId": "your bot's ID goes here",
"guildId": "your server's ID goes here",
"extra stuff": "goes here"
}
´´´

The only actual necessary value to create a Fremy instance
is the bot token provided by discord,
intents, clientId, and guildId will be defaulted to: - intents = [Guilds, GuildMessages], - clientId = "", - guildId = "".

It is advised to only use ECMAScript style imports when
dealing with command and event loading with Fremy.loadCmds("relative/path/to/dir");

Otherwise, test with CJS imports by explicitaly requiring your files:

´´´javascript
const {YourCommand} = require("your/command/file.js");
´´´

## The startClient() method

if you want to start your client, you are going to need: - your token, - real clientId, - Client instance
The guildId is optional in every case because it only dictates where the commands are gonna be avaible.

In case your clientId is blank, you can just do: `<your-bot>.cliendId = "Your bot ID"`.
then you can just: `await <your-bot>.startClient();`

the startClient method takes an optional boolean argument, that decides wether
default events and commands will be loaded, true loads them, false doesnt.

It will also register all the commands that are loaded and deploy all events.

For a first time it is reccomended that you do the following:

```
import {Fremy} from "Fremy";
import config from "config.json" with {type: "json"};

const bot = new Fremy(config);
bot.createClient();
await bot.startClient();

```
