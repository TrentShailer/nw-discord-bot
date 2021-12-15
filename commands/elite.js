const { SlashCommandBuilder, SlashCommandSubcommandBuilder } = require("@discordjs/builders");
const fs = require("fs");
const path = require("path");

let data = require("../data/elites.json");
const { MessageEmbed } = require("discord.js");

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
			subcommand.setName("update").setDescription("Updates the cooldown message")
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
							["Eternal Pool", "Eternal Pool"],
							["Myrkguard", "Myrkguard"],
							["Forecastle", "Forecastle"],
							["Mangled Heights", "Mangled Heights"],
						])
				)
		),
	async execute(interaction, client) {
		switch (interaction.options.getSubcommand()) {
			case "setchannel":
				return setchannel(interaction, client);
			case "update":
				return Update(interaction, client);
			case "reset":
				return reset(interaction, client);
		}
		return interaction.reply({
			content: "Invalid Subcommand",
			ephemeral: true,
		});
	},
	async UpdateProcess(client) {
		setInterval(async () => {
			if (data.messageId !== undefined && data.messageId !== "") {
				let channels = client.channels.cache;
				let messages = channels.get(data.channelId).messages;
				await messages.fetch(data.messageId);
				let message = messages.cache.get(data.messageId);
				let content = await GetMessage(client);
				message.edit({ embeds: [content] });
			}
		}, 60000);
	},
};

async function setchannel(interaction, client) {
	if (interaction.user.id !== "121080735187730434")
		return interaction.reply({
			content: "You don't have permission to do this",
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

function GetAreaMessage(area) {
	let now = new Date();
	let diff = area.timestamp - now.getTime();
	if (diff < 0) {
		return `${area.area} - Ready\n`;
	}
	let hours = Math.floor(diff / 3600000);
	let minutes = Math.floor((diff - hours * 3600000) / 60000);

	let timeMessage = `${hours > 0 ? `${hours}h ` : ``}${minutes > 0 ? `${minutes}m` : ``}`;

	return `\`${area.area} - ${timeMessage}\`\n`;
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

async function GetName(members, entry) {
	await members.fetch(entry.userId);
	let member = members.cache.get(entry.userId);
	let name = member ? member.displayName : "undefined";

	return `**${name}**`;
}

async function GetMessage(client) {
	await client.channels.fetch(data.channelId);
	let channel = client.channels.cache.get(data.channelId);
	let members = channel.guild.members;

	let embed = new MessageEmbed()
		.setColor("#e53935")
		.setTitle("Elite POI Cooldowns")
		.setFooter(
			"Use `/elite` and follow the prompts to add your cooldowns!\nReset your cooldown AFTER your run."
		);

	let entriesWithName = [];

	for (let entry of data.entries) {
		let name = await GetName(members, entry);
		entriesWithName.push({ name: name, userId: entry.userId, areas: entry.areas });
	}

	let sortedEntries = entriesWithName.sort((a, b) => {
		let nameA = a.name;
		let nameB = b.name;
		if (nameA < nameB) return -1;
		if (nameA > nameB) return 1;
		return 0;
	});

	for (let i = 1; i <= sortedEntries.length; i++) {
		let entry = sortedEntries[i - 1];
		embed.addField(await GetName(members, entry), await GetEntryMessage(entry), true);
		if (i % 2 === 0) embed.addField("\u200b", "\u200b");
	}

	return embed;
}

async function SaveData(client) {
	fs.writeFileSync(path.join(__dirname, "../data/elites.json"), JSON.stringify(data, null, 2));

	let channels = client.channels.cache;
	let messages = channels.get(data.channelId).messages;
	await messages.fetch(data.messageId);
	let message = messages.cache.get(data.messageId);
	let content = await GetMessage(client);
	message.edit({ embeds: [content] });
}
async function Update(interaction, client) {
	let channels = client.channels.cache;
	let messages = channels.get(data.channelId).messages;
	await messages.fetch(data.messageId);
	let message = messages.cache.get(data.messageId);
	let content = await GetMessage(client);
	message.edit({ embeds: [content] });

	interaction.reply({ content: "Action Successful", ephemeral: true });
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
