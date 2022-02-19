import { TwitterApi, UserV2 } from 'twitter-api-v2';

export async function getRetweeters(
    client: TwitterApi,
    tweetId: string
): Promise<UserV2[]> {
    const retweeters: UserV2[] = [];
    const users = await client.v2.tweetRetweetedBy(tweetId, {
        asPaginator: true,
        'user.fields': ['profile_image_url']
    });
    for await (const user of users) {
        retweeters.push(user);
    }
    return retweeters;
}

export async function getLikers(
    client: TwitterApi,
    tweetId: string
): Promise<UserV2[]> {
    const likers: UserV2[] = [];
    const users = await client.v2.tweetLikedBy(tweetId, {
        asPaginator: true,
        'user.fields': ['profile_image_url']
    });
    for await (const user of users) {
        likers.push(user);
    }
    return likers;
}