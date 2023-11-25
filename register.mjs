// Lambda function for user registration with Cognito and DynamoDB

import { CognitoIdentityProviderClient, SignUpCommand, AdminConfirmSignUpCommand, AdminDeleteUserCommand } from "@aws-sdk/client-cognito-identity-provider";
import AWS from 'aws-sdk';

const ddb = new AWS.DynamoDB.DocumentClient({ region: 'us-east-2' });

// Constants
const USER_POOL_ID = 'us-east-2_iawU2jA8B'; // Cognito User Pool ID

/**
 * Lambda function handler for user registration.
 * @param {object} event - The event object containing user registration details.
 * @returns {object} - The response object indicating the status of the registration.
 */
export const handler = async (event) => {
    // Generate a unique identifier
    const _id = AWS.util.uuid.v4();

    let username;

    try {
        // Extract parameters from the request
        const clientId = "4dt8grp0c3d3uc1jm8g21svbvg";
        username = event.queryStringParameters.username.toLowerCase();
        const password = event.queryStringParameters.password;
        const phone_number = event.queryStringParameters.phone_number;
        const given_name = event.queryStringParameters.given_name;
        const family_name = event.queryStringParameters.family_name;
        const id = event.queryStringParameters.id;

        // Validate length of given_name and family_name
        if (given_name.length > 20 || family_name > 20) {
            // Return a validation error response
            const response = {
                statusCode: 400,
                body: JSON.stringify('Error during user registration, given name / family name is longer than 20 letters'),
            };
            return response;
        }
        if (!isValidPhoneNumber("+" + phone_number)) {
            const response = {
                statusCode: 400,
                body: JSON.stringify('no valid phone number'),
            };
            return response;
        }

        if (!(username && password && phone_number && given_name && family_name && id)) {
            const response = {
                statusCode: 400,
                body: JSON.stringify('please specify all fields'),
            };
            return response;
        }


        // Call the signUp function
        await signUp({ clientId, username, password, phone_number, given_name, family_name, id, _id });

        // Confirm user registration
        await confirmUser({ clientId, username });

        // Register user details to DynamoDB
        await registerToDdb(username, password, phone_number, given_name, family_name, id, _id);

        // Return a success response
        const response = {
            statusCode: 201, // HTTP status code indicating successful user registration
            body: JSON.stringify(_id), // Unique identifier of the registered user
        };

        return response;
    } catch (error) {
        // Handle errors and return an appropriate response
        console.error("Error:", error);

        // Delete the user from Cognito only if the error is related to DynamoDB or confirmation failure
        if (error.code === 'DynamoDBError' || error.code === 'UserConfirmationFailure') {
            try {
                if (username) {
                    await deleteUserFromCognito(username);
                    console.log("User deleted from Cognito due to DynamoDB or confirmation error.");
                }
            } catch (deleteError) {
                console.error("Error deleting user from Cognito:", deleteError);
            }
        }

        const response = {
            statusCode: 400,
            error: error,
            body: JSON.stringify('Error during user registration'),
        };

        return response;
    }
};

/**
 * Handles user sign-up.
 * @param {object} params - The sign-up parameters.
 * @param {string} params.clientId - The Cognito client ID.
 * @param {string} params.username - The username.
 * // ... (add comments for other parameters)
 * @returns {object} - The sign-up response.
 */
const signUp = async ({ clientId, username, password, phone_number, given_name, family_name, id, _id }) => {
    let phoneNumber = phone_number.replace(/\s/g, '');  // Test if the provided phone number matches the pattern
    try {
        // Create Cognito Identity Provider client
        const client = new CognitoIdentityProviderClient({});

        // Prepare the sign-up command
        const command = new SignUpCommand({
            ClientId: clientId,
            Username: username,
            Password: password,
            UserAttributes: [
                { Name: "given_name", Value: given_name }, // First name
                { Name: "family_name", Value: family_name }, // Last name
                { Name: "phone_number", Value: "+" + phoneNumber }, // Phone number
                { Name: "custom:user_id", Value: id }, // ID
                { Name: "custom:ddb_id", Value: _id }
            ]
        });

        // Send the sign-up command to Cognito
        const response = await client.send(command);

        console.log("User successfully signed up:", response);

        return response;
    } catch (error) {
        console.error("Error during user registration:", error);
        throw error; // Throw the error to handle it in the calling code
    }
};

/**
 * Confirms user registration.
 * @param {object} params - The confirmation parameters.
 * @param {string} params.clientId - The Cognito client ID.
 * @param {string} params.username - The username.
 * @returns {object} - The confirmation response.
 */
const confirmUser = async ({ clientId, username }) => {
    try {
        // Create Cognito Identity Provider client
        const client = new CognitoIdentityProviderClient({});

        // Prepare the confirm sign-up command
        const command = new AdminConfirmSignUpCommand({
            UserPoolId: USER_POOL_ID,
            Username: username,
        });

        // Send the confirm sign-up command to Cognito
        const response = await client.send(command);

        console.log("User successfully confirmed:", response);

        return response;
    } catch (error) {
        console.error("Error during user confirmation:", error);
        throw error; // Throw the error to handle it in the calling code
    }
};

/**
 * Registers user details to DynamoDB.
 * @param {string} username - The username.
 * @param {string} password - The password.
 * @param {string} phone_number - The phone number.
 * @param {string} given_name - The given name.
 * @param {string} family_name - The family name.
 * @param {string} id - The ID.
 * @param {string} _id - The unique identifier.
 * @returns {Promise<object>} - The DynamoDB put response.
 */
async function registerToDdb(username, password, phone_number, given_name, family_name, id, _id) {
    const params = {
        TableName: 'CognitoUsersTable',
        Item: {
            username,
            password,
            given_name,
            family_name,
            phone_number: "+" + phone_number,
            id,
            _id,
        }
    }
    return await ddb.put(params).promise();
}

/**
 * Deletes a user from Cognito.
 * @param {string} username - The username.
 * @returns {Promise<object>} - The response from Cognito.
 */
async function deleteUserFromCognito(username) {
    try {
        const client = new CognitoIdentityProviderClient({});
        const command = new AdminDeleteUserCommand({
            UserPoolId: USER_POOL_ID,
            Username: username,
        });

        const response = await client.send(command);
        console.log("User successfully deleted from Cognito:", response);
        return response;
    } catch (error) {
        console.error("Error deleting user from Cognito:", error);
        throw error;
    }
}

function isValidPhoneNumber(phoneNumber) {
    // E.164 format regex pattern
    const phoneRegex = /^\+\d{1,15}$/;
    let data = phoneNumber.replace(/\s/g, '');  // Test if the provided phone number matches the pattern
    return phoneRegex.test(data);
}