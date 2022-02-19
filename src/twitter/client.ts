import { TwitterApi } from 'twitter-api-v2';
import { getConfig } from '../env';

export function createClient(): TwitterApi {
    const config = getConfig();
    return new TwitterApi(config.twitterApiToken);
}