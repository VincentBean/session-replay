/**
 * The pointer trail, as pure functions: which recorded mouse positions are
 * still on screen at a moment of the replay, and how strongly each piece of
 * the line is drawn. Times are replay time in milliseconds, so the trail
 * freezes on pause, follows the playback speed and clears on a seek.
 */

// A pause longer than this between two positions starts a new line instead of joining them.
export const TRAIL_GAP = 400;

/**
 * The positions still visible at `now`: younger than `duration` and not in the
 * future (a seek backwards leaves those behind).
 */
export function livePoints(points, now, duration) {
    return points.filter((point) => point.t <= now && now - point.t < duration);
}

/**
 * The line between consecutive live positions, each piece fading with the age
 * of its newer end: 1 when just drawn, towards 0 at `duration`.
 */
export function trailSegments(points, now, duration, gap = TRAIL_GAP) {
    const segments = [];

    for (let index = 1; index < points.length; index++) {
        const from = points[index - 1];
        const to = points[index];

        if (to.t - from.t > gap) continue;

        segments.push({ from, to, alpha: Math.max(0, Math.min(1, 1 - (now - to.t) / duration)) });
    }

    return segments;
}

/** True when a class attribute (a MutationObserver's oldValue) carries `name` as a whole class. */
export function hasClass(value, name) {
    return (value || '').split(/\s+/).includes(name);
}
