import * as dotenv from 'dotenv';
import { COMMANDS } from './commands';
import { createClient } from './discord';
import { getConfig } from './env';

dotenv.config();

(async () => {
    const config = getConfig();
    const client = createClient();

    client.on('ready', () => {
        console.log(`Logged in as ${client.user.tag}!`);
        client.user.setActivity('Supporter Pack Raffle')
    });

    client.on('messageCreate', async (message) => {
        if (message.author.bot) {
            return;
        }

        const content = `${message.content}`.trim();
        for (const command of COMMANDS) {
            if (content.startsWith(command.trigger)) {
                const author = await message.guild.members.fetch(message.author.id);
                if (!author.roles.cache.has(config.discordRoleId)) {
                    await message.reply('Unauthorized.');
                    return;
                }
                await command.execute(message);
                break;
            }
        }
    });

    client.login(config.discordAppToken);
})();