import { parse, stringify } from 'csv/sync';
import { Message } from 'discord.js';
import { promises as fs } from 'fs';
import { basename, dirname } from 'path';
import { getRole, getRoleMembers } from './discord';
import { createClient, getLikers, getRetweeters } from './twitter';

interface DiscordUser {
    id: string;
    displayName: string;
    avatarUrl: string;
}

interface TwitterUser {
    id: string;
    username: string;
    name: string;
    profileImageUrl: string;
}

interface RaffleEntry {
    id: string;
    name: string;
    source: 'discord' | 'twitter';
    prize: string;
    avatarUrl: string;
}

interface Command {
    trigger: string;
    execute: (message: Message) => Promise<void>;
}

export const COMMANDS: Command[] = [
    {
        trigger: '.export-role',
        execute: async message => {
            try {
                const [, roleId] = message.content.trim().split(' ');
                if (!roleId?.length) {
                    await message.reply('A parameter was missing from command: .export-role <roleId>');
                    return;
                }

                const role = await getRole(message.guild, roleId);
                if (!role) {
                    await message.reply('Unable to resolve role from message.');
                    return;
                }

                const members = await getRoleMembers(message.guild, role);
                const result = stringify([
                    ['id', 'displayName', 'avatarUrl'],
                    ...members.map(x => [x.id, x.displayName, x.user.displayAvatarURL({ format: 'png' })])
                ]);

                const path = `./data/role/${roleId}.csv`;
                const dir = dirname(path);
                const name = basename(path);
                await fs.mkdir(dir, { recursive: true })
                await fs.writeFile(path, result, { encoding: 'utf-8' });

                await message.reply({
                    content: `${members.length} user(s) are in role ${role.name}.`,
                    files: [{ name, attachment: path }]
                });
            } catch (error) {
                console.warn('An error occurred while executing command.', error);
            }
        }
    },
    {
        trigger: '.export-tweet',
        execute: async message => {
            try {
                const [, tweetId] = message.content.trim().split(' ');
                if (!tweetId?.length) {
                    await message.reply('A parameter was missing from command: .export-tweet <tweetId>');
                    return;
                }

                const client = createClient();

                const retweeters = await getRetweeters(client, tweetId);
                const likers = await getLikers(client, tweetId);

                const set = new Set(likers.map(x => x.id));
                const intersection = retweeters.filter(x => set.has(x.id))

                const result = stringify([
                    ['id', 'username', 'name', 'profileImageUrl'],
                    ...intersection.map(x => [x.id, x.username, x.name, x.profile_image_url])
                ]);

                const path = `./data/tweet/${tweetId}.csv`;
                const dir = dirname(path);
                const name = basename(path);
                await fs.mkdir(dir, { recursive: true })
                await fs.writeFile(path, result, { encoding: 'utf-8' });

                await message.reply({
                    content: `${intersection.length} user(s) retweeted and liked the tweet.`,
                    files: [{ name, attachment: path }]
                });
            } catch (error) {
                console.warn('An error occurred while executing command.', error);
            }
        }
    },
    {
        trigger: '.close',
        execute: async message => {
            try {
                const [, roleId, tweetId] = message.content.trim().split(' ');
                if (!roleId?.length) {
                    await message.reply('A required parameter was missing from command: .close <roleId> ?<tweetId>');
                    return;
                }

                let discordUsers: DiscordUser[] = [];
                try {
                    const discordUsersRaw = await fs.readFile(`./data/role/${roleId}.csv`, { encoding: 'utf-8' });
                    discordUsers = parse(discordUsersRaw, {
                        columns: ['id', 'displayName', 'avatarUrl'],
                        fromLine: 2
                    });
                } catch (error) {
                    console.warn('Unable to load discord users from role.', error);
                    await message.reply('Unable to load discord users from role. Makes sure to export them before closing!');
                    return;
                }

                // optional
                let twitterUsers: TwitterUser[] = [];
                if (tweetId?.length > 0) {
                    try {
                        const twitterUsersRaw = await fs.readFile(`./data/tweet/${tweetId}.csv`, { encoding: 'utf-8' });
                        twitterUsers = parse(twitterUsersRaw, {
                            columns: ['id', 'username', 'name', 'profileImageUrl'],
                            fromLine: 2
                        });
                    } catch (error) {
                        console.warn('Unable to load twitter users from tweet.', error);
                        await message.reply('Unable to load twitter users from tweet. Makes sure to export them before closing!');
                        return;
                    }
                }

                const entries = [
                    ...discordUsers.map(({ id, displayName, avatarUrl }) => [id, displayName, 'discord', '', avatarUrl]),
                    ...twitterUsers.map(({ id, username, profileImageUrl }) => [id, username, 'twitter', '', profileImageUrl]),
                ];
                const result = stringify([
                    ['id', 'name', 'source', 'prize', 'avatarUrl'],
                    ...entries
                ]);

                const path = `./data/raffle/${roleId}.csv`;
                const dir = dirname(path);

                await fs.mkdir(dir, { recursive: true })
                await fs.writeFile(path, result, { encoding: 'utf-8' });

                await message.channel.send(`Raffle: <@&${roleId}> is now closed! There were ${entries.length} entries. Winners will be drawn now. GL!`);
            } catch (error) {
                console.warn('An error occurred while executing command.', error);
            }
        },
    },
    {
        trigger: '.draw',
        execute: async message => {
            try {
                const [, roleId, prize, _count] = message.content.trim().match(/[^\s"']+|"([^"]*)"|'([^']*)'/g);
                if (!roleId?.length || !prize?.length) {
                    await message.reply('A required parameter was missing from command: .draw <roleId> <prize> ?<count>');
                    return;
                }

                const count = Math.max(Math.min(isNaN(+_count) ? 1 : +_count, 10), 1);

                for (let i = 0; i < count; i++) {
                    let raffleUsers: RaffleEntry[];
                    try {
                        const raffleUsersRaw = await fs.readFile(`./data/raffle/${roleId}.csv`, { encoding: 'utf-8' });
                        raffleUsers = parse(raffleUsersRaw, {
                            columns: ['id', 'name', 'source', 'prize', 'avatarUrl'],
                            fromLine: 2
                        });
                    } catch (error) {
                        console.warn('Unable to load raffle entries.', error);
                        await message.reply('Unable to load raffle entries. Makes sure to close it before drawing!');
                        return;
                    }

                    const undrawn = raffleUsers.filter(x => !x.prize?.length);
                    if (!undrawn.length) {
                        await message.reply('Unable to draw winner. All entries were already marked as drawn.');
                        return;
                    }

                    const winner = undrawn[Math.floor(Math.random() * undrawn.length)];
                    const tmp = prize.split('"').join('');

                    const result = stringify([
                        ['id', 'name', 'source', 'prize', 'avatarUrl'],
                        ...raffleUsers.map(x => [
                            x.id, x.name, x.source, x.id === winner.id ? tmp : x.prize, x.avatarUrl
                        ])
                    ]);

                    const path = `./data/raffle/${roleId}.csv`;
                    const dir = dirname(path);

                    await fs.mkdir(dir, { recursive: true })
                    await fs.writeFile(path, result, { encoding: 'utf-8' });

                    if (winner.source === 'discord') {
                        await message.channel.send({
                            content: `<@${winner.id}> just won: **${tmp}**. We will reach out to you through Discord. Congratz!`,
                            embeds: [
                                {
                                    color: 0x7289DA,
                                    author: { name: `${winner.name} on Discord`, iconURL: winner.avatarUrl }
                                }
                            ]
                        });
                    } else if (winner.source === 'twitter') {
                        await message.channel.send({
                            content: `${winner.name} just won: **${tmp}**. We will reach out to you through Twitter. Congratz!`,
                            embeds: [
                                {
                                    color: 0x1DA1F2,
                                    author: { name: `${winner.name} on Twitter`, iconURL: winner.avatarUrl }
                                }
                            ]
                        });
                    }

                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            } catch (error) {
                console.warn('An error occurred while executing command.', error);
            }
        },
    }
];