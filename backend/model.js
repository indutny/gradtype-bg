'use strict';

const CUTOFF = 1.8775921096422477;
const NEIGHBORS = 30;

// Do not carry full assert to the browser
function assert(exp) {
  if (!exp)
    throw new Error('Assertion failure');
}
assert.strictEqual = (a, b) => {
  if (a !== b)
    throw new Error(`Assert equal failure ${a} !== ${b}`);
};

function distance(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += (a[i] - b[i]) ** 2;
  }
  return Math.sqrt(sum);
}

function matmul(vec, mat) {
  assert.strictEqual(vec.length, mat.length);

  const res = new Array(mat[0].length).fill(0);
  for (let j = 0; j < res.length; j++) {
    let acc = 0;
    for (let i = 0; i < vec.length; i++) {
      acc += vec[i] * mat[i][j];
    }
    res[j] = acc;
  }

  return res;
}

function matmulT(vec, mat) {
  assert.strictEqual(vec.length, mat[0].length);

  const res = new Array(mat.length).fill(0);
  for (let j = 0; j < res.length; j++) {
    let acc = 0;
    for (let i = 0; i < vec.length; i++) {
      acc += vec[i] * mat[j][i];
    }
    res[j] = acc;
  }

  return res;
}

function add(a, b) {
  assert.strictEqual(a.length, b.length);

  const res = a.slice();
  for (let i = 0; i < res.length; i++) {
    res[i] += b[i];
  }
  return res;
}

function mul(a, b) {
  assert.strictEqual(a.length, b.length);

  const res = a.slice();
  for (let i = 0; i < res.length; i++) {
    res[i] *= b[i];
  }
  return res;
}

function tanh(x) {
  const res = x.slice();
  for (let i = 0; i < res.length; i++) {
    res[i] = Math.tanh(res[i]);
  }
  return res;
}

function sigmoid(x) {
  const res = x.slice();
  for (let i = 0; i < res.length; i++) {
    res[i] = 1 / (1 + Math.exp(-res[i]));
  }
  return res;
}

function nop(x) {
  return x;
}

function selu(x) {
  const alpha = 1.6732632423543772848170429916717;
  const scale = 1.0507009873554804934193349852946;

  const res = x.slice();
  for (let i = 0; i < res.length; i++) {
    const x = res[i];
    res[i] = scale * (x > 0 ? x : (alpha * Math.exp(x) - alpha));
  }
  return res;
}

class LSTM {
  constructor(kernel, bias) {
    this.kernel = kernel;
    this.bias = bias;

    this.units = (this.kernel[0].length / 4) | 0;
    this.forgetBias = new Array(this.units).fill(1);
    this.activation = tanh;

    this.initialState = {
      c: new Array(this.units).fill(0),
      h: new Array(this.units).fill(0),
    };
  }

  call(input, state = this.initialState) {
    const x = input.concat(state.h);

    const gateInputs = add(matmul(x, this.kernel), this.bias);

    const i = gateInputs.slice(0, this.units);
    const j = gateInputs.slice(this.units, 2 * this.units);
    const f = gateInputs.slice(2 * this.units, 3 * this.units);
    const o = gateInputs.slice(3 * this.units);

    const newC = add(mul(state.c, sigmoid(add(f, this.forgetBias))),
        mul(sigmoid(i), this.activation(j)));
    const newH = mul(this.activation(newC), sigmoid(o));

    return { result: newH, state: { c: newC, h: newH } };
  }
}

class Dense {
  constructor(kernel, bias, activation = selu) {
    this.kernel = kernel;
    this.bias = bias;
    this.activation = activation;
  }

  call(input) {
    return this.activation(add(matmul(input, this.kernel), this.bias));
  }
}

class Model {
  constructor(weights) {
    this.embedding = weights['embedding/weights:0'];
    this.times = new Dense(weights['process_times/kernel:0'],
                           weights['process_times/bias:0'],
                           nop);
    this.lstm = new LSTM(
      weights['rnn/multi_rnn_cell/cell_0/lstm_fw_0/kernel:0'],
      weights['rnn/multi_rnn_cell/cell_0/lstm_fw_0/bias:0']);

    this.post = new Dense(weights['dense_post_0/kernel:0'],
                          weights['dense_post_0/bias:0']);
    this.features = new Dense(weights['features/kernel:0'],
                              weights['features/bias:0'],
                              nop);

    this.outSize = weights['features/bias:0'].length;
    this.cutoff = CUTOFF;
  }

  applyEmbedding(event) {
    const embedding = this.embedding[event.code + 1];
    let times = [ event.hold, event.duration ];

    times = this.times.call(times);

    return times.concat(embedding);
  }

  call(events) {
    let state = this.lstm.initialState;
    let lastResult = null;

    for (const event of events) {
      const embedding = this.applyEmbedding(event);

      const { result, state: newState } = this.lstm.call(embedding, state);
      lastResult = result;
      state = newState;
    }

    let x = lastResult;
    x = this.post.call(x);
    x = this.features.call(x);

    return x;
  }

  computeDistance(features, list) {
    if (list.length === 0) {
      return Infinity;
    }

    if (features.length !== this.outSize) {
      throw new Error('Invalid features');
    }

    let distances = [];
    for (const sample of list) {
      distances.push(distance(features, sample));
    }

    distances.sort();
    distances = distances.slice(0, NEIGHBORS);

    let mean = 0;
    for (const d of distances) {
      mean += d;
    }
    mean /= distances.length;
    mean /= CUTOFF;

    return mean;
  }
}

module.exports = Model;
