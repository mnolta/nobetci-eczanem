#!/usr/bin/env node
const axios = require('axios');

async function createIssue(owner, repo, token, title, body) {
  const url = `https://api.github.com/repos/${owner}/${repo}/issues`;
  const headers = {
    Authorization: `token ${token}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'nobetci-eczanem-monitor'
  };

  // Avoid duplicate open issues with same title
  try {
    const listUrl = `https://api.github.com/repos/${owner}/${repo}/issues?state=open&per_page=100`;
    const listRes = await axios.get(listUrl, { headers });
    const exists = (listRes.data || []).some(i => i.title === title);
    if (exists) {
      console.log('Open issue with same title already exists, skipping creation.');
      return;
    }
  } catch (e) {
    console.warn('Could not list issues to dedupe:', e.message);
    // continue and attempt to create issue anyway
  }

  try {
    const res = await axios.post(url, { title, body, labels: ['monitoring'] }, { headers });
    console.log('Created issue:', res.data.html_url);
  } catch (e) {
    console.error('Failed to create issue:', e.message);
  }
}

async function main() {
  const metaUrl = process.env.META_URL || 'https://nobetci-eczanem.vercel.app/eczaneler-meta.json';
  const thresholdHours = parseFloat(process.env.THRESHOLD_HOURS || '6');
  const token = process.env.GITHUB_TOKEN;
  const repoFull = process.env.GITHUB_REPOSITORY; // owner/repo

  if (!repoFull) {
    console.error('GITHUB_REPOSITORY not set, exiting');
    process.exit(0);
  }
  const [owner, repo] = repoFull.split('/');

  try {
    const res = await axios.get(metaUrl, { timeout: 10000, headers: { 'User-Agent': 'nobetci-eczanem-monitor' } });
    const meta = res.data;
    if (!meta || !meta.generatedAt) {
      const title = 'Eczaneler: metadata missing or malformed';
      const body = `Failed to find a valid \`generatedAt\` in ${metaUrl}. Response status: ${res.status}. Please check the fetch job or upstream source.`;
      if (token) await createIssue(owner, repo, token, title, body);
      else console.warn('No GITHUB_TOKEN; would create issue:', title);
      return;
    }

    const generated = Date.parse(meta.generatedAt);
    if (Number.isNaN(generated)) {
      const title = 'Eczaneler: metadata has invalid generatedAt';
      const body = `The \`generatedAt\` value in ${metaUrl} could not be parsed: ${meta.generatedAt}`;
      if (token) await createIssue(owner, repo, token, title, body);
      else console.warn('No GITHUB_TOKEN; would create issue:', title);
      return;
    }

    const ageMs = Date.now() - generated;
    const ageHours = ageMs / (1000 * 60 * 60);
    console.log(`Meta age: ${ageHours.toFixed(2)} hours (threshold ${thresholdHours}h)`);
    if (ageHours > thresholdHours) {
      const title = `Eczaneler: stale data (${ageHours.toFixed(1)}h old)`;
      const body = `The published eczaneler meta at ${metaUrl} is ${ageHours.toFixed(1)} hours old (threshold ${thresholdHours}h).\n\nMeta contents:\n\n${JSON.stringify(meta, null, 2)}`;
      if (token) await createIssue(owner, repo, token, title, body);
      else console.warn('No GITHUB_TOKEN; would create issue:', title);
      return;
    }

    console.log('Meta is fresh — no action needed.');
  } catch (err) {
    const title = 'Eczaneler: metadata fetch failed';
    const body = `Failed to fetch ${metaUrl}: ${err.message}`;
    if (token) await createIssue(owner, repo, token, title, body);
    else console.warn('No GITHUB_TOKEN; would create issue:', title);
  }
}

main().catch(e => {
  console.error('Unhandled error in monitor script:', e.message);
  process.exit(1);
});
