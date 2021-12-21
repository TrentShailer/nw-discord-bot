const { SlashCommandBuilder, SlashCommandSubcommandBuilder } = require("@discordjs/builders");
const fs = require("fs");
const path = require("path");

let data = require("../data/skills.json");
const { MessageEmbed } = require("discord.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("skill")
		.setDescription("Managing your crafting skills")
		.addSubcommand((subcommand) =>
			subcommand
				.setName("setchannel")
				.setDescription("Sets the channel to view your guild member's craft skills")
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("register")
				.setDescription("Register your craft skill level")
				.addStringOption((option) =>
					option
						.setName("type")
						.setDescription("What craft skill to register")
						.setRequired(true)
						.addChoices([
							["Weapon Smithing", "weaponsmithing"],
							["Armouring", "armouring"],
							["Engineering", "engineering"],
							["Jewelcrafting", "jewelcrafting"],
							["Arcana", "arcana"],
							["Cooking", "cooking"],
							["Furnishing", "furnishing"],
						])
				)
				.addIntegerOption((option) =>
					option.setName("level").setDescription("The skills level").setRequired(true)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("removeuser")
				.setDescription("Admin Only. Removes a user from the list.")
		),
	async execute(interaction, client) {
		switch (interaction.options.getSubcommand()) {
			case "setchannel":
				return setchannel(interaction, client);
			case "register":
				return register(interaction, client);
			case "removeUser":
				return removeUser(interaction, client);
		}
		return interaction.reply({
			content: "Invalid Subcommand",
			ephemeral: true,
		});
	},
};

async function GetSkillMessage(members, skill) {
	await members.fetch(skill.userId);
	let member = members.cache.get(skill.userId);
	let name = member ? member.displayName : "undefined";
	return `\`${name}\` — ${skill.level}\n`;
}

async function GetMessage(client) {
	await client.channels.fetch(data.channelId);
	let channel = client.channels.cache.get(data.channelId);
	let members = channel.guild.members;

	let embed = new MessageEmbed()
		.setColor("#1e88e5")
		.setTitle("Crafting Skill Levels")
		.setFooter(
			"Use `/skill` and follow the prompts to add your skill!\nSet level to 0 to remove it.\nMinimum level 150 required to be listed."
		);

	let entriesWithName = [];

	for (let skill of data.skills) {
		let name = await GetName(members, skill);
		entriesWithName.push({
			name: name,
			userId: skill.userId,
			type: skill.type,
			level: skill.level,
		});
	}

	let categories = {
		weaponsmithing: "",
		armouring: "",
		engineering: "",
		jewelcrafting: "",
		arcana: "",
		cooking: "",
		furnishing: "",
	};

	for (let skill of entriesWithName) {
		categories[skill.type] += `\`${skill.name} — ${skill.level}\``;
	}

	embed.addField("Weaponsmithing", categories.weaponsmithing, true);
	embed.addField("Armouring", categories.armouring, true);
	embed.addField("Engineering", categories.engineering, true);
	embed.addField("Jewelcrafting", categories.jewelcrafting, true);
	embed.addField("Arcana", categories.arcana, true);
	embed.addField("Cooking", categories.cooking, true);
	embed.addField("Furnishing", categories.furnishing, true);

	return embed;
}

async function GetName(members, entry) {
	await members.fetch(entry.userId);
	let member = members.cache.get(entry.userId);
	let name = member ? member.displayName : "undefined";

	return `${name}`;
}

async function SaveData(client) {
	fs.writeFileSync(path.join(__dirname, "../data/skills.json"), JSON.stringify(data, null, 2));

	let channels = client.channels.cache;
	let messages = channels.get(data.channelId).messages;
	await messages.fetch(data.messageId);
	let message = messages.cache.get(data.messageId);
	let content = await GetMessage(client);
	message.edit({ embeds: [content] });
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
	interaction.reply({ content: "Skills will now be displayed here", ephemeral: true });
}

async function register(interaction, client) {
	const type = interaction.options.get("type").value;
	const level = interaction.options.get("level").value;
	const userId = interaction.user.id;
	if (level === 0) {
		data.skills = data.skills.filter((skill) => {
			return !(skill.type === type && skill.userId === userId);
		});

		await SaveData(client);
		return interaction.reply({ content: "Skill removed", ephemeral: true });
	}

	if (level < 150) {
		return interaction.reply({
			content: "You must be at least level 150 to be registered",
			ephemeral: true,
		});
	}

	data.skills = data.skills.filter((skill) => {
		return !(skill.type === type && skill.userId === userId);
	});

	data.skills.push({ userId: userId, type: type, level: level });

	await SaveData(client);

	interaction.reply({ content: "Action Successful", ephemeral: true });
}

async function removeUser(interaction, client) {}
