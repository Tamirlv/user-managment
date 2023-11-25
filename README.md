I've implemented a user management system leveraging four key AWS services: Lambda, API Gateway, Cognito, and DynamoDB. The system comprises four Lambda functions, with two requiring authorization (update user and get user) and two not (register and login).

1. User Registration and Confirmation:
- Lambda function registers and confirms users in Cognito while storing their data in DynamoDB.
- Error handling ensures that if issues arise with DynamoDB or the confirmation process, the user is removed from the Cognito table.
- Request Parameters:
1. Username
2. Password (minimum 6 characters)
3. First name (up to 20 characters)
4.Family name (up to 20 characters)
5. Valid Israeli ID (9 digits)
6. Valid phone number

Example:
https://8gojdyh128.execute-api.us-east-2.amazonaws.com/usermanagment/user?username=Tamir&password=Tamir123@&phone_number=+972547707715&given_name=Tamir&family_name=Levv&id=316048222

2. User Login and JWT Access Token:
- Lambda function logs in users and returns a JWT access token.
- Request Parameters:
1. username
2. password

Example: 
https://8gojdyh128.execute-api.us-east-2.amazonaws.com/usermanagment/user/login?username=Tamir&password=Tamir123@


3. Update User's Given Name:
- Lambda function updates the given name (first name) in Cognito and DynamoDB.
- Authorized by API Gateway, requiring a token in the headers.
- Request Parameters:
1. Token in the headers
2. given_name

Example: 
https://8gojdyh128.execute-api.us-east-2.amazonaws.com/Test/user?given_name=Shimon

4. Retrieve User Item:
- Lambda function retrieves user item from DynamoDB.
- Authorized by API Gateway with a check ensuring the provided username in the request matches the one in the token.
- Request Parameters:
1. Token in the headers
2. username
Example: 
https://8gojdyh128.execute-api.us-east-2.amazonaws.com/CognitoApi/user/id?username=Tamir

