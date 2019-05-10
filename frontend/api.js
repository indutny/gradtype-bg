const HOST = 'http://127.0.0.1:8000';

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

    const { token } = await this.request('GET', '/auth/github/callback?' +
      `code=${code}&state=${state}`);

    this.token = token;
    console.log(token);
  }
}
