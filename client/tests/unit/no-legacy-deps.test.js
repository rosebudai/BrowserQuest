const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { execSync } = require('node:child_process');
const path = require('node:path');

const CLIENT_JS = path.resolve(__dirname, '../../js');

function grepClientJS(pattern) {
    try {
        const result = execSync(
            `grep -rn '${pattern}' ${CLIENT_JS}/*.js ${CLIENT_JS}/server/*.js 2>/dev/null || true`,
            { encoding: 'utf8' }
        );
        return result.trim().split('\n').filter(Boolean);
    } catch {
        return [];
    }
}

describe('No legacy dependencies remain in active code', () => {
    it('no underscore _.method() calls', () => {
        const matches = grepClientJS('\\b_\\.');
        assert.deepEqual(matches, [], `Found _.method() calls:\n${matches.join('\n')}`);
    });

    it('no underscore _(wrapped) calls', () => {
        const matches = grepClientJS('\\b_(' ).filter(
            // Exclude false positives: _customIdle, _onLootAction, _playDivHandler, etc.
            line => /\b_\(/.test(line)
        );
        assert.deepEqual(matches, [], `Found _(wrapped) calls:\n${matches.join('\n')}`);
    });

    it('no jQuery $() calls', () => {
        const matches = grepClientJS('\\$(' ).filter(
            // Exclude false positives like template literals with ${
            line => /\$\(/.test(line) && !/\$\{/.test(line)
        );
        assert.deepEqual(matches, [], `Found $() calls:\n${matches.join('\n')}`);
    });

    it('no var declarations', () => {
        const matches = grepClientJS('\\bvar ');
        assert.deepEqual(matches, [], `Found var declarations:\n${matches.join('\n')}`);
    });

    it('no Class.extend usage', () => {
        const matches = grepClientJS('Class\\.extend');
        assert.deepEqual(matches, [], `Found Class.extend:\n${matches.join('\n')}`);
    });
});
