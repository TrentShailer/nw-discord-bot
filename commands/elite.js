const { SlashCommandBuilder, SlashCommandSubcommandBuilder } = require("@discordjs/builders");
const fs = require("fs");
const path = require("path");

let data = require("../data/elites.json");
const { MessageEmbed } = require("discord.js");
const { default: axios } = require("axios");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("elite")
		.setDescription("Managing your elite POI cooldowns")
		.addSubcommand((subcommand) =>
			subcommand
				.setName("setchannel")
				.setDescription("Sets the channel to view your elite cooldowns")
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("reset")
				.setDescription("Reset the cooldown of an elite POI to 24 hours")
				.addStringOption((option) =>
					option
						.setName("area")
						.setDescription("What POI to reset.")
						.setRequired(true)
						.addChoices([
							["Caminus", "Caminus"],
							["Imperial Palace", "Imperial Palace"],
							["Malevolence", "Malevolence"],
							["Ambusti", "Ambusti"],
							["Eternal Pools", "Eternal Pools"],
							["Myrkguard", "Myrkguard"],
							["Forecastle", "Forecastle"],
							["Mangled Heights", "Mangled Heights"],
						])
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("track_ow_user")
				.setDescription("Start tracking a player who is using the overwolf app")
				.addStringOption((option) =>
					option
						.setName("name")
						.setDescription("The in-game name of the player to start tracking")
						.setRequired(true)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("untrack_ow_user")
				.setDescription("Stop tracking a player who is using the overwolf app")
				.addStringOption((option) =>
					option
						.setName("name")
						.setDescription("The in-game name of the player to stop tracking")
						.setRequired(true)
				)
		),
	async execute(interaction, client) {
		switch (interaction.options.getSubcommand()) {
			case "setchannel":
				return setchannel(interaction, client);
			case "reset":
				return reset(interaction, client);
			case "track_ow_user":
				return track(interaction, client);
			case "untrack_ow_user":
				return untrack(interaction, client);
		}
		return interaction.reply({
			content: "Invalid Subcommand",
			ephemeral: true,
		});
	},
	async UpdateProcess(client) {
		setInterval(async () => {
			if (data.messageId !== undefined && data.messageId !== "") {
				await UpdateEmbed(client);
			}
		}, 60000);
	},
};

async function UpdateEmbed(client) {
	let channels = client.channels.cache;
	let messages = channels.get(data.channelId).messages;
	await messages.fetch(data.messageId);
	let message = messages.cache.get(data.messageId);
	let content = await GetEmbed(client);
	message.edit({ embeds: [content] });
}

async function GetName(members, entry) {
	await members.fetch(entry.userId);
	let member = members.cache.get(entry.userId);
	let name = member ? member.displayName : "undefined";

	return `**${name}**`;
}

async function GetEmbed(client) {
	await client.channels.fetch(data.channelId);
	let channel = client.channels.cache.get(data.channelId);
	let members = channel.guild.members;

	let embed = new MessageEmbed()
		.setColor("#e53935")
		.setTitle("Elite POI Cooldowns")
		.setFooter(
			"Use `/elite` and follow the prompts to add your cooldowns!\nUse `/elite track_ow_user` to track your cooldowns if you use the overwolf app"
		);

	let entriesWithName = [];

	for (let entry of data.entries) {
		let name = await GetName(members, entry);
		entriesWithName.push({ name: name, areas: entry.areas });
	}

	let response = await axios.post("https://cooldowns.trentshailer.com/fetch", {
		names: data.ow_names,
	});

	if (response.data) {
		for (let i = 0; i < response.data.length; i++) {
			entriesWithName.push(await ConvertOWToStandard(response.data[i]));
		}
	}

	let sortedEntries = entriesWithName.sort((a, b) => {
		let nameA = a.name;
		let nameB = b.name;
		if (nameA < nameB) return -1;
		if (nameA > nameB) return 1;
		return 0;
	});

	for (let i = 1; i <= sortedEntries.length; i++) {
		let sortedEntry = sortedEntries[i - 1];
		let entryMessage = await GetEntryMessage(sortedEntry);
		if (entryMessage === undefined || entryMessage === "") continue;
		embed.addField(sortedEntry.name, entryMessage, true);
	}

	return embed;
}

function GetAreaMessage(area) {
	let now = Date.now();
	let diff = area.timestamp - now;
	if (diff < 0) {
		return ``;
	}
	let hours = Math.floor(diff / 3600000);
	let minutes = Math.floor((diff - hours * 3600000) / 60000);

	let timeMessage = `${hours > 0 ? `${hours}h ` : ``}${minutes > 0 ? `${minutes}m` : ``}`;
	if (timeMessage === "") {
		timeMessage = "< 1m";
	}

	return `\`${area.area}???${timeMessage}\`\n`;
}

async function GetEntryMessage(entry) {
	let areas = ``;

	let sortedAreas = entry.areas.sort((a, b) => {
		let nameA = a.area;
		let nameB = b.area;
		if (nameA < nameB) return -1;
		if (nameA > nameB) return 1;
		return 0;
	});

	for (let area of sortedAreas) {
		areas += GetAreaMessage(area);
	}

	return `${areas}`;
}

async function ConvertOWToStandard(entry) {
	let areas = [];

	areas = entry.POIs.map((item) => {
		return {
			area: idToName(item.id),
			timestamp: item.timestamp,
		};
	});

	return {
		name: `**${entry.player_name}**`,
		areas: areas,
	};
}

async function setchannel(interaction, client) {
	let permissions = interaction.memberPermissions;
	if (!permissions.has("ADMINISTRATOR"))
		return interaction.reply({
			content: "You need administrator permissions to use this command",
			ephemeral: true,
		});
	const channelId = interaction.channelId;

	data.channelId = channelId;

	let content = await GetMessage(client);
	let message = await client.channels.cache.get(channelId).send({ embeds: [content] });

	const messageId = message.id;

	data.messageId = messageId;

	SaveData(client);
	interaction.reply({ content: "Elites will now be displayed here", ephemeral: true });
}

function idToName(id) {
	switch (id) {
		case "myrkguard":
			return "Myrkguard";
		case "malevolence":
			return "Malevolence";
		case "scorched":
			return "Scorched Mines";
		case "forecastle":
			return "Forecastle";
		case "eternal":
			return "Eternal Pools";
		case "imperial":
			return "Imperial Palace";
		case "mangled":
			return "Mangled Heights";
		case "caminus":
			return "Caminus";
		default:
			return "ERROR";
	}
}

async function SaveData(client) {
	fs.writeFileSync(path.join(__dirname, "../data/elites.json"), JSON.stringify(data, null, 2));

	UpdateEmbed(client);
}

async function reset(interaction, client) {
	const area = interaction.options.get("area").value;
	const userId = interaction.user.id;

	const now = new Date();

	if (
		data.entries.filter((entry) => {
			return entry.userId === userId;
		}).length === 0
	) {
		// Push a new user with their elite zone and timestamp to data
		data.entries.push({
			userId: userId,
			areas: [{ area: area, timestamp: now.getTime() + 86400000 }],
		});
		await SaveData(client);
		return interaction.reply({ content: "Action Successful", ephemeral: true });
	} else {
		// Get the index of this user
		let index = data.entries.findIndex((entry) => entry.userId === userId);
		// get their entry
		let entry = data.entries[index];

		if (entry.areas.filter((a) => a.area === area).length === 0) {
			entry.areas.push({ area: area, timestamp: now.getTime() + 86400000 });
		} else {
			// Modify areas to update area that matches the name
			// to have an updated timestamp
			entry.areas = entry.areas.map((a) => {
				if (a.area === area) {
					a.timestamp = now.getTime() + 86400000;
				}
				return a;
			});
		}

		// overwrite old entry with new one
		data.entries[index] = entry;

		await SaveData(client);
		return interaction.reply({ content: "Action Successful", ephemeral: true });
	}
}

async function track(interaction, client) {
	const name = interaction.options.get("name").value;

	if (data.ow_names.includes(name)) {
		return interaction.reply({ content: "Already Tracked", ephemeral: true });
	}

	data.ow_names.push(name);
	await SaveData(client);

	return interaction.reply({ content: "Action Successful", ephemeral: true });
}

async function untrack(interaction, client) {
	const name = interaction.options.get("name").value;

	data.ow_names = data.ow_names.filter((item) => item !== name);
	await SaveData(client);

	return interaction.reply({ content: "Action Successful", ephemeral: true });
}
