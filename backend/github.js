'use strict';

const crypto = require('crypto');
const axios = require('axios');

const GITHUB = 'github.com';

module.exports = class GitHub {
  constructor(storage, options = {}) {
    this.storage = storage;
    this.options = options;
  }

  async getAuthURL() {
    return `https://${GITHUB}/login/oauth/authorize?` +
      `client_id=${this.options.clientId}&` +
      `state=${await this.storage.createNonce()}`;
  }

  async fetchToken(code) {
    const { status, data } = await axios({
      method: 'POST',
      url: `https://${GITHUB}/login/oauth/access_token`,
      responseType: 'json',
      headers: {
        'accept': 'application/json',
      },
      data: {
        client_id: this.options.clientId,
        client_secret: this.options.clientSecret,
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
  }

  async fetchUser(token) {
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
  }
};
