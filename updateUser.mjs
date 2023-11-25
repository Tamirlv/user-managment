import { CognitoIdentityProviderClient, GetUserCommand, AdminUpdateUserAttributesCommand } from "@aws-sdk/client-cognito-identity-provider";
import jwt from 'jsonwebtoken';
import AWS from 'aws-sdk';

// Constants for User Pool and DynamoDB table
const USER_POOL_ID = 'us-east-2_iawU2jA8B';
const DYNAMODB_TABLE = 'CognitoUsersTable';

// DynamoDB Document Client initialization
const ddb = new AWS.DynamoDB.DocumentClient({ region: 'us-east-2' });

// Lambda function handler
export const handler = async (event) => {
    try {
        // Extracting token and updated given name from the event
        const token = event.headers.Authorization;
        const updatedGivenName = event.queryStringParameters.given_name;

        // Decoding the JWT token to get user information
        const decodedToken = jwt.decode(token, { complete: true });

        // Initializing Cognito client
        const client = new CognitoIdentityProviderClient({ region: 'us-east-2' });

        // Attributes to be updated in Cognito
        const attributesToUpdate = [
            { Name: 'given_name', Value: updatedGivenName }
        ];

        // Creating a command to update user attributes in Cognito
        const updateUserCommand = new AdminUpdateUserAttributesCommand({
            UserPoolId: USER_POOL_ID,
            Username: decodedToken.payload.username,
            UserAttributes: attributesToUpdate,
        });

        // Sending the update command to Cognito
        const updateResponse = await client.send(updateUserCommand);
        console.log('Update response:', updateResponse);

        // Updating user's given_name in DynamoDB
        const dynamoDBUpdateResult = await updateGivenNameInDynamoDB(decodedToken.payload.username, updatedGivenName);
        console.log('DynamoDB update result:', dynamoDBUpdateResult);

        // Return a success response
        const response = {
            statusCode: 200,
            body: JSON.stringify({ message: 'Request successful' }),
        };
        return response;
    } catch (error) {
        // Handle errors and return an appropriate error response
        console.error('Error:', error);

        const errorResponse = {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal Server Error' }),
        };
        return errorResponse;
    }
};

// Function to update given_name in DynamoDB
async function updateGivenNameInDynamoDB(userId, newGivenName) {
    const params = {
        TableName: DYNAMODB_TABLE,
        Key: {
            'username': userId,
        },
        UpdateExpression: 'SET #given_name = :newGivenName',
        ExpressionAttributeNames: {
            '#given_name': 'given_name',
        },
        ExpressionAttributeValues: {
            ':newGivenName': newGivenName,
        },
        ReturnValues: 'ALL_NEW',
    };

    try {
        // Updating DynamoDB and returning the updated item
        const result = await ddb.update(params).promise();
        console.log('User given_name updated in DynamoDB:', result);
        return result.Attributes;
    } catch (error) {
        // Handle errors and rethrow for Lambda error handling
        console.error('Error updating user\'s given_name in DynamoDB:', error);
        throw error;
    }
}
