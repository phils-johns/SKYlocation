const FILE_PATH = 'data/availability.json';
const REPOSITORY = process.env.GITHUB_REPOSITORY || 'phils-johns/SKYlocation';
const BRANCH = process.env.GITHUB_BRANCH || process.env.VERCEL_GIT_COMMIT_REF || 'main';

function sendJson(response, status, payload) {
    response.status(status).setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify(payload));
}

function getSessionToken(request) {
    const cookies = (request.headers.cookie || '').split(';');
    const sessionCookie = cookies.find(function(cookie) {
        return cookie.trim().startsWith('github_session=');
    });
    return sessionCookie ? decodeURIComponent(sessionCookie.trim().slice('github_session='.length)) : '';
}

function isSameOrigin(request) {
    const origin = request.headers.origin;
    const host = request.headers['x-forwarded-host'] || request.headers.host;
    const protocol = (request.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
    const expectedOrigin = process.env.APP_ORIGIN || protocol + '://' + host;
    return Boolean(origin && origin === expectedOrigin);
}

async function hasRepositoryWriteAccess(token) {
    const response = await fetch('https://api.github.com/repos/' + REPOSITORY, {
        headers: {
            Accept: 'application/vnd.github+json',
            Authorization: 'Bearer ' + token,
            'X-GitHub-Api-Version': '2022-11-28'
        }
    });
    if (!response.ok) return false;

    const repository = await response.json();
    return Boolean(repository.permissions && repository.permissions.push);
}

function isValidData(data) {
    return data &&
        Array.isArray(data.logements) &&
        Array.isArray(data.vehicules) &&
        data.logements.length <= 500 &&
        data.vehicules.length <= 500 &&
        [...data.logements, ...data.vehicules].every(function(item) {
            return item && typeof item.id === 'string' && typeof item.name === 'string';
        });
}

module.exports = async function handler(request, response) {
    if (request.method !== 'POST' && request.method !== 'PUT') {
        response.setHeader('Allow', 'POST, PUT');
        return sendJson(response, 405, { error: 'Méthode non autorisée.' });
    }

    if (!isSameOrigin(request)) {
        return sendJson(response, 403, { error: 'Origine non autorisée.' });
    }

    const githubToken = getSessionToken(request);
    if (!githubToken || !await hasRepositoryWriteAccess(githubToken)) {
        return sendJson(response, 401, { error: 'Accès non autorisé.' });
    }

    if (request.method === 'POST') {
        response.status(204).end();
        return;
    }

    let data;
    try {
        data = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
    } catch (error) {
        return sendJson(response, 400, { error: 'Corps JSON invalide.' });
    }
    if (!isValidData(data)) {
        return sendJson(response, 400, { error: 'Données de disponibilités invalides.' });
    }

    const apiUrl = 'https://api.github.com/repos/' + REPOSITORY + '/contents/' + FILE_PATH;
    const headers = {
        Accept: 'application/vnd.github+json',
        Authorization: 'Bearer ' + githubToken,
        'X-GitHub-Api-Version': '2022-11-28'
    };

    try {
        const currentFile = await fetch(apiUrl + '?ref=' + encodeURIComponent(BRANCH), { headers: headers });
        if (!currentFile.ok) {
            return sendJson(response, 502, { error: 'Impossible de lire le fichier du dépôt.' });
        }

        const current = await currentFile.json();
        const update = await fetch(apiUrl, {
            method: 'PUT',
            headers: Object.assign({ 'Content-Type': 'application/json' }, headers),
            body: JSON.stringify({
                message: 'Update availability from dashboard',
                content: Buffer.from(JSON.stringify(data, null, 2) + '\n').toString('base64'),
                sha: current.sha,
                branch: BRANCH
            })
        });

        if (update.status === 409 || update.status === 422) {
            return sendJson(response, 409, { error: 'Le dépôt a changé entre-temps. Rechargez les données puis réessayez.' });
        }
        if (!update.ok) {
            return sendJson(response, 502, { error: 'GitHub n’a pas accepté la mise à jour.' });
        }

        return sendJson(response, 200, { ok: true });
    } catch (error) {
        return sendJson(response, 502, { error: 'Échec de la communication avec GitHub.' });
    }
};