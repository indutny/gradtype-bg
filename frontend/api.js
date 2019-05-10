const HOST = 'https://gradtype.darksi.de/api';

export default class API {
  constructor() {
    this.token = null;
  }

  async request(method, uri, data) {
    const res = await fetch(HOST + uri, {
      method,
      headers: {
        'authorization': this.token ? 'Bearer ' + this.token : undefined,
        'content-type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    })

    return await res.json();
  }

  async auth() {
    if (this.token) {
      return;
    }

    const { url } = await this.request('GET', '/auth/github');

    const child = window.open(url,
      'gradtype.github.auth',
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

    const { token } = await this.request('PUT', '/auth/github', {
      code,
      state,
    });

    this.token = token;
  }

  async getUser() {
    await this.auth();
    return await this.request('GET', '/user');
  }

  async sendFeatures(events) {
    await this.auth();
    const res = await this.request('PUT', '/features', { events });
    if (res.error && res.auth === false) {
      this.token = null;
      return await this.sendFeatures(events);
    }
    return res;
  }
}
