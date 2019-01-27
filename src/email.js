'use strict';

const uuid = require('uuid');
const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies
var validator = require('validator');

const dynamoDb = new AWS.DynamoDB.DocumentClient();

module.exports.handle = async (event, context, callback) => {

    console.log(event.body);

    if (event.httpMethod === 'OPTIONS') {
        console.log("options")
        callback(null, {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                'Access-Control-Allow-Methods': "OPTIONS, PUT",
                'Access-Control-Allow-Headers': 'Authorization, Content-Type'
            }
        });
        return;
    }

    const timestamp = new Date().getTime();
    const data = JSON.parse(event.body);
    if (typeof data.email !== 'string' || !validator.isEmail(data.email)) {
        console.error('Validation Failed');
        callback(null, buildJsonResponse('Couldn\'t  add email', 400));
        return;
    }

    let email = await getEmail(data.email);
    if (email != null) {
        console.log("email is already present");
        callback(null, buildJsonResponse('Couldn\'t  add email', 200));
        return;
    }

    console.log(`tabla name ${process.env.DYNAMODB_TABLE}`);

    const params = {
        TableName: process.env.DYNAMODB_TABLE,
        Item: {
            id: `Email|${data.email}`,
            email: data.email,
            createdAt: timestamp
        },
    };

    // write the todo to the database
    console.log("before ddb");
    await dynamoDb.put(params).promise();    
    console.log("after ddb");
    const response = buildJsonResponse(params.Item);
    callback(null, response);
    return;
};


async function getEmail(email) {
    console.log("get email");
    //create the query
    let params = {
        TableName: process.env.DYNAMODB_TABLE,

        Key: {
            id: `Email|${email}`
        }
    };
    let result = await dynamoDb.get(params).promise();
    console.log(`fetched items: ${result.Item}`);
    return result.Item;
}


function buildJsonResponse(body, statusCode) {
    if (!statusCode) {
        statusCode = 200;
    }

    let responseBody;
    if (typeof (body) === "object") {
        responseBody = JSON.stringify(body);
    } else if (typeof (body) == "string") {
        responseBody = JSON.stringify({ message: body });
    } else {
        throw new Error("wrong body data type");
    }

    return {
        statusCode: statusCode,
        headers: {
            "Access-Control-Allow-Origin": "*", // Required for CORS support to work
            'Content-Type': 'application/json'
        },
        body: responseBody,
    };
}