/*
 * Copyright 2018 Mia srl
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
*/

'use strict'

const tap = require('tap')
const lc39 = require('@mia-platform/lc39')

const USERID_HEADER_KEY = 'userid-header-key'
const GROUPS_HEADER_KEY = 'groups-header-key'
const CLIENTTYPE_HEADER_KEY = 'clienttype-header-key'
const BACKOFFICE_HEADER_KEY = 'backoffice-header-key'
const MICROSERVICE_GATEWAY_SERVICE_NAME = 'microservice-gateway'
const baseEnv = {
  USERID_HEADER_KEY,
  GROUPS_HEADER_KEY,
  CLIENTTYPE_HEADER_KEY,
  BACKOFFICE_HEADER_KEY,
  MICROSERVICE_GATEWAY_SERVICE_NAME,
}

async function setupFastify(envVariables) {
  const fastify = await lc39('./tests/services/pre-decorator.js', {
    logLevel: 'silent',
    envVariables,
  })
  return fastify
}

tap.test('preDecorator', test => {
  test.test('leaveOriginalRequestUnmodified', async assert => {
    const fastify = await setupFastify(baseEnv)

    const response = await fastify.inject({
      method: 'POST',
      url: '/response-unmodified',
      payload: {
        method: 'GET',
        path: '/the-original-request-path',
        query: { my: 'query' },
        body: { the: 'body' },
        headers: { my: 'headers' },
      },
    })

    assert.strictSame(response.statusCode, 204)
    assert.strictSame(response.payload, '')
    assert.end()
  })

  test.test('changeOriginalRequest', async assert => {
    const fastify = await setupFastify(baseEnv)
    const response = await fastify.inject({
      method: 'POST',
      url: '/change-original-request',
      payload: {
        method: 'GET',
        path: '/the-original-request-path',
        query: { my: 'query' },
        body: { the: 'body' },
        headers: { my: 'headers' },
      },
    })
    assert.strictSame(response.statusCode, 200)
    assert.ok(/application\/json/.test(response.headers['content-type']))
    assert.ok(/charset=utf-8/.test(response.headers['content-type']))
    assert.strictSame(response.payload, JSON.stringify({
      body: { the: 'new-body' },
      query: { new: 'querystring' },
    }))
    assert.end()
  })

  test.test('changeOriginalRequest with headers', async assert => {
    const fastify = await setupFastify(baseEnv)
    const response = await fastify.inject({
      method: 'POST',
      url: '/change-original-headers',
      payload: {
        method: 'GET',
        path: '/the-original-request-path',
        query: { my: 'query' },
        body: { the: 'body' },
        headers: { my: 'headers' },
      },
    })
    assert.strictSame(response.statusCode, 200)
    assert.ok(/application\/json/.test(response.headers['content-type']))
    assert.ok(/charset=utf-8/.test(response.headers['content-type']))
    assert.strictSame(response.payload, JSON.stringify({
      body: { the: 'new-body' },
      headers: { new: 'headers' },
    }))
    assert.end()
  })

  test.test('test bad handler that doesn\'t return the right type', async assert => {
    const fastify = await setupFastify(baseEnv)
    const response = await fastify.inject({
      method: 'POST',
      url: '/bad-hook',
      payload: {
        method: 'GET',
        path: '/the-original-request-path',
        query: { my: 'query' },
        body: { the: 'body' },
        headers: { my: 'headers' },
      },
    })
    assert.strictSame(response.statusCode, 500)
    assert.ok(/application\/json/.test(response.headers['content-type']))
    assert.strictSame(JSON.parse(response.payload), {
      error: 'Internal Server Error',
      message: 'Unknown return type',
      statusCode: 500,
    })
  })

  test.test('abortChain', async assert => {
    const fastify = await setupFastify(baseEnv)
    const response = await fastify.inject({
      method: 'POST',
      url: '/abort-chain',
      payload: {
        method: 'GET',
        path: '/the-original-request-path',
        query: { my: 'query' },
        body: { the: 'body' },
        headers: { my: 'headers' },
      },
    })
    assert.strictSame(response.statusCode, 418)
    assert.ok(/application\/json/.test(response.headers['content-type']))
    assert.ok(/charset=utf-8/.test(response.headers['content-type']))
    assert.strictSame(response.payload, JSON.stringify({
      statusCode: 406,
      body: { the: 'final body' },
      headers: {},
    }))
    assert.end()
  })

  test.test('is able to access to the mia headers correctly', async assert => {
    const fastify = await setupFastify(baseEnv)
    const response = await fastify.inject({
      method: 'POST',
      url: '/can-access-data',
      payload: {
        method: 'GET',
        path: '/the-original-request-path',
        query: { my: 'query' },
        body: { the: 'body' },
        headers: {
          [CLIENTTYPE_HEADER_KEY]: 'CMS',
          [USERID_HEADER_KEY]: 'userid',
          [GROUPS_HEADER_KEY]: 'group-to-greet,group',
          [BACKOFFICE_HEADER_KEY]: '1',
          my: 'headers',
        },
      },
    })
    assert.strictSame(response.statusCode, 204)
    assert.strictSame(response.payload, '')
    assert.end()
  })

  test.test('addPreDecorator is Chainable', async assert => {
    const fastify = await setupFastify(baseEnv)
    const response = await fastify.inject({
      method: 'POST',
      url: '/chained1',
      payload: {
        method: 'GET',
        path: '/the-original-request-path',
        query: { my: 'query' },
        body: { the: 'body' },
        headers: { my: 'headers' },
      },
    })
    assert.strictSame(response.statusCode, 204)

    const response1 = await fastify.inject({
      method: 'POST',
      url: '/chained2',
      payload: {
        method: 'GET',
        path: '/the-original-request-path',
        query: { my: 'query' },
        body: { the: 'body' },
        headers: { my: 'headers' },
      },
    })
    assert.strictSame(response1.statusCode, 204)
  })

  test.end()
})
