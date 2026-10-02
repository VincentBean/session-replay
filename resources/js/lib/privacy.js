/**
 * Privacy helpers for what the recorder sends besides the DOM: URLs lose the
 * values of query parameters that carry secrets (password-reset and API
 * tokens, signed-URL signatures, OAuth codes), and hidden inputs lose their
 * values. Pure functions, tested with node --test.
 */

const NODE_ELEMENT = 2;
const EVENT_FULL_SNAPSHOT = 2;
const EVENT_INCREMENTAL = 3;
const SOURCE_MUTATION = 0;

export const REDACTED = 'redacted';

function nameSet(names) {
    return new Set((names || []).map((name) => String(name).toLowerCase()));
}

/** The URL with the value of every listed query parameter (any case) replaced. Unparseable input comes back as is. */
export function redactUrl(url, names, base = undefined) {
    const redacted = nameSet(names);

    if (!url || redacted.size === 0) return url;

    let parsed;

    try {
        parsed = new URL(url, base);
    } catch {
        return url;
    }

    let changed = false;

    for (const key of [...parsed.searchParams.keys()]) {
        if (redacted.has(key.toLowerCase()) && parsed.searchParams.get(key) !== REDACTED) {
            parsed.searchParams.set(key, REDACTED);
            changed = true;
        }
    }

    return changed ? parsed.toString() : url;
}

/** Every http(s) URL inside a text (a stack trace, a message) redacted the same way. */
export function redactUrls(text, names) {
    if (!text || nameSet(names).size === 0) return text;

    // A stack frame ends the URL with :line:column, which is not part of the query.
    return String(text).replace(/(https?:\/\/[^\s"'<>()]+?)((?::\d+){1,2})?(?=[\s"'<>()]|$)/g, (match, url, position = '') => redactUrl(url, names) + position);
}

const URL_ATTRIBUTES = ['href', 'src', 'action', 'formaction'];

/**
 * Redact the URLs the page itself carries: links, images, form actions, in a
 * snapshot, in the nodes a mutation adds and in changed attributes (a skip
 * link to the current page, a signed link in a list). Mutates.
 */
export function redactUrlAttributes(event, names, base = undefined) {
    if (nameSet(names).size === 0) return event;

    const redactIn = (attributes) => {
        if (!attributes) return;

        for (const name of URL_ATTRIBUTES) {
            if (typeof attributes[name] === 'string' && attributes[name].includes('?')) attributes[name] = redactUrl(attributes[name], names, base);
        }
    };

    for (const root of rootsOf(event)) walk(root, (node) => node.type === NODE_ELEMENT && redactIn(node.attributes));

    if (event.type === EVENT_INCREMENTAL && event.data && event.data.source === SOURCE_MUTATION) {
        for (const change of event.data.attributes || []) redactIn(change.attributes);
    }

    return event;
}

function rootsOf(event) {
    const roots = [];

    if (event.type === EVENT_FULL_SNAPSHOT && event.data && event.data.node) roots.push(event.data.node);

    if (event.type === EVENT_INCREMENTAL && event.data && event.data.source === SOURCE_MUTATION) {
        for (const add of event.data.adds || []) if (add.node) roots.push(add.node);
    }

    return roots;
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
 * Drop the value of every <input type="hidden"> in a snapshot or in the nodes
 * a mutation adds: rrweb masks what people type, not what the page put there
 * (a CSRF token, an id, a signature). Mutates.
 */
export function dropHiddenValues(event) {
    for (const root of rootsOf(event)) {
        walk(root, (node) => {
            if (node.type === NODE_ELEMENT && node.tagName === 'input' && node.attributes && String(node.attributes.type || '').toLowerCase() === 'hidden') {
                delete node.attributes.value;
            }
        });
    }

    return event;
}
