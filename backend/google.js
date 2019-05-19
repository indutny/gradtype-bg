'use strict';

const crypto = require('crypto');
const axios = require('axios');

const REDIRECT = 'https://gradtype-mturk.darksi.de/auth/google/callback.html';

module.exports = class Google {
  constructor(storage, options = {}) {
    this.storage = storage;
    this.options = options;
    this.type = 'google';
  }

  async getAuthURL() {
    return `https://accounts.google.com/o/oauth2/v2/auth?` +
      'response_type=code&' +
      'redirect_uri=' + encodeURIComponent(REDIRECT) + '&' +
      'scope=email&' +
      `client_id=${encodeURIComponent(this.options.clientId)}&` +
      `state=${await this.storage.createNonce()}`;
  }

  async fetchToken(code) {
    const { status, data } = await axios({
      method: 'POST',
      url: 'https://www.googleapis.com/oauth2/v4/token',
      responseType: 'json',
      headers: {
        'accept': 'application/json',
      },
      data: {
        client_id: this.options.clientId,
        client_secret: this.options.clientSecret,
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT,
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
      url: 'https://www.googleapis.com/oauth2/v3/userinfo',
      responseType: 'json',
      headers: {
        'authorization': `Bearer ${token}`,
        'user-agent': 'gradtype',
        'accept': 'application/json',
      },
    });

    if (status !== 200) {
      throw new Error('Failed to fetch github token, status: ' + status);
    }

    return { login: data.email };
  }
};
