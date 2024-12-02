const AWS = require('aws-sdk');
const formData = require('form-data');
const Mailgun = require('mailgun.js');
const mailgun = new Mailgun(formData);
const { Sequelize, DataTypes } = require('sequelize');

const secretsManager = new AWS.SecretsManager();

// Utility function to fetch secrets from AWS Secrets Manager
async function getSecrets(secretName) {
    try {
        const secretValue = await secretsManager.getSecretValue({ SecretId: secretName }).promise();
        return JSON.parse(secretValue.SecretString);
    } catch (error) {
        console.error(`Failed to retrieve secret: ${secretName}`, error);
        throw error;
    }
}

exports.handler = async (event) => {
    try {
        // Fetch Mailgun and DB credentials from Secrets Manager
        const mailgunSecrets = await getSecrets('email_service_credentials-21');
        const dbSecrets = await getSecrets('db_password-21');

        // Configure Mailgun client
        const mailgunClient = mailgun.client({ username: 'api', key: mailgunSecrets.api_key });
        const mailgunDomain = mailgunSecrets.domain;

        // Configure database connection
        // const sequelize = new Sequelize(
        //     dbSecrets.db_name,
        //     dbSecrets.username,
        //     dbSecrets.password,
        //     {
        //         host: dbSecrets.db_host,
        //         dialect: 'postgres',
        //         logging: false,
        //     }
        // );

        // // Define User model
        // const User = sequelize.define(
        //     'users',
        //     {
        //         id: { type: DataTypes.UUID, primaryKey: true },
        //         email: { type: DataTypes.STRING },
        //         verification_token: { type: DataTypes.STRING },
        //         token_expiry: { type: DataTypes.DATE },
        //         is_verified: { type: DataTypes.BOOLEAN },
        //     },
        //     { timestamps: false }
        // );

        // Parse SNS event
        const snsMessage = JSON.parse(event.Records[0].Sns.Message);
        const { email, userId, verificationToken } = snsMessage;

        // Generate verification link
        const verificationLink = `${process.env.APP_DOMAIN}/verify?token=${verificationToken}&userId=${userId}`;

        // Send verification email
        const emailContent = await mailgunClient.messages.create(mailgunDomain, {
            from: 'YourApp <no-reply@yourdomain.com>',
            to: email,
            subject: 'Verify Your Email Address',
            text: `Please verify your email by clicking the link: ${verificationLink}\nThis link will expire in 2 minutes.`,
        });

        console.log(emailContent);
        console.log(`Verification email sent to ${email}`);
    } catch (error) {
        console.error('Error occurred:', error);
        throw error;
    }
};
