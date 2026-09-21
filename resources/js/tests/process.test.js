import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    assetHash,
    assetPlaceholder,
    attributeMatcher,
    referencedAssets,
    restoreAssets,
    sortEvents,
    stripAttributes,
    styleSlots,
} from '../lib/process.js';

const hash = 'a'.repeat(64);

const snapshot = () => ({
    type: 2,
    timestamp: 10,
    data: {
        node: {
            type: 0,
            childNodes: [
                {
                    type: 2,
                    tagName: 'html',
                    attributes: {},
                    childNodes: [
                        { type: 2, tagName: 'link', attributes: { _cssText: 'body{color:red}'.repeat(200) }, childNodes: [] },
                        { type: 2, tagName: 'style', attributes: {}, childNodes: [{ type: 3, isStyle: true, textContent: '.a{b:c}'.repeat(400) }] },
                        {
                            type: 2,
                            tagName: 'div',
                            attributes: { class: 'fi-page', 'wire:snapshot': '{"data":1}', 'wire:id': 'abc', 'x-data': '{open:false}', '@click': 'go()', ':class': 'x', 'x-cloak': '', 'data-id': '7' },
                            childNodes: [{ type: 3, textContent: 'Hello' }],
                        },
                    ],
                },
            ],
        },
    },
});

test('attributeMatcher honours wildcards, exact names and the keep list', () => {
    const matches = attributeMatcher(['wire:*', 'x-*', '@*', ':*', 'ax-load*', 'data-secret'], ['x-cloak', 'wire:loading*']);

    // Livewire hides [wire:loading] elements with a stylesheet rule; without the attribute every spinner shows.
    assert.equal(matches('wire:loading'), false);
    assert.equal(matches('wire:loading.delay'), false);
    assert.equal(matches('wire:target'), true);

    assert.equal(matches('wire:snapshot'), true);
    assert.equal(matches('x-data'), true);
    assert.equal(matches('@click'), true);
    assert.equal(matches(':class'), true);
    assert.equal(matches('data-secret'), true);
    assert.equal(matches('x-cloak'), false);
    assert.equal(matches('class'), false);
    assert.equal(matches('data-id'), false);
    assert.equal(attributeMatcher([], []), null);
});

test('stripAttributes cleans snapshots and keeps what a stylesheet can select on', () => {
    const event = stripAttributes(snapshot(), attributeMatcher(['wire:*', 'x-*', '@*', ':*'], ['x-cloak']));
    const div = event.data.node.childNodes[0].childNodes[2];

    assert.deepEqual(Object.keys(div.attributes).sort(), ['class', 'data-id', 'x-cloak']);
    assert.ok(event.data.node.childNodes[0].childNodes[0].attributes._cssText);
});

test('stripAttributes cleans mutations and drops changes that became empty', () => {
    const event = stripAttributes(
        {
            type: 3,
            timestamp: 20,
            data: {
                source: 0,
                adds: [{ parentId: 1, nextId: null, node: { type: 2, tagName: 'p', attributes: { 'wire:key': 'k', id: 'p' }, childNodes: [] } }],
                attributes: [
                    { id: 5, attributes: { 'wire:snapshot': '{}' } },
                    { id: 6, attributes: { 'wire:effects': '[]', class: 'open' } },
                ],
                removes: [],
                texts: [],
            },
        },
        attributeMatcher(['wire:*']),
    );

    assert.deepEqual(event.data.adds[0].node.attributes, { id: 'p' });
    assert.deepEqual(event.data.attributes, [{ id: 6, attributes: { class: 'open' } }]);
});

test('styleSlots finds link and style text above the size floor', () => {
    assert.equal(styleSlots(snapshot(), 1024).length, 2);
    assert.equal(styleSlots(snapshot(), 1_000_000).length, 0);
});

test('placeholders round-trip through referencedAssets and restoreAssets', () => {
    const event = snapshot();
    const slots = styleSlots(event, 1024);
    const link = slots.find((slot) => slot.key === '_cssText');
    const style = slots.find((slot) => slot.key === 'textContent');
    const original = link.text;

    link.holder[link.key] = assetPlaceholder(hash);
    style.holder[style.key] = assetPlaceholder('b'.repeat(64));

    assert.equal(assetHash(assetPlaceholder(hash)), hash);
    assert.equal(assetHash('/*sr-asset:nope*/'), null);
    assert.deepEqual(referencedAssets([event]).sort(), [hash, 'b'.repeat(64)]);

    restoreAssets([event], new Map([[hash, original]]));

    assert.equal(event.data.node.childNodes[0].childNodes[0].attributes._cssText, original);
    // Unknown hash: an empty sheet, not a stray comment.
    assert.equal(event.data.node.childNodes[0].childNodes[1].childNodes[0].textContent, '');
});

test('sortEvents orders by timestamp', () => {
    assert.deepEqual(sortEvents([{ timestamp: 3 }, { timestamp: 1 }, { timestamp: 2 }]).map((e) => e.timestamp), [1, 2, 3]);
});
