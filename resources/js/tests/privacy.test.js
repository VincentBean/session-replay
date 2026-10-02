import assert from 'node:assert/strict';
import { test } from 'node:test';
import { REDACTED, dropHiddenValues, redactUrl, redactUrlAttributes, redactUrls } from '../lib/privacy.js';

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

test('links, sources and form actions in the page are redacted, in snapshots and in changed attributes', () => {
    const snapshot = {
        type: 2,
        data: {
            node: {
                type: 0,
                childNodes: [
                    { type: 2, tagName: 'a', attributes: { href: '/orders?token=abc#main', class: 'skip' }, childNodes: [] },
                    { type: 2, tagName: 'form', attributes: { action: 'https://app.test/invite?signature=xyz' }, childNodes: [] },
                    { type: 2, tagName: 'a', attributes: { href: '/orders?page=2' }, childNodes: [] },
                ],
            },
        },
    };

    redactUrlAttributes(snapshot, names, 'https://app.test');

    const [skip, form, plain] = snapshot.data.node.childNodes;

    assert.equal(skip.attributes.href, `https://app.test/orders?token=${REDACTED}#main`);
    assert.equal(skip.attributes.class, 'skip');
    assert.equal(form.attributes.action, `https://app.test/invite?signature=${REDACTED}`);
    assert.equal(plain.attributes.href, '/orders?page=2');

    const change = { type: 3, data: { source: 0, adds: [], attributes: [{ id: 5, attributes: { href: '/verify?code=1' } }] } };

    redactUrlAttributes(change, names, 'https://app.test');

    assert.equal(change.data.attributes[0].attributes.href, `https://app.test/verify?code=${REDACTED}`);
});
