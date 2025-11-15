import * as git from 'isomorphic-git';
import http from 'isomorphic-git/http/node';
import fs from 'fs-extra';
import path from 'path';
import { Game } from '@/payload-types';

async function cloneRepo(repoUrl: string, dirName: string) {
  const targetDir = path.resolve(process.cwd(), dirName);

  await fs.ensureDir(targetDir);

  await git.clone({
    fs,
    http,
    dir: targetDir,
    url: repoUrl,
    singleBranch: true,
    depth: 1,
    onAuth: () => ({
      username: process.env.GITHUB_TOKEN || '',
      password: '',
    }),
  });
}

interface CreateRepoOptions {
  token: string;
  repoName: string;
  privateRepo?: boolean;
  description?: string;
}

async function createGitHubRepo({
  token,
  repoName,
  privateRepo = false,
  description = '',
}: CreateRepoOptions): Promise<void> {
  const res = await fetch('https://api.github.com/user/repos', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'User-Agent': 'isomorphic-git-app',
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: repoName,
      private: privateRepo,
      description,
      auto_init: false,
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`GitHub repo creation failed: ${res.status} ${res.statusText}\n${errorBody}`);
  }
}

async function push(slug: string) {
  const repoPath = process.cwd() + '/temp';
  const repoUrl = `${process.env.GITHUB_PUSH_URL}/${slug}`;
  await fs.rm(repoPath + '/.git', { recursive: true, force: true });
  await createGitHubRepo({
    token: process.env.GITHUB_TOKEN || '',
    repoName: slug,
    privateRepo: true,
    description: `${slug} game repository`,
  });
  await git.init({ fs, dir: repoPath });
  await git.add({ fs, dir: repoPath, filepath: '.' });
  await git.commit({
    fs,
    dir: repoPath,
    message: 'Initial commit',
    author: {
      name: process.env.GITHUB_PUSH_NAME || '',
      email: process.env.GITHUB_PUSH_EMAIL || '',
    },
  });
  await git.branch({ fs, dir: repoPath, ref: 'main' });
  await git.addRemote({ fs, dir: repoPath, remote: 'origin', url: repoUrl });
  await git.push({
    fs,
    http,
    dir: repoPath,
    url: repoUrl,
    remote: 'origin',
    ref: 'refs/heads/main',
    onAuth: () => ({
      username: process.env.GITHUB_TOKEN || '',
      password: '',
    }),
  });
}

function renderGuide(root: Game['guide']['root']): string {
  const lines: string[] = [];

  function walk(nodes: any[], indent = 0) {
    for (const node of nodes) {
      switch (node.type) {
        case 'heading': {
          const level = parseInt(node.tag.replace('h', ''), 10) || 1;
          const text = node.children.map((c: any) => c.text).join('');
          lines.push(`${'#'.repeat(level)} ${text}`, '');
          break;
        }
        case 'paragraph': {
          const text = node.children
            .map((c: any) => {
              if (c.format === 1) return `**${c.text}**`;
              return c.text;
            })
            .join('');
          lines.push(text, '');
          break;
        }
        case 'list': {
          const bullet = node.listType === 'bullet';
          for (const item of node.children) {
            const itemText = item.children.map((c: any) => c.text).join('');
            const prefix = bullet ? '-' : `${item.value}.`;
            lines.push(`${' '.repeat(indent)}${prefix} ${itemText}`);
          }
          lines.push('');
          break;
        }
        default:
          break;
      }
    }
  }

  walk(root.children);
  return lines.join('\n');
}

async function makeEdgeFunctions(game: Game) {
  const edgeFunctionsPath = process.cwd() + '/temp/functions';
  await fs.ensureDir(edgeFunctionsPath);
  const edgeFunctionTemplatePath = process.cwd() + '/src/functions/edge-function-template.ts';
  const edgeFunctionContent = await fs.readFile(edgeFunctionTemplatePath, 'utf8');
  // Edge functions can be created based on game configuration if needed
  // Currently, no automatic edge function generation is implemented
}

async function editReadme(game: Game) {
  const repoPath = process.cwd() + '/temp';
  const readmePath = repoPath + '/README.md';
  let readmeContent = await fs.readFile(readmePath, 'utf8');
  const guideMd = renderGuide(game.guide.root);
  const replacements: any = {
    '{{name}}': game.name,
    '{{description}}': game.description,
    '{{tags}}': game.tags?.map((t) => `- **${t.tag}**`).join('\n') || '',
    '{{guide}}': guideMd,
    '{{abilities}}':
      game.abilities
        ?.map((a) => {
          if (typeof a === 'number') return `- Ability ID: ${a}`;
          return `- **${a.name}**: ${a.description}`;
        })
        .join('\n') || '',
  };
  readmeContent = readmeContent.replace(
    new RegExp(Object.keys(replacements).join('|'), 'g'),
    (match) => replacements[match] ?? match
  );
  await fs.writeFile(readmePath, readmeContent, 'utf8');
}

export async function editRepoAndPush(game: Game) {
  await cloneRepo(process.env.GITHUB_PULL_URL || '', 'temp');
  await editReadme(game);
  await makeEdgeFunctions(game);
  await push(game.slug);
  await fs.rmdir(process.cwd() + '/temp', { recursive: true });
}
