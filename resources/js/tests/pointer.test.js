import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hasClass, livePoints, trailSegments } from '../lib/pointer.js';

const point = (t, x = t, y = t) => ({ x, y, t });

test('a position stays on the trail for the duration, then leaves it', () => {
    const points = [point(0), point(500), point(900)];

    assert.deepEqual(livePoints(points, 1000, 1000), [point(500), point(900)]);
    assert.deepEqual(livePoints(points, 1950, 1000), []);
});

test('positions after the current moment are dropped, so a seek backwards clears them', () => {
    assert.deepEqual(livePoints([point(100), point(5000)], 200, 1000), [point(100)]);
});

test('each piece fades with the age of its newer end', () => {
    const segments = trailSegments([point(0), point(50), point(100)], 100, 1000);

    assert.equal(segments.length, 2);
    assert.equal(segments[0].alpha, 0.95);
    assert.equal(segments[1].alpha, 1);
});

test('a pause between two positions breaks the line', () => {
    const segments = trailSegments([point(0), point(50), point(2000), point(2050)], 2050, 3000);

    assert.deepEqual(segments.map(({ from, to }) => [from.t, to.t]), [[0, 50], [2000, 2050]]);
});

test('the alpha never leaves 0..1', () => {
    const [segment] = trailSegments([point(0), point(10)], 5000, 1000);

    assert.equal(segment.alpha, 0);
});

test('a class is found only as a whole class', () => {
    assert.equal(hasClass('replayer-mouse active', 'active'), true);
    assert.equal(hasClass('replayer-mouse touch-active', 'active'), false);
    assert.equal(hasClass(null, 'active'), false);
});
