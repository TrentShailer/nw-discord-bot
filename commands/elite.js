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

	return `${area.area} - ${timeMessage}\n`;
}

async function GetEntryMessage(entry) {
	let areas = ``;

	for (let area of entry.areas) {
		areas += GetAreaMessage(area);
	}

	return `${areas}`;
}

async function GetName() {
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
		.setFooter("*Use `/elite` and follow the prompts to add your cooldowns!*");

	for (let entry of data.entries) {
		embed = embed.addField(await GetName(members, entry), await GetEntryMessage(entry), true);
	}

	return embed;
}

async function SaveData(client) {
	fs.writeFileSync(path.join(__dirname, "../data/elites.json"), JSON.stringify(data, null, 2));

	let channels = client.channels.cache;
	let messages = channels.get(data.channelId).messages;
	await messages.fetch(data.messageId);
	let message = messages.cache.get(data.messageId);
	message.edit({ embeds: GetMessage(client) });
}

async function Update(interaction, client) {
	let channels = client.channels.cache;
	let messages = channels.get(data.channelId).messages;
	await messages.fetch(data.messageId);
	let message = messages.cache.get(data.messageId);
	message.edit({ embeds: GetMessage(client) });

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

		// Modify areas to update area that matches the name
		// to have an updated timestamp
		entry.areas = entry.areas.map((a) => {
			if (a.area === area) {
				a.timestamp = now.getTime() + 86400000;
			}
			return a;
		});

		// overwrite old entry with new one
		data.entries[index] = entry;

		await SaveData(client);
		return interaction.reply({ content: "Action Successful", ephemeral: true });
	}
}
