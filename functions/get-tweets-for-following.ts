import { Handler } from '@netlify/functions';
import { TwitterApi } from 'twitter-api-v2';
import { FollowingTweets } from '../src/models/models';
import { decryptData } from '../src/utilities/encryption';

const handler: Handler = async (event, _context) => {
  try {
    const decryptedData = await decryptData(
      event.queryStringParameters.token,
      event.queryStringParameters.uid,
    );
    const { accessToken, accessSecret, following, eat } = JSON.parse(decryptedData);

    if (eat && eat > Date.now()) {
      const client = new TwitterApi({
        appKey: process.env.TWITTER_API_KEY || '',
        appSecret: process.env.TWITTER_API_SECRET || '',
        accessToken: accessToken || '',
        accessSecret: accessSecret || '',
      });

      const followingList: Array<string> = following?.split(',') || [];
      const followingTweets: Array<FollowingTweets> = [];

      const promises = [];
      for (const following of followingList) {
        promises.push(
          client.v2.get(`users/${following}/tweets`, {
            max_results: 100,
            exclude: 'retweets,replies',
          }),
        );
      }

      (await Promise.allSettled(promises)).forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const { data: tweets } = result.value;
          followingTweets.push({ following: followingList[index], tweets: tweets ? tweets : [] });
        }
      });
      return {
        statusCode: 200,
        body: JSON.stringify(followingTweets),
      };
    } else {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized access' }),
      };
    }
  } catch (_error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'There was an error in connecting to the Twitter API' }),
    };
  }
};

export { handler };
