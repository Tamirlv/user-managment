import { CognitoIdentityProviderClient, GetUserCommand } from "@aws-sdk/client-cognito-identity-provider";
import jwt from 'jsonwebtoken';
import AWS from 'aws-sdk';

const ddb = new AWS.DynamoDB.DocumentClient({ region: 'us-east-2' });

/**
 * Lambda function handler.
 * @param {object} event - The event object.
 * @returns {object} - The response object.
 */
export const handler = async (event) => {
    try {
        // Get the authorization token from the headers
        const token = event.headers.Authorization;
        const decodedToken = jwt.decode(token, { complete: true });
        const usernameFromtClient = event.queryStringParameters.username;
        const username = decodedToken?.payload?.username;

        if (!username) {
            throw new Error('Invalid token: Missing username');
        }

        if (usernameFromtClient.toLowerCase() != username.toLowerCase()) {
            console.log(usernameFromtClient, username)
            const errorResponse = {
                statusCode: 500,
                body: JSON.stringify({ error: 'You can only get your user' }),
            };
            return errorResponse;
        }

        // Fetch user details from DynamoDB
        const user = await getSpecificUser(username);

        // Return a response
        const response = {
            statusCode: 200,
            body: JSON.stringify(user),
        };
        return response;
    } catch (error) {
        console.error('Error:', error);

        // Return an error response
        const errorResponse = {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal Server Error' }),
        };
        return errorResponse;
    }
};

/**
 * Retrieves user details from DynamoDB based on the username.
 * @param {string} username - The username of the user to retrieve.
 * @returns {Promise<Array>} - A promise that resolves to an array of user items.
 */
async function getSpecificUser(username) {
    const params = {
        TableName: 'CognitoUsersTable',
        KeyConditionExpression: 'username = :value',
        ExpressionAttributeValues: {
            ':value': username,
        },
    };

    const queryResult = await ddb.query(params).promise();
    return queryResult.Items; // Return the list of items
}
