interface Config {
    discordAppToken: string;
    discordRoleId: string;
    twitterApiToken: string;
}

export function getConfig(): Config {
    return {
        discordAppToken: process.env.DISCORD_APP_TOKEN,
        discordRoleId: process.env.DISCORD_ROLE_ID,
        twitterApiToken: process.env.TWITTER_API_TOKEN
    }
}