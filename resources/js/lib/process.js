/**
 * What happens to an rrweb event between the recorder and the wire, and the
 * reverse in the player. Pure functions over plain objects, so they run in
 * Node for the tests.
 *
 * rrweb shapes used here: a full snapshot is { type: 2, data: { node } }, a
 * mutation is { type: 3, data: { source: 0, adds: [{ node }], attributes:
 * [{ id, attributes }] } }; a serialized element is { type: 2, tagName,
 * attributes, childNodes }, a text node { type: 3, textContent, isStyle }.
 * An inlined stylesheet sits in attributes._cssText (link, or a style
 * element built from rules) or in the text child of a style element.
 */

export const EVENT_FULL_SNAPSHOT = 2;
export const EVENT_INCREMENTAL = 3;
export const SOURCE_MUTATION = 0;
const NODE_ELEMENT = 2;
const NODE_TEXT = 3;

const ASSET_PREFIX = '/*sr-asset:';
const ASSET_SUFFIX = '*/';
const ASSET_PATTERN = /^\/\*sr-asset:([a-f0-9]{64})\*\/$/;

export function assetPlaceholder(hash) {
    return ASSET_PREFIX + hash + ASSET_SUFFIX;
}

export function assetHash(text) {
    const match = typeof text === 'string' && text.length === ASSET_PREFIX.length + 64 + ASSET_SUFFIX.length ? ASSET_PATTERN.exec(text) : null;

    return match ? match[1] : null;
}

/** ['wire:*', 'x-cloak'] → a test for an attribute name: exact names, or a prefix when the pattern ends in *. */
function nameTest(patterns) {
    const exact = new Set();
    const prefixes = [];

    for (const pattern of patterns) {
        if (typeof pattern !== 'string' || pattern === '' || pattern === '*') continue;

        pattern.endsWith('*') ? prefixes.push(pattern.slice(0, -1)) : exact.add(pattern);
    }

    if (exact.size === 0 && prefixes.length === 0) return null;

    return (name) => exact.has(name) || prefixes.some((prefix) => name.startsWith(prefix));
}

/** ['wire:*', 'x-*'] → a test for an attribute to drop; names matching `keep` always stay. */
export function attributeMatcher(patterns = [], keep = []) {
    const dropped = nameTest(patterns);
    const kept = nameTest(keep);

    if (dropped === null) return null;

    return (name) => dropped(name) && !(kept && kept(name));
}

/** Every serialized node an event carries: the snapshot's tree or the trees a mutation added. */
function roots(event) {
    if (event.type === EVENT_FULL_SNAPSHOT && event.data && event.data.node) return [event.data.node];

    if (event.type === EVENT_INCREMENTAL && event.data && event.data.source === SOURCE_MUTATION) {
        return (event.data.adds || []).map((add) => add.node).filter(Boolean);
    }

    return [];
}

function walk(node, visit) {
    const stack = [node];

    while (stack.length) {
        const current = stack.pop();

        visit(current);

        if (current.childNodes) for (const child of current.childNodes) stack.push(child);
    }
}

/**
 * Drop the attributes the player never uses (it runs no scripts): Livewire's
 * wire:snapshot and wire:effects, Alpine expressions and the like. Mutates.
 */
export function stripAttributes(event, matches) {
    if (!matches) return event;

    for (const root of roots(event)) {
        walk(root, (node) => {
            if (node.type !== NODE_ELEMENT || !node.attributes) return;

            for (const name of Object.keys(node.attributes)) {
                if (name !== '_cssText' && matches(name)) delete node.attributes[name];
            }
        });
    }

    if (event.type === EVENT_INCREMENTAL && event.data && event.data.source === SOURCE_MUTATION && event.data.attributes) {
        event.data.attributes = event.data.attributes.filter((change) => {
            for (const name of Object.keys(change.attributes || {})) {
                if (matches(name)) delete change.attributes[name];
            }

            // A change that only touched dropped attributes says nothing any more.
            return Object.keys(change.attributes || {}).length > 0 || change.styleDiff || change._unchangedStyles;
        });
    }

    return event;
}

/**
 * The places an event holds stylesheet text: [{ holder, key, text }], where
 * holder[key] is the text (or, in the player, the placeholder).
 */
export function styleSlots(event, minBytes = 0) {
    const slots = [];

    for (const root of roots(event)) {
        walk(root, (node) => {
            if (node.type === NODE_ELEMENT && node.attributes && typeof node.attributes._cssText === 'string' && node.attributes._cssText.length >= minBytes) {
                slots.push({ holder: node.attributes, key: '_cssText', text: node.attributes._cssText });
            }

            if (node.type === NODE_TEXT && node.isStyle && typeof node.textContent === 'string' && node.textContent.length >= minBytes) {
                slots.push({ holder: node, key: 'textContent', text: node.textContent });
            }
        });
    }

    return slots;
}

/** Hashes the player has to fetch before it can show these events. */
export function referencedAssets(events) {
    const hashes = new Set();

    for (const event of events) {
        for (const slot of styleSlots(event)) {
            const hash = assetHash(slot.text);

            if (hash) hashes.add(hash);
        }
    }

    return [...hashes];
}

/** Put the stylesheets back; a hash without text becomes an empty sheet rather than a comment that hides the gap. */
export function restoreAssets(events, texts) {
    for (const event of events) {
        for (const slot of styleSlots(event)) {
            const hash = assetHash(slot.text);

            if (hash) slot.holder[slot.key] = texts.get(hash) ?? '';
        }
    }

    return events;
}

/** Oldest first, which is what the replayer expects after chunks arrive out of order. */
export function sortEvents(events) {
    return events.sort((a, b) => a.timestamp - b.timestamp);
}
