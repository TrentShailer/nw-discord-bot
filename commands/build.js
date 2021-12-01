const { SlashCommandBuilder, SlashCommandSubcommandBuilder } = require("@discordjs/builders");
const fs = require("fs");
const path = require("path");

let data = require("../data/data.json");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("build")
		.setDescription("Managing your build")
		.addSubcommand((subcommand) =>
			subcommand
				.setName("setchannel")
				.setDescription("Sets the channel to view your guild member's builds")
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("add")
				.setDescription("Register your build")
				.addStringOption((option) =>
					option
						.setName("role")
						.setDescription("Your build's role")
						.setRequired(true)
						.addChoices([
							["DPS", "dps"],
							["Tank", "tank"],
							["Healer", "healer"],
						])
				)
				.addStringOption((option) =>
					option
						.setName("primary")
						.setDescription("Your build's first weapon")
						.setRequired(true)
						.addChoices([
							["Sword and Shield", "sword"],
							["Hatchet", "hatchet"],
							["Rapier", "rapier"],
							["War Hammer", "hammer"],
							["Great Axe", "axe"],
							["Spear", "spear"],
							["Bow", "bow"],
							["Musket", "musket"],
							["Fire Staff", "fire"],
							["Life Staff", "life"],
							["Ice Gauntlet", "ice"],
							["Void Gauntlet", "void"],
						])
				)
				.addStringOption((option) =>
					option
						.setName("secondary")
						.setDescription("Your build's first weapon")
						.setRequired(true)
						.addChoices([
							["Sword and Shield", "sword"],
							["Hatchet", "hatchet"],
							["Rapier", "rapier"],
							["War Hammer", "hammer"],
							["Great Axe", "axe"],
							["Spear", "spear"],
							["Bow", "bow"],
							["Musket", "musket"],
							["Fire Staff", "fire"],
							["Life Staff", "life"],
							["Ice Gauntlet", "ice"],
							["Void Gauntlet", "void"],
						])
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("remove")
				.setDescription("Remove one of your builds")
				.addStringOption((option) =>
					option
						.setName("role")
						.setDescription("Your build's role")
						.setRequired(true)
						.addChoices([
							["DPS", "dps"],
							["Tank", "tank"],
							["Healer", "healer"],
						])
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("edit")
				.setDescription("Edit one of your builds")
				.addStringOption((option) =>
					option
						.setName("role")
						.setDescription("Your build's role")
						.setRequired(true)
						.addChoices([
							["DPS", "dps"],
							["Tank", "tank"],
							["Healer", "healer"],
						])
				)
				.addStringOption((option) =>
					option
						.setName("primary")
						.setDescription("Your build's first weapon")
						.setRequired(true)
						.addChoices([
							["Sword and Shield", "sword"],
							["Hatchet", "hatchet"],
							["Rapier", "rapier"],
							["War Hammer", "hammer"],
							["Great Axe", "axe"],
							["Spear", "spear"],
							["Bow", "bow"],
							["Musket", "musket"],
							["Fire Staff", "fire"],
							["Life Staff", "life"],
							["Ice Gauntlet", "ice"],
							["Void Gauntlet", "void"],
						])
				)
				.addStringOption((option) =>
					option
						.setName("secondary")
						.setDescription("Your build's first weapon")
						.setRequired(true)
						.addChoices([
							["Sword and Shield", "sword"],
							["Hatchet", "hatchet"],
							["Rapier", "rapier"],
							["War Hammer", "hammer"],
							["Great Axe", "axe"],
							["Spear", "spear"],
							["Bow", "bow"],
							["Musket", "musket"],
							["Fire Staff", "fire"],
							["Life Staff", "life"],
							["Ice Gauntlet", "ice"],
							["Void Gauntlet", "void"],
						])
				)
		),
	async execute(interaction, client) {
		switch (interaction.options.getSubcommand()) {
			case "setchannel":
				return setchannel(interaction, client);

			case "add":
				return add(interaction, client);

			case "remove":
				return remove(interaction, client);

			case "edit":
				return edit(interaction, client);
		}
		return interaction.reply({
			content: "Invalid Subcommand",
			ephemeral: true,
		});
	},
};

const emoteIds = {
	axe: "915480897250275368",
	bow: "915480897158017055",
	fire: "915480897229307935",
	hammer: "915480897275461703",
	hatchet: "915480897271246878",
	ice: "915480897397096478",
	life: "915480897225130034",
	musket: "915480897313194025",
	rapier: "915480897250267146",
	spear: "915480897258676284",
	sword: "915480897212526632",
	void: "915480897288019998",
};

async function GetBuildMessage(members, build) {
	await members.fetch(build.userId);
	let member = members.cache.get(build.userId);
	let name = member ? member.displayName : "undefined";
	return `\`${name}\` — <:nw_${build.primary}:${emoteIds[build.primary]}> — <:nw_${
		build.secondary
	}:${emoteIds[build.secondary]}>\n`;
}

async function GetMessage(client) {
	await client.channels.fetch(data.channelId);
	let channel = client.channels.cache.get(data.channelId);
	let members = channel.guild.members;
	let tanks = "";
	let healers = "";
	let dps = "";
	for (const build of data.builds) {
		let message = await GetBuildMessage(members, build);

		if (build.role === "tank") tanks += message;
		else if (build.role === "healer") healers += message;
		else if (build.role === "dps") dps += message;
	}

	return `
**Tank**
${tanks}
**Healer**
${healers}
**DPS**
${dps}


*Use \`/build\` and follow the prompts to add your build!*`;
}

async function SaveData(client) {
	fs.writeFileSync(path.join(__dirname, "../data/data.json"), JSON.stringify(data, null, 2));

	let channels = client.channels.cache;
	let messages = channels.get(data.channelId).messages;
	await messages.fetch(data.messageId);
	let message = messages.cache.get(data.messageId);
	message.edit(await GetMessage(client));
}

async function setchannel(interaction, client) {
	const channelId = interaction.channelId;

	data.channelId = channelId;

	let content = await GetMessage(client);
	let message = await client.channels.cache.get(channelId).send(content);

	const messageId = message.id;

	data.messageId = messageId;

	SaveData(client);
	interaction.reply({ content: "Builds will now be displayed here", ephemeral: true });
}

async function add(interaction, client) {
	const role = interaction.options.get("role").value;
	const primary = interaction.options.get("primary").value;
	const secondary = interaction.options.get("secondary").value;
	const userId = interaction.user.id;

	// Check if build already exists
	if (
		data.builds.filter((build) => {
			return build.role === role && build.userId === userId;
		}).length > 0
	) {
		return interaction.reply({
			content: `You already have registered a ${role} build`,
			ephemeral: true,
		});
	}

	// Push build to data.builds

	data.builds.push({ userId: userId, role: role, primary: primary, secondary: secondary });
	SaveData(client);

	interaction.reply({ content: "Action Successful", ephemeral: true });
}

async function remove(interaction, client) {
	const role = interaction.options.get("role").value;
	const userId = interaction.user.id;

	if (
		data.builds.filter((build) => {
			return build.role === role && build.userId === userId;
		}).length > 0
	) {
		data.builds = data.builds.filter((build) => {
			return !(build.role === role && build.userId === userId);
		});

		SaveData(client);

		interaction.reply({ content: "Action Successful", ephemeral: true });
	} else {
		return interaction.reply({
			content: `You haven't registered a ${role} build`,
			ephemeral: true,
		});
	}
}

async function edit(interaction, client) {
	const role = interaction.options.get("role").value;
	const primary = interaction.options.get("primary").value;
	const secondary = interaction.options.get("secondary").value;
	const userId = interaction.user.id;

	if (
		data.builds.filter((build) => {
			return build.role === role && build.userId === userId;
		}).length > 0
	) {
		data.builds = data.builds.filter((build) => {
			return !(build.role === role && build.userId === userId);
		});

		data.builds.push({ userId: userId, role: role, primary: primary, secondary: secondary });

		await SaveData(client);

		interaction.reply({ content: "Action Successful", ephemeral: true });
	} else {
		return interaction.reply({
			content: `You haven't registered a ${role} build`,
			ephemeral: true,
		});
	}
}
