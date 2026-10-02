import assert from 'node:assert/strict';
import { test } from 'node:test';
import { REDACTED, dropHiddenValues, redactUrl, redactUrls } from '../lib/privacy.js';

const names = ['token', 'signature', 'code', 'email'];

test('the values of listed query parameters are replaced, in any case, and the rest stays', () => {
    assert.equal(
        redactUrl('https://app.test/admin/password-reset/reset?email=ada%40example.com&Token=abc&signature=123&page=2', names),
        `https://app.test/admin/password-reset/reset?email=${REDACTED}&Token=${REDACTED}&signature=${REDACTED}&page=2`,
    );
});

test('a URL without secrets comes back exactly as it was', () => {
    assert.equal(redactUrl('https://app.test/orders?page=2&sort=-total', names), 'https://app.test/orders?page=2&sort=-total');
    assert.equal(redactUrl('not a url', names), 'not a url');
    assert.equal(redactUrl('https://app.test/?code=1', []), 'https://app.test/?code=1');
});

test('relative URLs are resolved against a base', () => {
    assert.equal(redactUrl('/callback?code=xyz&state=1', ['code'], 'https://app.test'), `https://app.test/callback?code=${REDACTED}&state=1`);
});

test('URLs inside a text are redacted where they stand', () => {
    const stack = 'TypeError: x\n    at https://app.test/js/app.js?token=abc:10:5\n    at (https://app.test/orders?page=1)';

    assert.equal(redactUrls(stack, names), `TypeError: x\n    at https://app.test/js/app.js?token=${REDACTED}:10:5\n    at (https://app.test/orders?page=1)`);
});

test('hidden inputs lose their value in a snapshot and in added nodes', () => {
    const snapshot = {
        type: 2,
        data: {
            node: {
                type: 0,
                childNodes: [
                    { type: 2, tagName: 'input', attributes: { type: 'hidden', name: '_token', value: 'secret' }, childNodes: [] },
                    { type: 2, tagName: 'input', attributes: { type: 'text', value: '***' }, childNodes: [] },
                ],
            },
        },
    };

    dropHiddenValues(snapshot);

    assert.equal(snapshot.data.node.childNodes[0].attributes.value, undefined);
    assert.equal(snapshot.data.node.childNodes[1].attributes.value, '***');

    const mutation = { type: 3, data: { source: 0, adds: [{ node: { type: 2, tagName: 'input', attributes: { type: 'HIDDEN', value: 'sig' } } }] } };

    dropHiddenValues(mutation);

    assert.equal(mutation.data.adds[0].node.attributes.value, undefined);
});
