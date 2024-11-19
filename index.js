//const AWS = require('aws-sdk');
const formData = require('form-data');
const Mailgun = require('mailgun.js');
const mailgun = new Mailgun(formData);
const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

// Database connection
const sequelize = new Sequelize(
    process.env.DB_NAME, // Database name
    process.env.DB_USERNAME, // Username
    process.env.DB_PASSWORD, // Password
    {
        host: process.env.DB_CONN_STRING, // RDS endpoint
        dialect: 'postgres', // Correct dialect for PostgreSQL
        logging: false,
    }
);
const User = sequelize.define('users', {
    id: { type: DataTypes.UUID, primaryKey: true },
    email: { type: DataTypes.STRING },
    verification_token: { type: DataTypes.STRING },
    token_expiry: { type: DataTypes.DATE },
    is_verified: { type: DataTypes.BOOLEAN }
}, { timestamps: false });

// Mailgun client setup
const mailgunClient = mailgun.client({ username: 'api', key: process.env.MAILGUN_API_KEY });

exports.handler = async (event) => {
    try {
        const snsMessage = JSON.parse(event.Records[0].Sns.Message);
        const { email, userId, verificationToken } = snsMessage;

        // Generate verification link
        const verificationLink = `${process.env.APP_DOMAIN}/verify?token=${verificationToken}&userId=${userId}`;

        // Email data
       const emailContent = await mailgunClient.messages.create('deepanshchaturvedi.me', {
            from: 'YourApp <no-reply@deepanshchaturvedi.me>',
            to: email,
            subject: 'Verify Your Email Address',
            text: `Please verify your email by clicking the link: ${verificationLink}\nThis link will expire in 2 minutes.`,
        })
        console.log(emailContent);
        console.log(`Verification email sent to ${email}`);
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
};
