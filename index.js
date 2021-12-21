const fs = require("fs");
const path = require("path");
const { Client, Collection, Intents } = require("discord.js");
const { token } = require("./config.json");
const { UpdateProcess } = require("./commands/elite");

const client = new Client({ intents: [Intents.FLAGS.GUILDS] });
let builds = {};
let skills = {};
let elites = {};

if (!fs.existsSync(path.join(__dirname, "./data/builds.json"))) {
	builds = { channelId: "", messageId: "", builds: [] };
	fs.writeFileSync(path.join(__dirname, "./data/builds.json"), JSON.stringify(builds));
}

if (!fs.existsSync(path.join(__dirname, "./data/skills.json"))) {
	skills = { channelId: "", messageId: "", skills: [] };
	fs.writeFileSync(path.join(__dirname, "./data/skills.json"), JSON.stringify(skills));
}

if (!fs.existsSync(path.join(__dirname, "./data/elites.json"))) {
	elites = { channelId: "", messageId: "", entries: [] };
	fs.writeFileSync(path.join(__dirname, "./data/elites.json"), JSON.stringify(elites));
}

client.commands = new Collection();
const commandFiles = fs.readdirSync("./commands").filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	client.commands.set(command.data.name, command);
}

client.once("ready", async () => {
	console.log("Ready!");
	if (process.argv[2] === "dev") {
		client.user.setActivity("Under Development", { type: "PLAYING" });
		client.user.setStatus("dnd");
	} else {
		client.user.setActivity("Fantus", { type: "WATCHING" });
		client.user.setStatus("online");
	}
	UpdateProcess(client);
});

client.on("interactionCreate", async (interaction) => {
	if (!interaction.isCommand()) return;

	if (process.argv[2] === "dev" && interaction.user.id !== "121080735187730434") {
		return interaction.reply({
			content: "Bot is being modified, Fantus will let you know when it is available again.",
			ephemeral: true,
		});
	}

	const command = client.commands.get(interaction.commandName);

	if (!command) return;

	try {
		await command.execute(interaction, client);
	} catch (error) {
		console.error(error);
		return interaction.reply({
			content: "There was an error while executing this command!",
			ephemeral: true,
		});
	}
});

client.login(token);
