'use strict';

const crypto = require('crypto');
const axios = require('axios');

const { getNonce } = require('./db');
const SECRETS = require('./secrets');

const GITHUB = 'github.com';

exports.getAuthURL = async () => {
  return `https://${GITHUB}/login/oauth/authorize?` +
    `client_id=${SECRETS.GITHUB_CLIENT_ID}&` +
    `state=${await getNonce()}`;
}

exports.fetchToken = async (code) => {
  const { status, data } = await axios({
    method: 'POST',
    url: `https://${GITHUB}/login/oauth/access_token`,
    responseType: 'json',
    headers: {
      'accept': 'application/json',
    },
    data: {
      client_id: SECRETS.GITHUB_CLIENT_ID,
      client_secret: SECRETS.GITHUB_CLIENT_SECRET,
      code
    }
  });

  if (status !== 200) {
    throw new Error('Failed to fetch github token, status: ' + status);
  }

  if (!data.access_token) {
    throw new Error('Expired github code');
  }

  return data.access_token;
};

exports.fetchUser = async (token) => {
  const { status, data } = await axios({
    method: 'GET',
    url: `https://api.${GITHUB}/user`,
    responseType: 'json',
    headers: {
      'authorization': `token ${token}`,
      'user-agent': 'gradtype',
      'accept': 'application/json',
    },
  });

  if (status !== 200) {
    throw new Error('Failed to fetch github token, status: ' + status);
  }

  return { login: data.login, id: data.id };
};
