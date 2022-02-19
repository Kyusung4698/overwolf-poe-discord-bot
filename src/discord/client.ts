import { Client, Intents } from 'discord.js';

export function createClient(): Client {
    const client = new Client({
        intents: [
            Intents.FLAGS.GUILDS,
            Intents.FLAGS.GUILD_MEMBERS,
            Intents.FLAGS.GUILD_MESSAGES
        ]
    });
    return client;
}