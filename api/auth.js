const crypto = require('node:crypto');

const REPOSITORY = process.env.GITHUB_REPOSITORY || 'phils-johns/SKYlocation';
const SESSION_COOKIE = 'github_session';
const STATE_COOKIE = 'oauth_state';

function getOrigin(request) {
    const host = request.headers['x-forwarded-host'] || request.headers.host;
    const protocol = (request.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
    return process.env.APP_ORIGIN || protocol + '://' + host;
}

function getCookie(request, name) {
    const cookie = (request.headers.cookie || '').split(';').find(function(value) {
        return value.trim().startsWith(name + '=');
    });
    return cookie ? decodeURIComponent(cookie.trim().slice(name.length + 1)) : '';
}

function setCookies(response, cookies) {
    response.setHeader('Set-Cookie', cookies);
}

function redirect(response, destination) {
    response.status(302).setHeader('Location', destination);
    response.end();
}

function clearStateCookie() {
    return STATE_COOKIE + '=; Path=/api/auth; HttpOnly; Secure; SameSite=Lax; Max-Age=0';
}

function sameState(expected, provided) {
    if (!expected || !provided) return false;
    const expectedBuffer = Buffer.from(expected);
    const providedBuffer = Buffer.from(provided);
    return expectedBuffer.length === providedBuffer.length &&
        crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}

module.exports = async function handler(request, response) {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    const origin = getOrigin(request);
    const redirectUri = process.env.GITHUB_OAUTH_REDIRECT_URI || origin + '/api/auth';

    if (request.method === 'POST') {
        if (request.headers.origin !== origin) {
            response.status(403).end();
            return;
        }
        setCookies(response, [
            SESSION_COOKIE + '=; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=0',
            clearStateCookie()
        ]);
        response.status(204).end();
        return;
    }

    if (request.method !== 'GET') {
        response.setHeader('Allow', 'GET, POST');
        response.status(405).end();
        return;
    }

    const url = new URL(request.url, origin);
    const code = url.searchParams.get('code');
    if (!code) {
        if (url.searchParams.has('error')) {
            setCookies(response, [clearStateCookie()]);
            redirect(response, origin + '/dashboard?auth=denied');
            return;
        }
        if (!clientId || !clientSecret) {
            response.status(500).end('OAuth GitHub n’est pas configuré.');
            return;
        }

        const state = crypto.randomBytes(32).toString('hex');
        const authorizeUrl = new URL('https://github.com/login/oauth/authorize');
        authorizeUrl.searchParams.set('client_id', clientId);
        authorizeUrl.searchParams.set('redirect_uri', redirectUri);
        authorizeUrl.searchParams.set('scope', process.env.GITHUB_OAUTH_SCOPE || 'public_repo');
        authorizeUrl.searchParams.set('state', state);
        setCookies(response, [STATE_COOKIE + '=' + state + '; Path=/api/auth; HttpOnly; Secure; SameSite=Lax; Max-Age=600']);
        redirect(response, authorizeUrl.toString());
        return;
    }

    const state = url.searchParams.get('state');
    const savedState = getCookie(request, STATE_COOKIE);
    if (!sameState(savedState, state)) {
        setCookies(response, [clearStateCookie()]);
        redirect(response, origin + '/dashboard?auth=denied');
        return;
    }

    try {
        const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: clientId,
                client_secret: clientSecret,
                code: code,
                redirect_uri: redirectUri
            })
        });
        const tokenResult = await tokenResponse.json();
        if (!tokenResponse.ok || !tokenResult.access_token) throw new Error('OAuth exchange failed');

        const repositoryResponse = await fetch('https://api.github.com/repos/' + REPOSITORY, {
            headers: {
                Accept: 'application/vnd.github+json',
                Authorization: 'Bearer ' + tokenResult.access_token,
                'X-GitHub-Api-Version': '2022-11-28'
            }
        });
        const repository = repositoryResponse.ok ? await repositoryResponse.json() : null;
        if (!repository || !repository.permissions || !repository.permissions.push) {
            setCookies(response, [clearStateCookie()]);
            redirect(response, origin + '/dashboard?auth=forbidden');
            return;
        }

        setCookies(response, [
            SESSION_COOKIE + '=' + encodeURIComponent(tokenResult.access_token) + '; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=28800',
            clearStateCookie()
        ]);
        redirect(response, origin + '/dashboard');
    } catch (error) {
        setCookies(response, [clearStateCookie()]);
        redirect(response, origin + '/dashboard?auth=denied');
    }
};