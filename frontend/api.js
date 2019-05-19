import WEIGHTS from '../data/weights';
import Model from '../backend/model';

const HOST = '/api';

export default class API {
  constructor() {
    this.model = new Model(WEIGHTS);

    this.token = localStorage.getItem('auth:token');
  }

  async request(method, uri, data) {
    const res = await fetch(HOST + uri, {
      method,
      headers: {
        'authorization': this.token ? 'Bearer ' + this.token : undefined,
        'content-type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    return await res.json();
  }

  async auth(provider = 'github') {
    if (this.token) {
      return;
    }

    const { url } = await this.request('GET', `/auth/${provider}`);

    const child = window.open(url,
      'gradtype.auth',
      'width=500,height=500');

    const { code, state } = await new Promise((resolve, reject) => {
      const onMessage = ({ source, data }) => {
        if (source !== child) {
          return;
        }

        if (data.error) {
          return reject(new Error(data.error));
        }

        resolve(data);
      };
      window.addEventListener('message', onMessage);
    });

    const { token } = await this.request('PUT', `/auth/${provider}`, {
      code,
      state,
    });

    this.token = token;
    localStorage.setItem('auth:token', token);
  }

  async logout() {
    this.token = null;
    localStorage.removeItem('auth:token');
  }

  async getUser() {
    const { user } = await this.request('GET', '/user');
    if (!user) {
      this.token = null;
      localStorage.removeItem('auth:token');
    }
    return user;
  }

  async sendSequence(sequence) {
    const features = this.model.call(sequence);

    const res = await this.request('PUT', '/sequence', { sequence, features });
    if (res.error) {
      throw new Error(res.error);
    }
    return res;
  }
}
