import { CognitoIdentityProviderClient, InitiateAuthCommand } from "@aws-sdk/client-cognito-identity-provider";


/**
 * Lambda function handler for user sign-in.
 * @param {object} event - The event object.
 * @returns {object} - The response object.
 */

export const handler = async (event) => {
    try {
        const clientId = "4dt8grp0c3d3uc1jm8g21svbvg";
        const username = event.queryStringParameters.username;
        const password = event.queryStringParameters.password;

        const signInResponse = await signIn({ clientId, username, password });
        console.log("User signed in successfully. Access Token:", signInResponse.AuthenticationResult?.AccessToken);

        const accessToken = signInResponse.AuthenticationResult?.AccessToken || '';

        const response = {
            statusCode: 200,
            body: JSON.stringify({ accessToken }),
        };

        return response;
    } catch (error) {
        console.error("Error during sign-in:", error);

        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal Server Error' }),
        };
    }
};

/**
 * Initiates user sign-in using Cognito.
 * @param {object} params - The sign-in parameters.
 * @returns {Promise<object>} - A promise that resolves to the sign-in response.
 */

const signIn = async ({ clientId, username, password }) => {
    try {
        const client = new CognitoIdentityProviderClient({});
        const command = new InitiateAuthCommand({
            AuthFlow: "USER_PASSWORD_AUTH",
            ClientId: clientId,
            AuthParameters: {
                USERNAME: username,
                PASSWORD: password,
            },
        });

        const response = await client.send(command);
        return response;

    } catch (error) {
        console.error("Error during user sign-in:", error);

        // Throw the error to handle it in the calling code
        throw error;
    }
};
